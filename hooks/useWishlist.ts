import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UseWishlistOptions {
  onSuccess?: () => void;
}

export function useWishlist(options: UseWishlistOptions = {}) {
  const router = useRouter();
  const { session, isGuest } = useAuth();
  const [loading, setLoading] = useState(false);

  const addToWishlist = async (bookId: string) => {
    if (isGuest) {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);

      const { data: existingEntry } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', session?.user?.id)
        .eq('google_books_id', bookId)
        .maybeSingle();

      if (existingEntry) {
        Alert.alert('Info', 'This book is already in your wishlist');
        return;
      }

      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: session?.user?.id,
          google_books_id: bookId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert('Success', 'Book added to wishlist!');
      options.onSuccess?.();
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      Alert.alert('Error', 'Failed to add book to wishlist');
    } finally {
      setLoading(false);
    }
  };

  return {
    addToWishlist,
    loading
  };
}