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
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: string;
  images: string[];
  created_at: string;
}

export default function AllBooksScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dataClient
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBooks(data || []);
    } catch (err) {
      console.error('Error loading books:', err);
      setError('Failed to load books. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBook = ({ item }: { item: Book }) => (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={() => router.push(`/book/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <Image
        source={{ uri: item.images[0] }}
        style={styles.bookImage}
        resizeMode="cover"
      />
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          by {item.author}
        </Text>
        <Text style={styles.bookPrice}>${item.price.toFixed(2)}</Text>
        <View style={styles.bookCondition}>
          <Text style={styles.conditionText}>{item.condition}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>All Books</Text>
        <View style={styles.placeholder} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.booksList}
          numColumns={2}
          columnWrapperStyle={styles.booksRow}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={colors.primary} />
              <Text style={styles.emptyText}>No books listed yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  title: {
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
  booksRow: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: colors.badgeBackground,
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: fontSizes[14],
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: fontSizes[12],
    color: colors.text,
    opacity: 0.8,
    marginBottom: 8,
  },
  bookPrice: {
    fontSize: fontSizes[16],
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  bookCondition: {
    backgroundColor: colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  conditionText: {
    fontSize: fontSizes[12],
    color: colors.text,
    fontWeight: '500',
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
    margin: 16,
    padding: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  errorText: {
    color: colors.background,
    fontSize: fontSizes[14],
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes[16],
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
});