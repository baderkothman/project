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
  TextInput,
} from 'react-native';
import { Stack, Link, useRouter } from 'expo-router';
import { ArrowLeft, CreditCard as Edit2, Trash2, BookOpen, Plus, Search } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';

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
        >
          <Edit2 size={16} color="#FBF3F2" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Trash2 size={16} color="#FBF3F2" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
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
          <TouchableOpacity style={styles.backButton}>
            <ArrowLeft size={24} color="#FBF3F2" />
          </TouchableOpacity>
        </Link>
        <Text style={styles.title}>My Library</Text>
        <Link href="/add" asChild>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={24} color="#FBF3F2" />
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#1C768F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your books..."
            placeholderTextColor="#1C768F"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
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
          <View style={styles.emptyContainer}>
            <BookOpen size={48} color="#FA991C" />
            <Text style={styles.emptyText}>No books listed yet</Text>
            <Link href="/add" asChild>
              <TouchableOpacity style={styles.listButton}>
                <Text style={styles.listButtonText}>List a Book</Text>
              </TouchableOpacity>
            </Link>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#032539',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    backgroundColor: '#032539',
    borderBottomWidth: 1,
    borderBottomColor: '#1C768F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C768F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FA991C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBF3F2',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#032539',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#032539',
  },
  booksList: {
    padding: 16,
  },
  booksRow: {
    justifyContent: 'space-between',
  },
  bookCard: {
    width: ITEM_WIDTH,
    marginBottom: GRID_SPACING,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookImageContainer: {
    position: 'relative',
  },
  bookImage: {
    width: '100%',
    height: ITEM_WIDTH * 1.5,
    backgroundColor: '#0D1B2A',
  },
  bookOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(3, 37, 57, 0.8)',
    padding: 12,
  },
  bookInfo: {
    gap: 4,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBF3F2',
  },
  bookAuthor: {
    fontSize: 12,
    color: '#FBF3F2',
    opacity: 0.8,
  },
  bookPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FA991C',
    marginTop: 4,
  },
  bookActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FA991C',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FBF3F2',
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FA991C',
    borderRadius: 8,
  },
  errorText: {
    color: '#032539',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#FBF3F2',
    marginTop: 16,
    marginBottom: 24,
  },
  listButton: {
    backgroundColor: '#FA991C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  listButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
});