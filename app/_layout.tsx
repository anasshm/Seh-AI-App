import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/src/services/AuthContext';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/useColorScheme';

// This component handles redirecting users based on authentication state
function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Skip navigation logic while auth is still loading
    if (isLoading) {
      console.log('Auth is still loading, skipping navigation logic');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log('Navigation check:', { 
      user: user ? 'Logged in' : 'Not logged in', 
      inAuthGroup, 
      currentSegment: segments[0] 
    });

    if (!user && !inAuthGroup) {
      // Redirect to login if not logged in and not already in auth group
      console.log('Redirecting to login');
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if logged in and in auth group
      console.log('User is logged in, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}