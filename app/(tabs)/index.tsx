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

import { useWishlist } from '@/src/presentation/hooks/useWishlist';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { searchGoogleBooks } from '@/src/application/services/google-books';
import {
  colors,
  radius,
  spacing,
  touchTarget,
  type,
  fontSizes,
} from '@/src/presentation/theme/tokens';

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
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/users?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const fetchBooks = async () => {
    try {
      setCatalogUnavailable(false);
      const dailyRes = await searchGoogleBooks('The Alchemist Paulo Coelho', {
        maxResults: 1,
      });
      setDailyBook(dailyRes.items?.[0] || null);

      const pdfRes = await searchGoogleBooks('classic literature', {
        filter: 'free-ebooks',
        maxResults: 10,
      });
      setPdfBooks(pdfRes.items || []);
    } catch {
      setCatalogUnavailable(true);
    }
  };

  const fetchUserBooks = async () => {
    try {
      const { data, error } = await dataClient
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      setUserBooks(data || []);
    } catch (err) {
      console.error('Error fetching user books:', err);
      setLocalError('The local book collection could not be loaded.');
    }
  };

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setLocalError(null);
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
      accessibilityRole="button"
      accessibilityLabel={`${item.title} by ${item.author}, ${item.price.toFixed(2)} dollars`}
    >
      <Image
        source={{
          uri:
            item.images[0] ||
            'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
        }}
        style={styles.userBookImage}
      />
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
        <ActivityIndicator size="large" color={colors.primary} />
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
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={21} color={colors.info} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find readers by username"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Find readers by username"
          />
        </View>
      </View>

      {/* Local data error */}
      {localError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{localError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading books"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Books */}
      {userBooks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Library size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Discover Books</Text>
            <Link href="/all-books" asChild>
              <TouchableOpacity
                style={styles.viewAllButton}
                accessibilityRole="button"
                accessibilityLabel="View all community books"
              >
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

      {catalogUnavailable && (
        <View style={styles.catalogNotice}>
          <Text style={styles.catalogNoticeText}>
            The online catalog is temporarily unavailable. Your local collection
            is still ready to browse.
          </Text>
        </View>
      )}

      {/* Daily Book */}
      {dailyBook && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Daily Book</Text>
          </View>
          <TouchableOpacity
            style={styles.dailyBookCard}
            onPress={() => router.push(`/google-book/${dailyBook.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${dailyBook.volumeInfo.title} book details`}
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
                  <Star size={16} color={colors.primary} fill={colors.primary} />
                  <Text style={styles.ratingText}>
                    {dailyBook.volumeInfo.averageRating?.toFixed(1) || '4.8'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.wishlistButton}
                  onPress={() => addToWishlist(dailyBook.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${dailyBook.volumeInfo.title} to wishlist`}
                >
                  <Heart size={18} color={colors.primary} />
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
            <Download size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>PDF Books</Text>
          </View>
          <FlatList
            data={pdfBooks}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userBookCard}
                onPress={() => router.push(`/google-book/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${item.volumeInfo.title} book details`}
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
                      <Star size={16} color={colors.primary} fill={colors.primary} />
                      <Text style={styles.ratingText}>
                        {item.volumeInfo.averageRating?.toFixed(1) || '4.5'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.wishlistButton}
                      onPress={() => addToWishlist(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${item.volumeInfo.title} to wishlist`}
                    >
                      <Heart size={18} color={colors.primary} />
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
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.minHeight,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, ...type.body, color: colors.text },
  section: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { ...type.heading, color: colors.text, marginLeft: spacing.xs, flex: 1 },
  viewAllButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  viewAllText: { color: colors.primary, ...type.label },
  userBooksList: { paddingRight: spacing.md },
  userBookCard: {
    width: 164,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  userBookImage: { width: '100%', height: 218, backgroundColor: colors.surface },
  userBookInfo: { padding: 12 },
  userBookTitle: { ...type.label, color: colors.text, marginBottom: 4 },
  userBookAuthor: { ...type.caption, color: colors.textMuted, marginBottom: 8 },
  userBookPrice: { fontSize: fontSizes[18], lineHeight: 24, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  userBookCondition: {
    backgroundColor: colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  conditionText: { ...type.caption, color: colors.text, fontWeight: '600' },
  dailyBookCard: { flexDirection: 'row', backgroundColor: colors.surfaceRaised, borderRadius: radius.md, overflow: 'hidden' },
  dailyBookImage: { width: 120, height: 180 },
  dailyBookInfo: { flex: 1, padding: 16 },
  dailyBookTitle: { fontSize: fontSizes[18], lineHeight: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  dailyBookAuthor: { ...type.caption, color: colors.textMuted, marginBottom: 8 },
  dailyBookDescription: { ...type.caption, color: colors.textMuted, marginBottom: 12 },
  dailyBookMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 4, ...type.caption, color: colors.text, fontWeight: '600' },
  wishlistButton: {
    ...touchTarget,
    borderRadius: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 12, ...type.body, color: colors.text },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  errorText: { color: colors.text, ...type.body, textAlign: 'center', marginBottom: 12 },
  catalogNotice: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  catalogNoticeText: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    minHeight: touchTarget.minHeight,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  retryButtonText: { color: colors.onPrimary, ...type.label },
});
