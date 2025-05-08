import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { CameraOverlay } from '@/src/components/camera/CameraOverlay';
import { CameraControls } from '@/src/components/camera/CameraControls';
import { ImagePreview } from '@/src/components/camera/ImagePreview';
import { processImageForAI, saveImageToGallery, getRecentPhotos } from '@/src/utils/imageProcessor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function CameraScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const cameraRef = useRef<CameraView | null>(null);
  const isFocused = useIsFocused(); // Check if this screen is currently focused
  
  // Permission states
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState<boolean | null>(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);
  
  // Camera states
  const [flashMode, setFlashMode] = useState<'on' | 'off' | 'auto'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Image states
  const [capturedImage, setCapturedImage] = useState<{
    uri: string;
    width: number;
    height: number;
    exif?: any;
    base64?: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // UI states
  const [showGuide, setShowGuide] = useState(true);
  
  // Use the camera permissions hook
  const [permission, requestPermission] = useCameraPermissions();
  
  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      // Request camera permissions
      if (permission) {
        setHasCameraPermission(permission.granted);
      } else {
        const result = await requestPermission();
        setHasCameraPermission(result.granted);
      }
      
      // Request media library permissions
      const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaLibraryPermission.status === 'granted');
      
      // Request image picker permissions
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(galleryStatus.status === 'granted');
    })();
  }, []);
  
  // Toggle camera guide visibility
  const toggleGuide = () => {
    setShowGuide(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Handle opening the gallery
  const handleGalleryOpen = async () => {
    try {
      // Check if we have permission
      if (!hasGalleryPermission) {
        const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!galleryStatus.granted) {
          Alert.alert('Permission required', 'We need access to your photo gallery to select images.');
          return;
        }
        setHasGalleryPermission(galleryStatus.status === 'granted');
      }
      
      // Launch image picker without forcing cropping
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing/cropping to use full photos
        quality: 0.9,
        allowsMultipleSelection: false,
        exif: true, // Include EXIF data if available
      });
      
      // Handle result
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Set the selected image as the captured image
        setCapturedImage({
          uri: selectedImage.uri,
          width: selectedImage.width || 800,
          height: selectedImage.height || 600,
          exif: selectedImage.exif,
          base64: selectedImage.base64 || undefined
        });
        
        // Provide haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Provide haptic feedback for image selection
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error opening gallery:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  
  const handleFlashToggle = () => {
    setFlashMode((current: 'on' | 'off' | 'auto') => {
      switch (current) {
        case 'off': return 'on';
        case 'on': return 'auto';
        case 'auto': return 'off';
        default: return 'off';
      }
    });
  };
  

  
  // Camera action handlers
  
  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Use lower quality and disable base64 encoding for faster capture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
        exif: false,
        skipProcessing: true
      });
      
      setCapturedImage(photo);
      setIsCapturing(false);
      
      // Provide haptic feedback for photo capture
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error taking picture:', error);
      setIsCapturing(false);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };
  
  // Image preview handlers
  const handleRetake = () => {
    try {
      // First set analyzing to false in case it was in progress
      setIsAnalyzing(false);
      
      // Add a small delay before resetting the camera to ensure resources are properly managed
      setTimeout(() => {
        setCapturedImage(null);
      }, 300);
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error retaking picture:', error);
      Alert.alert('Error', 'Failed to reset camera. Please try again.');
    }
  };
  
  const handleSaveImage = async () => {
    if (!capturedImage) return;
    
    try {
      const asset = await saveImageToGallery(capturedImage.uri);
      if (asset) {
        Alert.alert("Success", "Image saved to gallery.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("Error", "Failed to save image to gallery.");
      }
    } catch (error) {
      console.error("Error saving image:", error);
      Alert.alert("Error", "Failed to save image to gallery.");
    }
  };
  
  const handleAnalyzeImage = async () => {
    if (!capturedImage) return;
    
    try {
      setIsAnalyzing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Process the image for AI analysis
      const processedImageUri = await processImageForAI(capturedImage.uri);
      
      // Navigate to results screen with the processed image URI
      router.push({
        pathname: "/results",
        params: { imageUri: processedImageUri }
      });
    } catch (error) {
      console.error("Error analyzing image:", error);
      setIsAnalyzing(false);
      Alert.alert("Error", "Failed to analyze image. Please try again.");
    }
  };
  

  
  // Render loading state while permissions are being checked
  if (hasCameraPermission === null) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <ThemedText style={styles.permissionText}>Requesting camera permissions...</ThemedText>
      </ThemedView>
    );
  }
  
  // Render permission request if camera permission is not granted
  if (hasCameraPermission === false) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.permissionText}>
          We need camera permission to take photos of your food.
        </ThemedText>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <ThemedText style={styles.permissionButtonText}>Grant Permission</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Render image preview if an image has been captured
  if (capturedImage) {
    return (
      <ImagePreview
        imageUri={capturedImage.uri}
        onRetake={handleRetake}
        onSave={handleSaveImage}
        onAnalyze={handleAnalyzeImage}
        isAnalyzing={isAnalyzing}
      />
    );
  }
  
  // Render camera view
  return (
    <ThemedView style={styles.container}>
      {/* Only render camera when tab is focused */}
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          videoStabilizationMode="off"
          zoom={0}
          flash={flashMode}
        />
      ) : (
        <View style={styles.camera} />
      )}
      
      {/* UI elements as siblings, not children of CameraView */}
      {isFocused && (
        <View style={StyleSheet.absoluteFill}>
          {/* Camera overlay with guides */}
          <CameraOverlay showGuide={showGuide} />
          
          {/* Camera controls */}
          <CameraControls
            onCapture={takePicture}
            onFlashToggle={handleFlashToggle}
            onGalleryOpen={handleGalleryOpen}
            flashMode={flashMode}
            isCapturing={isCapturing}
          />
          
          {/* Grid toggle button removed */}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  guideToggleButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 20,
    // Add subtle elevation for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});