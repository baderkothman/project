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
  Dimensions,
} from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { ArrowLeft, CreditCard as Edit2, Trash2, BookOpen, Plus, Search } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { colors, radius, spacing, type } from '@/src/presentation/theme/tokens';
import { Button, EmptyState, Input } from '@/src/presentation/components/ui';

const windowWidth = Dimensions.get('window').width;
const GRID_SPACING = 16;
const GRID_COLUMNS = 2;
const ITEM_MARGIN = GRID_SPACING / 2;
const ITEM_WIDTH = (windowWidth - (40 + GRID_SPACING * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: string;
  images: string[];
  created_at: string;
}

export default function LibraryScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      loadBooks();
    }
  }, [session?.user?.id]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dataClient
        .from('books')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setBooks(data || []);
    } catch (err) {
      console.error('Error loading books:', err);
      setError('Failed to load your library. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    try {
      const { error: deleteError } = await dataClient
        .from('books')
        .delete()
        .eq('id', bookId);

      if (deleteError) throw deleteError;

      setBooks(books.filter(book => book.id !== bookId));
    } catch (err) {
      console.error('Error deleting book:', err);
      setError('Failed to delete book. Please try again.');
    }
  };

  const handleEdit = (bookId: string) => {
    router.push(`/edit-book/${bookId}`);
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderBook = ({ item }: { item: Book }) => (
    <View style={styles.bookCard}>
      <TouchableOpacity
        style={styles.bookImageContainer}
        onPress={() => router.push(`/book/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
      >
        <Image
          source={{ uri: item.images[0] }}
          style={styles.bookImage}
          resizeMode="cover"
        />
        <View style={styles.bookOverlay}>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.bookAuthor} numberOfLines={1}>by {item.author}</Text>
            <Text style={styles.bookPrice}>${item.price.toFixed(2)}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.bookActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.title}`}
        >
          <Edit2 size={16} color={colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.title}`}
        >
          <Trash2 size={16} color={colors.onDark} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your library...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </Link>
        <Text style={styles.title}>My Library</Text>
        <Link href="/add" asChild>
          <TouchableOpacity style={styles.addButton} accessibilityRole="button" accessibilityLabel="Add a book">
            <Plus size={24} color={colors.onPrimary} />
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.searchContainer}>
        <Input
          icon={<Search size={20} color={colors.textMuted} />}
          placeholder="Search your books..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filteredBooks}
        renderItem={renderBook}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.booksList}
        columnWrapperStyle={styles.booksRow}
        ListEmptyComponent={
          <EmptyState
            icon={<BookOpen size={48} color={colors.primary} />}
            title="No books listed yet"
            action={
              <Link href="/add" asChild>
                <Button label="List a Book" onPress={() => {}} accessibilityLabel="List a book" style={styles.listButton} />
              </Link>
            }
          />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...type.heading,
    color: colors.text,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  booksList: {
    padding: spacing.md,
  },
  booksRow: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: ITEM_WIDTH,
    marginBottom: GRID_SPACING,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bookImageContainer: {
    position: 'relative',
  },
  bookImage: {
    width: '100%',
    height: ITEM_WIDTH * 1.5,
    backgroundColor: colors.badgeBackground,
  },
  bookOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    padding: spacing.sm,
  },
  bookInfo: {
    gap: spacing.xxs,
  },
  bookTitle: {
    ...type.label,
    color: colors.text,
  },
  bookAuthor: {
    ...type.caption,
    color: colors.textMuted,
  },
  bookPrice: {
    ...type.bodyStrong,
    color: colors.foil,
    marginTop: spacing.xxs,
  },
  bookActions: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  actionButton: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.sm,
    ...type.body,
    color: colors.text,
  },
  errorContainer: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
  },
  errorText: {
    ...type.caption,
    color: colors.onDark,
    textAlign: 'center',
  },
  listButton: {
    marginTop: spacing.xs,
  },
});
