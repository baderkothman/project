import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  Linking,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  Search,
  BookOpen,
  Star,
  Download,
  ShoppingBag,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  X,
  ExternalLink,
  History,
  ChevronRight,
  Heart,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';

const API_URL = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

interface Book {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail: string;
    };
    previewLink?: string;
    publishedDate?: string;
    language?: string;
    categories?: string[];
    accessInfo?: {
      pdf?: { isAvailable: boolean };
      epub?: { isAvailable: boolean };
    };
    averageRating?: number;
  };
  saleInfo?: {
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
  };
}

const GENRES = [
  'Fiction',
  'Non-fiction',
  'Science Fiction',
  'Mystery',
  'Romance',
  'Biography',
  'History',
  'Business',
  'Children',
  'Technology',
  'Poetry',
  'Self-Help',
  'Religion',
  'Art',
  'Cooking',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
];



const SORT_OPTIONS = [
  { id: 'relevance', name: 'Relevance' },
  { id: 'newest', name: 'Newest to Oldest' },
  { id: 'oldest', name: 'Oldest to Newest' },
  { id: 'title_asc', name: 'Title (A-Z)' },
  { id: 'title_desc', name: 'Title (Z-A)' },
  { id: 'price_asc', name: 'Price: Low to High' },
  { id: 'price_desc', name: 'Price: High to Low' },
];

const PREVIEW_OPTIONS = [
  { id: 'in_app', name: 'In-App Preview' },
  { id: 'external', name: 'External Browser' },
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('JSON Parse Error. Raw response:', text);
      throw new Error(`Failed to parse JSON response: ${(parseError as Error).message}`);
    }
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying fetch... ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

