import Constants from "expo-constants";
import * as FileSystem from 'expo-file-system';

// Access the API key from environment variables via Constants
const OPENAI_KEY = Constants.expoConfig?.extra?.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface FoodAnalysisResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
}

export async function analyzeFoodImage(imageUri: string): Promise<FoodAnalysisResult> {
  try {
    // Convert image to base64 if it's a local URI
    let base64Image = imageUri;
    if (imageUri.startsWith('file://')) {
      base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    
    // Make sure we have a proper base64 string for the API
    if (!base64Image.startsWith('data:image')) {
      base64Image = `data:image/jpeg;base64,${base64Image}`;
    }
    
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // Using the latest model with vision capabilities
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a helpful nutritionist that analyzes food images. Identify the food and provide nutrition information. ALWAYS respond in JSON format with the following structure EXACTLY: {\"name\": \"Food name\", \"calories\": number, \"protein\": number, \"carbs\": number, \"fat\": number, \"description\": \"Brief description with additional nutrition info\"}. Use 0 for any nutritional value you cannot determine."
          },
          {
            role: "user",
            content: [
              { type: "text", text: "What food is in this image? Return a JSON object with the food name, calories, protein (g), carbs (g), fat (g), and a brief description." },
              { type: "image_url", image_url: { url: base64Image } }
            ]
          }
        ],
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI error ${res.status}: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await res.json();
    const contentString = data.choices?.[0]?.message?.content ?? "{}";
    
    try {
      // Parse the JSON response
      const parsedContent = JSON.parse(contentString);
      
      // Ensure all required fields exist with correct types
      return {
        name: parsedContent.name || "Unknown Food",
        calories: Number(parsedContent.calories) || 0,
        protein: Number(parsedContent.protein) || 0,
        carbs: Number(parsedContent.carbs) || 0,
        fat: Number(parsedContent.fat) || 0,
        description: parsedContent.description || "No description available"
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError, contentString);
      return {
        name: "Unknown Food",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        description: contentString.substring(0, 500) // Use raw text as fallback
      };
    }
  } catch (error) {
    console.error('Error in analyzeFoodImage:', error);
    throw error;
  }
}