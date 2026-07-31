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
import { Link, useRouter, useFocusEffect } from 'expo-router';
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
import { dataClient } from '@/src/infrastructure/local-api/client';
import { searchGoogleBooks } from '@/src/application/services/google-books';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { colors, radius, spacing, touchTarget, type, fontFamily } from '@/src/presentation/theme/tokens';
import { Button } from '@/src/presentation/components/ui';

interface Book {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
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

      const { data: profile, error: fetchError } = await dataClient
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

      const { data: currentProfile, error: fetchError } = await dataClient
        .from('profiles')
        .select('search_history')
        .eq('id', session.user.id)
        .single();

      if (fetchError) throw fetchError;

      const currentHistory = currentProfile?.search_history || [];
      const filteredHistory = currentHistory.filter((item: string) => item !== newTerm);

      const newHistory = [newTerm, ...filteredHistory].slice(0, 10);

      const { error: updateError } = await dataClient
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

      let searchQuery = termToSearch;

      if (selectedGenres.length > 0) {
        searchQuery += ' subject:' + selectedGenres.join(' OR subject:');
      }

      if (selectedLanguages.length > 0) {
        searchQuery += ' ' + selectedLanguages.map(lang => `language:${lang}`).join(' OR ');
      }

      const data = await searchGoogleBooks(searchQuery, {
        maxResults: 40,
        orderBy: sortBy === 'newest' ? 'newest' : 'relevance',
      });

      if (!data.items || !Array.isArray(data.items)) {
        setBooks([]);
        setError('No books found. Try a different search term.');
        return;
      }

      let filteredBooks = data.items as Book[];


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
      const { data: existingEntry } = await dataClient
        .from('wishlist')
        .select('id')
        .eq('user_id', session?.user?.id)
        .eq('google_books_id', book.id)
        .maybeSingle();

      if (existingEntry) {
        Alert.alert('Info', 'This book is already in your wishlist');
        return;
      }

