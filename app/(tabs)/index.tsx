import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  Search,
  TrendingUp,
  Library,
  Star,
  Heart,
  Download,
} from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';

import { useWishlist } from '@/hooks/useWishlist';
import { supabase } from '@/lib/supabase';

// ==========================
// ✅ Type Declarations
// ==========================
type GoogleBook = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
    };
    averageRating?: number;
  };
};

type UserBook = {
  id: string;
  images: string[];
  title: string;
  author: string;
  price: number;
  condition: string;
};

// ==========================
// ✅ Helper: Retry Fetch
// ==========================
const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
};

// ==========================
// ✅ HomeScreen Component
// ==========================
export default function HomeScreen() {
  const router = useRouter();
  const { addToWishlist } = useWishlist();

  const [searchQuery, setSearchQuery] = useState('');
  const [dailyBook, setDailyBook] = useState<GoogleBook | null>(null);
  const [pdfBooks, setPdfBooks] = useState<GoogleBook[]>([]);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_URL;
  const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/users?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const fetchBooks = async () => {
    if (!API_URL || !API_KEY) {
      setError('Missing API configuration');
      return;
    }

    try {
      const dailyRes = await fetchWithRetry(`${API_URL}?q=The+Alchemist+Paulo+Coelho&key=${API_KEY}`);
      setDailyBook(dailyRes.items?.[0] || null);

      const pdfRes = await fetchWithRetry(`${API_URL}?q=pdf&filter=free-ebooks&key=${API_KEY}&maxResults=10`);
      setPdfBooks(pdfRes.items || []);
    } catch (err: any) {
      setError(`Failed to fetch books: ${err.message}`);
    }
  };

  const fetchUserBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      setUserBooks(data || []);
    } catch (err) {
      console.error('Error fetching user books:', err);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    await Promise.all([fetchBooks(), fetchUserBooks()]);

    setRefreshing(false);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderUserBook = ({ item }: { item: UserBook }) => (
    <TouchableOpacity
      style={styles.userBookCard}
      onPress={() => router.push(`/book/${item.id}`)}
    >
      <Image source={{ uri: item.images[0] }} style={styles.userBookImage} />
      <View style={styles.userBookInfo}>
        <Text style={styles.userBookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.userBookAuthor}>by {item.author}</Text>
        <Text style={styles.userBookPrice}>${item.price.toFixed(2)}</Text>
        <View style={styles.userBookCondition}>
          <Text style={styles.conditionText}>{item.condition}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
        <Text style={styles.loadingText}>Loading books...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          tintColor="#FA991C"
          colors={['#FA991C']}
        />
      }
    >
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#1C768F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#1C768F"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Books */}
      {userBooks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Library size={24} color="#FA991C" />
            <Text style={styles.sectionTitle}>Discover Books</Text>
            <Link href="/all-books" asChild>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </Link>
          </View>
          <FlatList
            data={userBooks}
            renderItem={renderUserBook}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.userBooksList}
          />
        </View>
      )}

      {/* Daily Book */}
      {dailyBook && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={24} color="#FA991C" />
            <Text style={styles.sectionTitle}>Daily Book</Text>
          </View>
          <TouchableOpacity
            style={styles.dailyBookCard}
            onPress={() => router.push(`/google-book/${dailyBook.id}`)}
          >
            <Image
              source={{
                uri: dailyBook.volumeInfo.imageLinks?.thumbnail ||
                  'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'
              }}
              style={styles.dailyBookImage}
            />
            <View style={styles.dailyBookInfo}>
              <Text style={styles.dailyBookTitle}>{dailyBook.volumeInfo.title}</Text>
              {dailyBook.volumeInfo.authors && (
                <Text style={styles.dailyBookAuthor}>by {dailyBook.volumeInfo.authors[0]}</Text>
              )}
              <Text style={styles.dailyBookDescription} numberOfLines={3}>
                {dailyBook.volumeInfo.description}
              </Text>
              <View style={styles.dailyBookMeta}>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#FA991C" fill="#FA991C" />
                  <Text style={styles.ratingText}>
                    {dailyBook.volumeInfo.averageRating?.toFixed(1) || '4.8'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.wishlistButton}
                  onPress={() => addToWishlist(dailyBook.id)}
                >
                  <Heart size={16} color="#FA991C" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* PDF Books */}
      {pdfBooks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Download size={24} color="#FA991C" />
            <Text style={styles.sectionTitle}>PDF Books</Text>
          </View>
          <FlatList
            data={pdfBooks}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userBookCard}
                onPress={() => router.push(`/google-book/${item.id}`)}
              >
                <Image
                  source={{
                    uri: item.volumeInfo.imageLinks?.thumbnail ||
                      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'
                  }}
                  style={styles.userBookImage}
                />
                <View style={styles.userBookInfo}>
                  <Text style={styles.userBookTitle} numberOfLines={2}>
                    {item.volumeInfo.title}
                  </Text>
                  {item.volumeInfo.authors && (
                    <Text style={styles.userBookAuthor}>
                      by {item.volumeInfo.authors[0]}
                    </Text>
                  )}
                  <View style={styles.dailyBookMeta}>
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#FA991C" fill="#FA991C" />
                      <Text style={styles.ratingText}>
                        {item.volumeInfo.averageRating?.toFixed(1) || '4.5'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.wishlistButton}
                      onPress={() => addToWishlist(item.id)}
                    >
                      <Heart size={16} color="#FA991C" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.userBooksList}
          />
        </View>
      )}
    </ScrollView>
  );
}

// ==========================
// ✅ Styles
// ==========================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#032539' },
  searchContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#032539',
    borderBottomWidth: 1,
    borderBottomColor: '#1C768F',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F2',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#032539' },
  section: { padding: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#FBF3F2', marginLeft: 8, flex: 1 },
  viewAllText: { color: '#FA991C', fontSize: 14, fontWeight: '600' },
  userBooksList: { paddingRight: 20 },
  userBookCard: {
    width: 180,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  userBookImage: { width: '100%', height: 240, backgroundColor: '#032539' },
  userBookInfo: { padding: 12 },
  userBookTitle: { fontSize: 16, fontWeight: '600', color: '#FBF3F2', marginBottom: 4 },
  userBookAuthor: { fontSize: 14, color: '#FBF3F2', opacity: 0.8, marginBottom: 8 },
  userBookPrice: { fontSize: 18, fontWeight: 'bold', color: '#FA991C', marginBottom: 8 },
  userBookCondition: {
    backgroundColor: '#032539',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  conditionText: { fontSize: 12, color: '#FBF3F2', fontWeight: '500' },
  dailyBookCard: { flexDirection: 'row', backgroundColor: '#1C768F', borderRadius: 12, overflow: 'hidden' },
  dailyBookImage: { width: 120, height: 180 },
  dailyBookInfo: { flex: 1, padding: 16 },
  dailyBookTitle: { fontSize: 18, fontWeight: 'bold', color: '#FBF3F2', marginBottom: 4 },
  dailyBookAuthor: { fontSize: 14, color: '#FBF3F2', opacity: 0.8, marginBottom: 8 },
  dailyBookDescription: { fontSize: 14, lineHeight: 20, color: '#FBF3F2', opacity: 0.7, marginBottom: 12 },
  dailyBookMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 4, fontSize: 14, color: '#FBF3F2', fontWeight: '500' },
  wishlistButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#032539',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#032539' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#FBF3F2' },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#1C768F',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: { color: '#FBF3F2', textAlign: 'center', marginBottom: 12 },
  retryButton: {
    backgroundColor: '#FA991C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: '#FBF3F2', fontWeight: '600' },
});
