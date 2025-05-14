import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Ensure AsyncStorage is available before initializing Supabase
const storageAdapter = Platform.OS === 'web' 
  ? {
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.error('Error getting item from localStorage:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error setting item in localStorage:', error);
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing item from localStorage:', error);
        }
      }
    }
  : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: storageAdapter,
    flowType: 'pkce',
    debug: __DEV__,
  },
  global: {
    headers: {
      'X-Client-Info': 'bolt-expo'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { data: any; timestamp: number }>();

// Wrapper for Supabase queries with caching
export async function cachedQuery(
  key: string,
  queryFn: () => Promise<any>,
  duration = CACHE_DURATION
) {
  const cached = cache.get(key);
  const now = Date.now();

  if (cached && now - cached.timestamp < duration) {
    return cached.data;
  }

  try {
    const data = await queryFn();
    cache.set(key, { data, timestamp: now });
    return data;
  } catch (error) {
    console.error('Cached query error:', error);
    throw error;
  }
}

// Helper function to check authentication status
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return !!session;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// Helper function to clear auth data
export async function clearAuthData() {
  if (Platform.OS === 'web') {
    try {
      // Clear all Supabase-related items from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
}