      const { error } = await dataClient
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
      const { error } = await dataClient
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
          <ActivityIndicator size="small" color={colors.primary} />
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
          <History size={24} color={colors.textMuted} />
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
              accessibilityRole="button"
              accessibilityLabel={`Search for ${term}`}
            >
              <History size={16} color={colors.textMuted} />
              <Text style={styles.historyText}>{term}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.clearHistoryButton}
            onPress={clearSearchHistory}
            accessibilityRole="button"
            accessibilityLabel="Clear search history"
          >
            <Text style={styles.clearHistoryButtonText}>Clear History</Text>
          </TouchableOpacity>
        </View>
        {searchHistory.length > 4 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowAllHistory(!showAllHistory)}
            accessibilityRole="button"
            accessibilityLabel={showAllHistory ? 'Show fewer recent searches' : 'View all recent searches'}
          >
            <Text style={styles.viewAllText}>
              {showAllHistory ? 'Show Less' : 'View All'}
            </Text>
            <ChevronRight size={16} color={colors.primary} />
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
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.volumeInfo.title}`}
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
              <Star size={16} color={colors.foil} fill={colors.foil} />
              <Text style={styles.ratingText}>
                {item.volumeInfo.averageRating?.toFixed(1) || '4.5'}
              </Text>
            </View>
            <Download size={16} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
      {item.volumeInfo.previewLink && (
        <View style={styles.previewContainer}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => handlePreview(item.volumeInfo.previewLink!)}
            accessibilityRole="button"
            accessibilityLabel="Preview in app"
          >
            <View style={styles.previewContent}>
              <ExternalLink size={16} color={colors.text} />
              <Text style={styles.previewButtonText}>Preview In-App</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.wishlistButton}
            onPress={() => addToWishlist(item)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.volumeInfo.title} to wishlist`}
          >
            <Heart size={16} color={colors.primary} />
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
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
          >
            <ArrowUpDown size={16} color={colors.text} />
            <Text style={styles.clearButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowFilters(false)}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
          >
            <X size={20} color={colors.text} />
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
                accessibilityRole="radio"
                accessibilityLabel={`Sort by ${option.name}`}
                accessibilityState={{ checked: sortBy === option.id }}
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
                accessibilityRole="checkbox"
                accessibilityLabel={option.name}
                accessibilityState={{ checked: selectedPreviewType.includes(option.id) }}
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
                accessibilityRole="checkbox"
                accessibilityLabel={lang.name}
                accessibilityState={{ checked: selectedLanguages.includes(lang.code) }}
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
                accessibilityRole="checkbox"
                accessibilityLabel={genre}
                accessibilityState={{ checked: selectedGenres.includes(genre) }}
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

      <Button
        label="Apply Filters"
        onPress={() => {
          setShowFilters(false);
          searchBooks();
        }}
        accessibilityLabel="Apply filters"
        style={styles.applyButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search books..."
            placeholderTextColor={colors.textMuted}
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
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchActions}>
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
            accessibilityRole="button"
            accessibilityLabel="Toggle filters"
            accessibilityState={{ expanded: showFilters }}
          >
            <SlidersHorizontal size={20} color={colors.text} />
            <Text style={styles.filterButtonText}>Filters</Text>
            <ChevronDown size={16} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => searchBooks()}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <BookOpen size={20} color={colors.onPrimary} />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && renderFilterSection()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            label="Retry Search"
            onPress={() => searchBooks()}
            accessibilityLabel="Retry search"
            style={styles.retryButton}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: touchTarget.minHeight,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    ...type.body,
    color: colors.text,
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
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 46,
  },
  searchButtonText: {
    ...type.label,
    color: colors.onPrimary,
    marginLeft: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 46,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.primary,
  },
  filterButtonText: {
    ...type.label,
    color: colors.text,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    borderBottomColor: colors.border,
  },
  filterHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterTitle: {
    ...type.heading,
    color: colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  clearButtonText: {
    ...type.caption,
    color: colors.text,
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
    ...type.label,
    color: colors.text,
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
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    ...type.caption,
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.onPrimary,
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  sortOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortOptionText: {
    ...type.caption,
    color: colors.text,
  },
  sortOptionTextActive: {
    color: colors.onPrimary,
  },
  applyButton: {
    margin: spacing.md,
  },
  booksList: {
    padding: 20,
  },
  bookCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  bookContent: {
    flexDirection: 'row',
    padding: 16,
  },
  bookImage: {
    width: 100,
    height: 150,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  bookTitle: {
    ...type.bodyStrong,
    color: colors.text,
    marginBottom: 4,
  },
  bookAuthor: {
    ...type.caption,
    color: colors.textMuted,
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
    ...type.caption,
    color: colors.text,
    fontFamily: fontFamily.bodyMedium,
  },
  previewContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewButtonText: {
    marginLeft: 8,
    ...type.caption,
    color: colors.text,
    fontFamily: fontFamily.bodyMedium,
  },
  wishlistButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
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
    ...type.body,
    color: colors.text,
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  errorText: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
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
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  historyTitle: {
    ...type.bodyStrong,
    color: colors.text,
    marginBottom: 12,
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: radius.sm,
    gap: 8,
  },
  historyText: {
    flex: 1,
    ...type.caption,
    color: colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
  },
  viewAllText: {
    color: colors.primary,
    ...type.caption,
    fontFamily: fontFamily.bodyMedium,
    marginRight: 4,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  emptyHistoryText: {
    color: colors.text,
    ...type.body,
    marginTop: 12,
    textAlign: 'center',
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    gap: 8,
  },
  historyLoadingText: {
    color: colors.text,
    ...type.caption,
  },
  emptyText: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
  },
  clearHistoryButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: radius.sm,
    marginTop: 12,
    alignItems: 'center',
  },
  clearHistoryButtonText: {
    color: colors.onPrimary,
    ...type.label,
  },
  noHistory: {
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
});
