import { FoodAnalysisCard } from '@/components/food/FoodAnalysisCard';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { analyzeFoodImage, FoodAnalysisResult } from '@/services/aiVisionService';
import { supabase } from '@/services/db';
import { uploadThumbnail } from '@/services/mealService';
import { syncSupabaseAuth, useAuth } from '@/src/services/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ResultsScreen() {
  const { imageUri } = useLocalSearchParams<{ imageUri: string }>();
  const [result, setResult] = useState<FoodAnalysisResult | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  useEffect(() => {
    if (!imageUri) {
      setError('No image provided');
      setIsLoading(false);
      return;
    }

    // Analyze the food image
    analyzeFood();
  }, [imageUri]);

  const analyzeFood = async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      // Provide haptic feedback to indicate analysis has started
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Call the AI Vision service
      const analysisResult = await analyzeFoodImage(imageUri as string);
      
      // Update state with the result
      setResult(analysisResult);
      
      // Provide success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error analyzing food:', err);
      setError('Failed to analyze the food image. Please try again.');
      
      // Provide error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        'Analysis Error',
        'There was a problem analyzing your food image. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    analyzeFood();
  };

  const handleBack = () => {
    router.back();
  };

  const handleSaveMeal = async () => {
    console.log('Starting meal save process');
    if (!result || !imageUri || !user) {
      console.log('Missing data:', { hasResult: !!result, hasImageUri: !!imageUri, hasUser: !!user });
      Alert.alert('Error', 'Missing data required to save meal');
      return;
    }

    try {
      setIsSaving(true);
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Ensure auth is synchronized
      await syncSupabaseAuth();
      
      let thumbnailUrl = '';
      
      try {
        // Upload thumbnail directly from URI
        const fileUri = imageUri as string;
        thumbnailUrl = await uploadThumbnail(fileUri);
        console.log('Thumbnail uploaded successfully:', thumbnailUrl);
      } catch (uploadError: any) {
        console.error('Error uploading thumbnail:', uploadError);
        // Continue with saving the meal even if thumbnail upload fails
        // Just use a placeholder URL
        thumbnailUrl = 'https://via.placeholder.com/300x200?text=Upload+Failed';
      }
      
      // Try direct SQL insertion to bypass schema cache issues
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        // Insert using raw SQL to avoid schema cache issues
        console.log('Attempting RPC call with params:', {
          p_name: result.name,
          p_thumbnail_url: thumbnailUrl,
          p_calories: result.calories || 0,
          p_protein: result.protein || 0,
          p_carbs: result.carbs || 0,
          p_fat: result.fat || 0
        });
        
        const { data, error } = await supabase.rpc('insert_meal', {
          p_name: result.name,
          p_thumbnail_url: thumbnailUrl,
          p_calories: Math.round(Number(result.calories)) || 0,
          p_protein: Math.round(Number(result.protein)) || 0,
          p_carbs: Math.round(Number(result.carbs)) || 0,
          p_fat: Math.round(Number(result.fat)) || 0
        });
        
        if (error) throw error;
        
        console.log('Meal saved successfully via RPC:', data);
      } catch (sqlError: any) {
        console.error('Error with RPC insert:', sqlError);
        
        // Fallback to regular insert with all required fields
        console.log('Attempting fallback insert with correct column names');
        const { data, error } = await supabase
          .from('meals')
          .insert({
            name: result.name,
            user_id: user.id,
            calories: Math.round(Number(result.calories)) || 0,
            protein: Math.round(Number(result.protein)) || 0,
            carbs: Math.round(Number(result.carbs)) || 0,
            fat: Math.round(Number(result.fat)) || 0,
            image_url: thumbnailUrl,
            meal_time: new Date().toISOString()
          })
          .select();
        
        if (error) throw error;
        console.log('Meal saved with fallback method:', data);
      }
      
      // Set saving state to false
      setIsSaving(false);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Meal saved successfully');
      
      // Navigate to dashboard
      console.log('Navigating back to dashboard');
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Error saving meal:', err);
      
      // Error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', `Failed to save meal: ${err?.message || 'Unknown error'}`);
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Navigate to dashboard without saving
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Food Analysis</ThemedText>
        {error ? (
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Ionicons name="refresh" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderButton} />
        )}
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {imageUri ? (
          <>
            <FoodAnalysisCard
              result={result}
              isLoading={isLoading}
            />
            
            {/* Action buttons */}
            {!isLoading && result && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel Meal</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveMeal}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ThemedText style={styles.saveButtonText}>Saving...</ThemedText>
                  ) : (
                    <ThemedText style={styles.saveButtonText}>Save Meal</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="image-outline" size={64} color={colors.text} />
            <ThemedText style={styles.errorText}>No image available</ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  retryButton: {
    padding: 8,
  },
  placeholderButton: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 24,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  saveButton: {
    backgroundColor: '#4CD964',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});