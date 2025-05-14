import { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LogIn, UserPlus, WifiOff, Settings, Share2, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useRetry } from '@/hooks/useRetry';
import ShareModal from '@/components/ShareModal';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';

const windowWidth = Dimensions.get('window').width;
const GRID_SPACING = 12;
const GRID_COLUMNS = 2;
const ITEM_MARGIN = GRID_SPACING / 2;
const ITEM_WIDTH = (windowWidth - (40 + GRID_SPACING * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

const MemoizedImage = memo(Image);

const StatItem = memo(({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) => (
  <TouchableOpacity style={styles.statItem} onPress={onPress}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </TouchableOpacity>
));

const BookCard = memo(({ book, onPress }: { book: Book; onPress: () => void }) => (
  <TouchableOpacity 
    style={styles.bookCard}
    onPress={onPress}
  >
    <MemoizedImage
      source={{ uri: book.images[0] }}
      style={styles.bookImage}
      resizeMode="cover"
    />
    <View style={styles.bookInfo}>
      <Text style={styles.bookTitle} numberOfLines={1}>
        {book.title}
      </Text>
      <Text style={styles.bookAuthor} numberOfLines={1}>
        by {book.author}
      </Text>
      <Text style={styles.bookPrice}>${book.price.toFixed(2)}</Text>
    </View>
  </TouchableOpacity>
));

interface UserProfile {
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url: string;
  books_read: number;
  books_exchanged: number;
  library_count: number;
  wishlist_count: number;
  history_count: number;
}


interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: string;
  images: string[];
  created_at: string;
}

interface Stats {
  books: number;
  followers: number;
  following: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, isGuest } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isNetwork?: boolean } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [stats, setStats] = useState<Stats>({
    books: 0,
    followers: 0,
    following: 0
  });
  const [isRetrying, setIsRetrying] = useState(false);

  const getShareUrl = () => {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/profile/${session?.user?.id}`;
    }
    return `https://your-app-url.com/profile/${session?.user?.id}`;
  };

  const fetchFollowerCounts = useCallback(async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) return;

      const [followerResult, followingResult] = await Promise.all([
        supabase.rpc('get_follower_count', { uid: userId }),
        supabase.rpc('get_following_count', { uid: userId })
      ]);

      if (followerResult.error) throw followerResult.error;
      if (followingResult.error) throw followingResult.error;

      setStats(prev => ({
        ...prev,
        followers: followerResult.data || 0,
        following: followingResult.data || 0
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching follower counts:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError({
          message: 'Unable to connect to the server. Please check your internet connection.',
          isNetwork: true
        });
      } else {
        setError({
          message: 'An error occurred while fetching follower counts. Please try again.',
          isNetwork: false
        });
      }
    }
  }, [session?.user?.id]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error: profileError } = await supabase
  .from('profiles')
  .select('first_name, last_name, bio, avatar_url, books_read, books_exchanged, library_count, wishlist_count, history_count')
  .eq('id', session?.user?.id)
  .single();

      if (profileError) throw profileError;
      setUserProfile(data);
      setStats(prev => ({
        ...prev,
        books: data.library_count || 0
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError({
          message: 'Unable to connect to the server. Please check your internet connection.',
          isNetwork: true
        });
      } else {
        setError({
          message: 'Failed to load your profile. Please try again.',
          isNetwork: false
        });
      }
    }
  }, [session?.user?.id]);

  const fetchUserBooks = useCallback(async () => {
    try {
      const { data, error: booksError } = await supabase
        .from('books')
        .select('id, title, author, price, condition, images, created_at')
        .eq('user_id', session?.user?.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (booksError) throw booksError;
      setBooks(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching books:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError({
          message: 'Unable to connect to the server. Please check your internet connection.',
          isNetwork: true
        });
      } else {
        setError({
          message: 'Failed to load your library. Please try again.',
          isNetwork: false
        });
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [session?.user?.id]);

  // Use useFocusEffect to refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        setLoading(true);
        Promise.all([
          fetchUserProfile(),
          fetchUserBooks(),
          fetchFollowerCounts()
        ]).finally(() => {
          setLoading(false);
        });
      }
    }, [session?.user?.id, fetchUserProfile, fetchUserBooks, fetchFollowerCounts])
  );

  
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);
    setLoading(true);
    
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchUserBooks(),
        fetchFollowerCounts()
      ]);
    } finally {
      setIsRetrying(false);
      setLoading(false);
    }
  }, [fetchUserProfile, fetchUserBooks, fetchFollowerCounts]);

  const handleBookPress = useCallback((bookId: string) => {
    router.push(`/book/${bookId}`);
  }, [router]);

  const handleFollowersPress = useCallback(() => {
    if (isGuest) {
      router.push('/login');
      return;
    }
    router.push(`/followers/${session?.user?.id}`);
  }, [isGuest, router, session?.user?.id]);

  const handleFollowingPress = useCallback(() => {
    if (isGuest) {
      router.push('/login');
      return;
    }
    router.push(`/following/${session?.user?.id}`);
  }, [isGuest, router, session?.user?.id]);

  const ErrorDisplay = memo(() => (
    <View style={[styles.errorContainer, error?.isNetwork && styles.networkErrorContainer]}>
      {error?.isNetwork && <WifiOff size={24} color="#032539" style={styles.errorIcon} />}
      <Text style={styles.errorText}>{error?.message}</Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={handleRetry}
        disabled={isRetrying}
      >
        <View style={styles.retryButtonContent}>
          <RefreshCw size={16} color="#FBF3F2" style={isRetrying ? styles.spinningIcon : undefined} />
          <Text style={styles.retryButtonText}>
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  ));

  if (loading && !error) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }
  

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={Platform.OS !== 'web'}
    >
      {error && <ErrorDisplay />}

      
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {isGuest ? (
              <View style={styles.emptyProfileImage} />
            ) : (
              <MemoizedImage 
                source={{ 
                  uri: userProfile?.avatar_url || 
  'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=400&q=80'

                }} 
                style={styles.profileImage}
              />
            )}
          </View>
          
          <View style={styles.statsContainer}>
            <StatItem value={stats.books} label="Books" />
            <StatItem 
              value={stats.followers} 
              label="Followers"
              onPress={handleFollowersPress}
            />
            <StatItem 
              value={stats.following} 
              label="Following"
              onPress={handleFollowingPress}
            />
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.name}>
            {isGuest ? 'Guest User' : userProfile?.first_name || 'Loading...'}
          </Text>
          <Text style={styles.bio}>
            {isGuest
              ? 'Sign in to access all features'
              : userProfile?.bio || 'Book enthusiast and avid reader'}
          </Text>
        </View>

        {isGuest ? (
          <View style={styles.authButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.followButton]}
              onPress={() => router.push('/login')}
            >
              <LogIn size={20} color="#FFF" />
              <Text style={styles.buttonText}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.messageButton]}
              onPress={() => router.push('/signup')}
            >
              <UserPlus size={20} color="#FFF" />
              <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.followButton]}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.messageButton]}
              onPress={() => setShowShareModal(true)}
            >
              <Text style={styles.buttonText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.booksSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Uploaded Books</Text>
          <TouchableOpacity onPress={() => router.push('/library')}>
            <Text style={styles.viewAllButton}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.booksGrid}>
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onPress={() => handleBookPress(book.id)}
            />
          ))}
        </View>
      </View>

      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={getShareUrl()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#032539',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FA991C',
  },
  emptyProfileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: '#1C768F',
    borderWidth: 3,
    borderColor: '#FA991C',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBF3F2',
  },
  statLabel: {
    fontSize: 12,
    color: '#FBF3F2',
    opacity: 0.8,
  },
  bioSection: {
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBF3F2',
    marginBottom: 4,
  },
  bio: {
    fontSize: 16,
    color: '#FBF3F2',
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  authButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#FA991C',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#1C768F',
  },
  messageButton: {
    backgroundColor: '#1C768F',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  booksSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FBF3F2',
  },
  viewAllButton: {
    color: '#FA991C',
    fontSize: 14,
    fontWeight: '500',
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -ITEM_MARGIN,
  },
  bookCard: {
    width: ITEM_WIDTH,
    margin: ITEM_MARGIN,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#0D1B2A',
  },
  bookInfo: {
    padding: 12,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBF3F2',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#FBF3F2',
    opacity: 0.8,
    marginBottom: 4,
  },
  bookPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FA991C',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#032539',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FBF3F2',
  },
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FA991C',
    borderRadius: 8,
    alignItems: 'center',
  },
  networkErrorContainer: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FA991C',
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorText: {
    color: '#032539',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#032539',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  retryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FBF3F2',
    fontSize: 14,
    fontWeight: '600',
  },
  spinningIcon: {
    transform: [{ rotate: '45deg' }],
  },
});