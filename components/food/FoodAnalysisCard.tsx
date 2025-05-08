import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { FoodAnalysisResult } from "@/services/aiVisionService";
import { ThemedText } from "@/components/ThemedText";

interface Props { 
  result?: FoodAnalysisResult | null;
  isLoading?: boolean;
}

export function FoodAnalysisCard({ result, isLoading = false }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Food Analysis</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#4A90E2" />
      ) : result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.foodName}>{result.name}</Text>
          
          <View style={styles.macrosContainer}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.calories}</Text>
              <Text style={styles.macroLabel}>calories</Text>
            </View>
            
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.protein}g</Text>
              <Text style={styles.macroLabel}>protein</Text>
            </View>
            
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.carbs}g</Text>
              <Text style={styles.macroLabel}>carbs</Text>
            </View>
            
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{result.fat}g</Text>
              <Text style={styles.macroLabel}>fat</Text>
            </View>
          </View>
          
          <Text style={styles.description}>{result.description}</Text>
        </View>
      ) : (
        <Text style={styles.error}>No analysis available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: "#fff", 
    width: "95%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8
  },
  title: { 
    fontSize: 20, 
    fontWeight: "700", 
    marginBottom: 16,
    textAlign: "center"
  },
  resultContainer: {
    width: "100%"
  },
  foodName: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center"
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 8
  },
  macroItem: {
    alignItems: "center",
    flex: 1
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A90E2"
  },
  macroLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4
  },
  description: { 
    fontSize: 16, 
    lineHeight: 22,
    color: "#333",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee"
  },
  error: { 
    fontSize: 16, 
    color: "#FF6B6B", 
    marginTop: 8,
    textAlign: "center"
  }
});