export default function BrowseScreen() {
  const router = useRouter();
  const { session, isGuest } = useAuth();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedPreviewType, setSelectedPreviewType] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('relevance');

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        loadSearchHistory();
      } else {
        setLoadingHistory(false);
      }

      if (!query.trim()) {
        setShowSearchResults(false);
        setBooks([]);
      }
    }, [session?.user?.id, query])
  );

  const loadSearchHistory = async () => {
    try {
      setLoadingHistory(true);
      setError(null);

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('search_history')
        .eq('id', session?.user?.id)
        .single();

      if (fetchError) throw fetchError;

      const history = profile?.search_history || [];
      setSearchHistory([...history].reverse());
    } catch (err) {
      console.error('Error loading search history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveSearchTerm = async (term: string) => {
    if (!session?.user?.id || !term.trim()) return;

    try {
      const newTerm = term.trim();

      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('search_history')
        .eq('id', session.user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentHistory = currentProfile?.search_history || [];
      const filteredHistory = currentHistory.filter((item: string) => item !== newTerm);

      const newHistory = [newTerm, ...filteredHistory].slice(0, 10);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ search_history: newHistory })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setSearchHistory([...newHistory]);
    } catch (err) {
      console.error('Error saving search term:', err);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setShowSearchResults(false);
      setBooks([]);
    }
  };

  const searchBooks = async (searchTerm?: string) => {
    const termToSearch = searchTerm || query;
    if (!termToSearch.trim()) {
      setShowSearchResults(false);
      setBooks([]);
      return;
    }

    setLoading(true);
    setError(null);
    setShowFilters(false);
    setShowSearchResults(true);

    try {
      if (!searchTerm) {
        await saveSearchTerm(termToSearch.trim());
      }

      if (!API_URL || !API_KEY) {
        throw new Error('API configuration is missing');
      }

      let searchQuery = termToSearch;

      if (selectedGenres.length > 0) {
        searchQuery += ' subject:' + selectedGenres.join(' OR subject:');
      }

      if (selectedLanguages.length > 0) {
        searchQuery += ' ' + selectedLanguages.map(lang => `language:${lang}`).join(' OR ');
      }

      let url = `${API_URL}?q=${encodeURIComponent(searchQuery)}&key=${API_KEY}&maxResults=40`;

      switch (sortBy) {
        case 'newest':
          url += '&orderBy=newest';
          break;
        case 'oldest':
          url += '&orderBy=published-date';
          break;
        default:
          url += '&orderBy=relevance';
      }

      const data = await fetchWithRetry(url);

      if (!data.items || !Array.isArray(data.items)) {
        setBooks([]);
        setError('No books found. Try a different search term.');
        return;
      }

      let filteredBooks = data.items;


      if (selectedPreviewType.length > 0) {
        filteredBooks = filteredBooks.filter((book: Book) => {
          const previewLink = book.volumeInfo?.previewLink;
          if (selectedPreviewType.includes('in_app') && previewLink?.includes('books.google.com')) {
            return true;
          }
          if (selectedPreviewType.includes('external') && previewLink && !previewLink.includes('books.google.com')) {
            return true;
          }
          return false;
        });
      }

      switch (sortBy) {
        case 'title_asc':
          filteredBooks.sort((a: Book, b: Book) =>
            a.volumeInfo.title.localeCompare(b.volumeInfo.title)
          );
          break;
        case 'title_desc':
          filteredBooks.sort((a: Book, b: Book) =>
            b.volumeInfo.title.localeCompare(a.volumeInfo.title)
          );
          break;
        case 'price_asc':
          filteredBooks.sort((a: Book, b: Book) => {
            const priceA = a.saleInfo?.listPrice?.amount || 0;
            const priceB = b.saleInfo?.listPrice?.amount || 0;
            return priceA - priceB;
          });
          break;
        case 'price_desc':
          filteredBooks.sort((a: Book, b: Book) => {
            const priceA = a.saleInfo?.listPrice?.amount || 0;
            const priceB = b.saleInfo?.listPrice?.amount || 0;
            return priceB - priceA;
          });
          break;
      }

      setBooks(filteredBooks);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError(
        err instanceof Error
          ? `Failed to fetch books: ${err.message}`
          : 'Failed to fetch books. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (book: Book) => {
    if (isGuest) {
      router.push('/login');
      return;
    }

    try {
      const { data: existingEntry } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', session?.user?.id)
        .eq('google_books_id', book.id)
        .maybeSingle();

      if (existingEntry) {
        Alert.alert('Info', 'This book is already in your wishlist');
        return;
      }

      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: session?.user?.id,
          google_books_id: book.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert('Success', 'Book added to wishlist!');
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      Alert.alert('Error', 'Failed to add book to wishlist');
    }
  };

  const clearSearchHistory = async () => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ search_history: [] })
        .eq('id', session.user.id);
      if (error) throw error;
      setSearchHistory([]);
    } catch (err) {
      console.error('Error clearing history:', err);
      Alert.alert('Error', 'Failed to clear search history');
    }
  };

  const handlePreview = (previewLink: string) => {
    if (Platform.OS === 'web') {
      window.open(previewLink, '_blank');
    } else {
      Linking.openURL(previewLink);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const toggleLanguage = (langCode: string) => {
    setSelectedLanguages(prev =>
      prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [langCode]
    );
  };


  const togglePreviewType = (type: string) => {
    setSelectedPreviewType(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedGenres([]);
    setSelectedLanguages([]);
    setSelectedPreviewType([]);
    setSortBy('relevance');
  };

  const renderSearchHistory = () => {
    if (loadingHistory) {
      return (
        <View style={styles.historyLoading}>
          <ActivityIndicator size="small" color="#FA991C" />
          <Text style={styles.historyLoadingText}>Loading search history...</Text>
        </View>
      );
    }

    if (!session?.user?.id) {
      return null;
    }

    if (searchHistory.length === 0) {
      return (
        <View style={styles.emptyHistory}>
          <History size={24} color="#1C768F" />
          <Text style={styles.emptyHistoryText}>You haven't searched for anything yet</Text>
        </View>
      );
    }

    const displayHistory = showAllHistory ? searchHistory : searchHistory.slice(0, 4);

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent Searches</Text>
        <View style={styles.historyList}>
          {displayHistory.map((term, index) => (
            <TouchableOpacity
              key={index}
              style={styles.historyItem}
              onPress={() => {
                setQuery(term);
                searchBooks(term);
              }}
            >
              <History size={16} color="#1C768F" />
              <Text style={styles.historyText}>{term}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.clearHistoryButton}
            onPress={clearSearchHistory}
          >
            <Text style={styles.clearHistoryButtonText}>Clear History</Text>
          </TouchableOpacity>
        </View>
        {searchHistory.length > 4 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowAllHistory(!showAllHistory)}
          >
            <Text style={styles.viewAllText}>
              {showAllHistory ? 'Show Less' : 'View All'}
            </Text>
            <ChevronRight size={16} color="#FA991C" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBook = ({ item }: { item: Book }) => (
    <View style={styles.bookCard}>
      <TouchableOpacity
        style={styles.bookContent}
        onPress={() => router.push(`/google-book/${item.id}`)}
      >
        <Image
          source={{
            uri: item.volumeInfo.imageLinks?.thumbnail ||
              'https://images.pexels.com/photos/1543002588-bfa74002ed7e.jpeg?w=400&q=80'
          }}
          style={styles.bookImage}
        />
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.volumeInfo.title}
          </Text>
          {item.volumeInfo.authors && (
            <Text style={styles.bookAuthor} numberOfLines={1}>
              {item.volumeInfo.authors[0]}
            </Text>
          )}
          <View style={styles.bookMeta}>
            <View style={styles.ratingContainer}>
              <Star size={16} color="#FA991C" fill="#FA991C" />
              <Text style={styles.ratingText}>
                {item.volumeInfo.averageRating?.toFixed(1) || '4.5'}
              </Text>
            </View>
            <Download size={16} color="#FA991C" />
          </View>
        </View>
      </TouchableOpacity>
      {item.volumeInfo.previewLink && (
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePreview(item.volumeInfo.previewLink!)}
          >
            <View style={styles.previewContent}>
              <ExternalLink size={16} color="#FBF3F2" />
              <Text style={styles.previewButtonText}>Preview In-App</Text>
            </View>
            <TouchableOpacity
              style={styles.wishlistButton}
              onPress={() => addToWishlist(item)}
            >
              <Heart size={16} color="#FA991C" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFilterSection = () => (
    <View style={[styles.filtersContainer, !showFilters && styles.filtersHidden]}>
      <View style={styles.filterHeader}>
        <Text style={styles.filterTitle}>Filters & Sort</Text>
        <View style={styles.filterHeaderActions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearFilters}
          >
            <ArrowUpDown size={16} color="#FBF3F2" />
            <Text style={styles.clearButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFilters(false)}
          >
            <X size={20} color="#FBF3F2" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.filterContent}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Sort By</Text>
          <View style={styles.sortOptions}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  sortBy === option.id && styles.sortOptionActive
                ]}
                onPress={() => setSortBy(option.id)}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === option.id && styles.sortOptionTextActive
                ]}>
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Preview Type</Text>
          <View style={styles.filterOptions}>
            {PREVIEW_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterOption,
                  selectedPreviewType.includes(option.id) && styles.filterOptionActive
                ]}
                onPress={() => togglePreviewType(option.id)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedPreviewType.includes(option.id) && styles.filterOptionTextActive
                ]}>
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Languages</Text>
          <View style={styles.filterOptions}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.filterOption,
                  selectedLanguages.includes(lang.code) && styles.filterOptionActive
                ]}
                onPress={() => toggleLanguage(lang.code)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedLanguages.includes(lang.code) && styles.filterOptionTextActive
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Genres</Text>
          <View style={styles.filterOptions}>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre}
                style={[
                  styles.filterOption,
                  selectedGenres.includes(genre) && styles.filterOptionActive
                ]}
                onPress={() => toggleGenre(genre)}
              >
                <Text style={[
                  styles.filterOptionText,
                  selectedGenres.includes(genre) && styles.filterOptionTextActive
                ]}>
                  {genre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={() => {
          setShowFilters(false);
          searchBooks();
        }}
      >
        <Text style={styles.applyButtonText}>Apply Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#1C768F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search books..."
            placeholderTextColor="#1C768F"
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => searchBooks()}
            returnKeyType="search"
          />
          {query.trim() && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setShowSearchResults(false);
                setBooks([]);
              }}
              style={styles.clearButton}
            >
              <X size={20} color="#1C768F" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchActions}>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={20} color="#FBF3F2" />
            <Text style={styles.filterButtonText}>Filters</Text>
            <ChevronDown size={16} color="#FBF3F2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => searchBooks()}
          >
            <BookOpen size={20} color="#FBF3F2" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && renderFilterSection()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => searchBooks()}>
            <Text style={styles.retryButtonText}>Retry Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FA991C" />
          <Text style={styles.loadingText}>Searching books...</Text>
        </View>
      ) : showSearchResults && books.length > 0 ? (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.booksList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          style={styles.emptyContainer}
          contentContainerStyle={styles.emptyContent}
        >
          {renderSearchHistory()}
          {!query.trim() && !showSearchResults && (
            <View style={styles.emptyTextContainer}>
              <Text style={styles.emptyText}>
                Start searching for books
              </Text>
            </View>
          )}
          {showSearchResults && books.length === 0 && query.trim() && (
            <View style={styles.emptyTextContainer}>
              <Text style={styles.emptyText}>
                No books found for "{query}"
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#032539',
  },
  searchContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
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
    marginBottom: 16,
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
  searchActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FA991C',
    borderRadius: 12,
    height: 46,
  },
  searchButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C768F',
    borderRadius: 12,
    height: 46,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#FA991C',
  },
  filterButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#1C768F',
    borderBottomWidth: 1,
    borderBottomColor: '#FA991C',
    maxHeight: 500,
  },
  filtersHidden: {
    display: 'none',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FA991C',
  },
  filterHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3F2',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  clearButtonText: {
    color: '#FBF3F2',
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  filterContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBF3F2',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#032539',
    borderWidth: 1,
    borderColor: '#FA991C',
  },
  filterOptionActive: {
    backgroundColor: '#FA991C',
  },
  filterOptionText: {
    color: '#FBF3F2',
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: '#032539',
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#032539',
    borderWidth: 1,
    borderColor: '#FA991C',
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: '#FA991C',
  },
  sortOptionText: {
    color: '#FBF3F2',
    fontSize: 14,
  },
  sortOptionTextActive: {
    color: '#032539',
  },
  applyButton: {
    backgroundColor: '#FA991C',
    padding: 20,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
  booksList: {
    padding: 20,
  },
  bookCard: {
    backgroundColor: '#1C768F',
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bookContent: {
    flexDirection: 'row',
    padding: 16,
  },
  bookImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3F2',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.8,
    marginBottom: 12,
  },
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FBF3F2',
    fontSize: 14,
    fontWeight: '500',
  },
  previewContainer: {
    borderTopWidth: 1,
    borderTopColor: '#FA991C',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FBF3F2',
    fontWeight: '500',
  },
  wishlistButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#032539',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FBF3F2',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#1C768F',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#FBF3F2',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FA991C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FBF3F2',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyContent: {
    padding: 16,
  },
  emptyTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  historyContainer: {
    padding: 16,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3F2',
    marginBottom: 12,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3F2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: '#032539',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  viewAllText: {
    color: '#FA991C',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    marginBottom: 24,
  },
  emptyHistoryText: {
    color: '#FBF3F2',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  historyLoadingText: {
    color: '#FBF3F2',
    fontSize: 14,
  },
  emptyText: {
    fontSize: 16,
    color: '#FBF3F2',
    textAlign: 'center',
  },
  clearHistoryButton: {
    backgroundColor: '#FA991C',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  clearHistoryButtonText: {
    color: '#FBF3F2',
    fontWeight: 'bold',
  },
  noHistory: {
    color: '#FBF3F2',
    textAlign: 'center',
    marginTop: 16,
  },
});