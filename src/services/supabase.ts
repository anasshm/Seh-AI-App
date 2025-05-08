import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase URL and anon key
const supabaseUrl = 'your_supabase_url_here';
const supabaseAnonKey = 'your_supabase_anon_key_here';

// Initialize the Supabase client with v2 API
export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

// Helper functions for authentication
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data?.user || null, session: data?.session || null, error };
};

export const signUpWithEmail = async (email: string, password: string, metadata?: object) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
  return { user: data?.user || null, session: data?.session || null, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

export const getCurrentSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
};