module.exports = {
  expo: {
    name: "foodnsap",
    slug: "foodnsap",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],
    extra: {
      // Using the API key from .env file
      openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      supabaseUrl: "your_supabase_url_here",
      supabaseAnon: "your_supabase_anon_key_here",
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};