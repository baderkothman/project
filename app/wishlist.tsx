import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, Link, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Heart, Trash2, WifiOff } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { getGoogleBook } from '@/src/application/services/google-books';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import { useCallback } from 'react';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: string;
  images: string[];
}

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
    };
    averageRating?: number;
  };
}

interface WishlistItem {
  id: string;
  book_id?: string;
  google_books_id?: string;
  created_at: string;
}

export default function WishlistScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [books, setBooks] = useState<(Book | GoogleBook)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isNetwork?: boolean } | null>(null);

  const fetchWishlistBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: wishlistData, error: wishlistError } = await dataClient
        .from<WishlistItem>('wishlist')
        .select('id, book_id, google_books_id, created_at')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (wishlistError) throw wishlistError;
      const wishlistItems = (wishlistData || []) as WishlistItem[];

      if (wishlistItems.length === 0) {
        setBooks([]);
        return;
      }

      // Separate local books and Google Books IDs
      const localBookIds = wishlistItems
        .filter((item) => item.book_id !== null)
        .map((item) => item.book_id as string);

      const googleBookIds = wishlistItems
        .filter((item) => item.google_books_id !== null)
        .map((item) => item.google_books_id as string);

      // Fetch local books
      let localBooks: Book[] = [];
      if (localBookIds.length > 0) {
        const { data: booksData, error: booksError } = await dataClient
          .from<Book>('books')
          .select('*')
          .in('id', localBookIds);

        if (booksError) throw booksError;
        localBooks = booksData || [];
      }

      // Fetch Google Books
      let googleBooks: GoogleBook[] = [];
      if (googleBookIds.length > 0) {
        googleBooks = await Promise.all(googleBookIds.map(getGoogleBook));
      }

      // Combine and sort by created_at
      const allBooks = [...localBooks, ...googleBooks].sort((a, b) => {
        const aDate = wishlistItems.find((item) =>
          item.book_id === (a as Book).id || 
          item.google_books_id === (a as GoogleBook).id
        )?.created_at || '';
        const bDate = wishlistItems.find((item) =>
          item.book_id === (b as Book).id || 
          item.google_books_id === (b as GoogleBook).id
        )?.created_at || '';
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      setBooks(allBooks);
    } catch (err) {
      console.error('Error loading wishlist:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError({
          message: 'Unable to connect to the server. Please check your internet connection.',
          isNetwork: true
        });
      } else {
        setError({
          message: 'Failed to load your wishlist. Please try again.',
          isNetwork: false
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchWishlistBooks();
      }
    }, [session?.user?.id])
  );

  const removeFromWishlist = async (bookId: string, isGoogleBook: boolean) => {
    try {
      const { error: deleteError } = await dataClient
        .from('wishlist')
        .delete()
        .eq('user_id', session?.user?.id)
        .eq(isGoogleBook ? 'google_books_id' : 'book_id', bookId);

      if (deleteError) throw deleteError;

      setBooks(books.filter(book => 
        isGoogleBook ? 
          (book as GoogleBook).id !== bookId : 
          (book as Book).id !== bookId
      ));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError({
        message: 'Failed to remove book from wishlist. Please try again.',
        isNetwork: false
      });
    }
  };

  const renderBook = ({ item }: { item: Book | GoogleBook }) => {
    const isGoogleBook = 'volumeInfo' in item;
    const title = isGoogleBook ? item.volumeInfo.title : item.title;
    const author = isGoogleBook ? 
      (item.volumeInfo.authors?.[0] || 'Unknown Author') : 
      item.author;
    const imageUrl = isGoogleBook ?
      item.volumeInfo.imageLinks?.thumbnail :
      item.images[0];

    return (
      <View style={styles.bookCard}>
        <TouchableOpacity
          style={styles.bookContentArea}
          onPress={() => router.push(isGoogleBook ? `/google-book/${item.id}` : `/book/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${title}`}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.bookImage}
            resizeMode="cover"
          />
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>{author}</Text>
            {!isGoogleBook && (
              <Text style={styles.bookPrice}>${item.price.toFixed(2)}</Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromWishlist(item.id, isGoogleBook)}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title} from wishlist`}
        >
          <Trash2 size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading wishlist...</Text>
      </View>
    );
  }

 return (
  <View style={styles.container}>
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
        <ArrowLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.pageTitle}>My Wishlist</Text>
      <View style={styles.placeholder} />
    </View>

      {error && (
        <View style={[styles.errorContainer, error.isNetwork && styles.networkErrorContainer]}>
          {error.isNetwork && <WifiOff size={24} color={colors.background} style={styles.errorIcon} />}
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchWishlistBooks} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={books}
        renderItem={renderBook}
        keyExtractor={(item) => ('volumeInfo' in item ? `google-${item.id}` : `local-${item.id}`)}
        contentContainerStyle={styles.booksList}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyContainer}>
              <Heart size={48} color={colors.primary} />
              <Text style={styles.emptyText}>Your wishlist is empty</Text>
              <Text style={styles.emptySubtext}>
                Add books you love to your wishlist
              </Text>
              <Link href="/(tabs)/browse" asChild>
                <TouchableOpacity style={styles.browseButton} accessibilityRole="button" accessibilityLabel="Browse books">
                  <Text style={styles.browseButtonText}>Browse Books</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: fontSizes[20],
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  booksList: {
    padding: 16,
  },
  bookCard: {
    position: 'relative',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bookContentArea: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
  },
  bookImage: {
    width: 100,
    height: 150,
  },
  bookInfo: {
    flex: 1,
    padding: 16,
  },
  bookTitle: {
    fontSize: fontSizes[18],
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: fontSizes[14],
    color: colors.text,
    opacity: 0.8,
    marginBottom: 8,
  },
  bookPrice: {
    fontSize: fontSizes[20],
    fontWeight: 'bold',
    color: colors.primary,
  },
  removeButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes[16],
    color: colors.text,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  networkErrorContainer: {
    backgroundColor: colors.warningBackground,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorText: {
    color: colors.background,
    fontSize: fontSizes[14],
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: fontSizes[14],
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: fontSizes[20],
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: fontSizes[16],
    color: colors.text,
    opacity: 0.8,
    marginBottom: 24,
    textAlign: 'center',
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  browseButtonText: {
    color: colors.text,
    fontSize: fontSizes[16],
    fontWeight: '600',
  },
});
