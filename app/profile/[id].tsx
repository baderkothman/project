import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { UserPlus, UserMinus, BookOpen } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

const windowWidth = Dimensions.get('window').width;
const GRID_SPACING = 16;
const GRID_COLUMNS = 2;
const ITEM_MARGIN = GRID_SPACING / 2;
const ITEM_WIDTH = (windowWidth - (40 + GRID_SPACING * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

interface Profile {
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  bio: string;
  library_count: number;
}

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: string;
  images: string[];
}

interface Stats {
  books: number;
  followers: number;
  following: number;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadProfile();
      loadBooks();
      if (session?.user?.id) {
        checkFollowStatus();
      }
    }
  }, [id, session?.user?.id]);

  const loadProfile = async () => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    }
  };

  const loadBooks = async () => {
    try {
      const { data, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;
      setBooks(data || []);
    } catch (err) {
      console.error('Error loading books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', session?.user?.id)
        .eq('following_id', id)
        .maybeSingle();

      if (error) throw error;
      setIsFollowing(!!data);
    } catch (err) {
      console.error('Error checking follow status:', err);
    }
  };

  const toggleFollow = async () => {
    try {
      setFollowLoading(true);

      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', session?.user?.id)
          .eq('following_id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: session?.user?.id,
            following_id: id
          });

        if (error) throw error;
      }

      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <Image
            source={{ 
              uri: profile?.avatar_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=400&q=80'
            }}
            style={styles.avatar}
          />
          
          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {profile.first_name} {profile.last_name}
            </Text>
            <Text style={styles.username}>@{profile.username}</Text>
            {profile.bio && (
              <Text style={styles.bio}>{profile.bio}</Text>
            )}
          </View>

          {session?.user?.id !== id && (
            <TouchableOpacity
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                followLoading && styles.buttonDisabled
              ]}
              onPress={toggleFollow}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator color="#FBF3F2" size="small" />
              ) : isFollowing ? (
                <>
                  <UserMinus size={20} color="#FBF3F2" />
                  <Text style={styles.followButtonText}>Following</Text>
                </>
              ) : (
                <>
                  <UserPlus size={20} color="#FBF3F2" />
                  <Text style={styles.followButtonText}>Follow</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.booksSection}>
          <View style={styles.sectionHeader}>
            <BookOpen size={24} color="#FA991C" />
            <Text style={styles.sectionTitle}>Listed Books</Text>
            <Text style={styles.bookCount}>
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </Text>
          </View>

          {books.length > 0 ? (
            <View style={styles.booksGrid}>
              {books.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookCard}
                  onPress={() => router.push(`/book/${book.id}`)}
                >
                  <Image
                    source={{ uri: book.images[0] }}
                    style={styles.bookImage}
                    resizeMode="cover"
                  />
                  <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {book.title}
                    </Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>
                      by {book.author}
                    </Text>
                    <Text style={styles.bookPrice}>
                      ${book.price.toFixed(2)}
                    </Text>
                    <View style={styles.bookCondition}>
                      <Text style={styles.conditionText}>
                        {book.condition}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBooks}>
              <BookOpen size={48} color="#1C768F" />
              <Text style={styles.emptyText}>No books listed yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#032539',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FA991C',
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBF3F2',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#FBF3F2',
    opacity: 0.8,
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 16,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FA991C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  followingButton: {
    backgroundColor: '#1C768F',
    borderWidth: 2,
    borderColor: '#FA991C',
  },
  followButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  booksSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FBF3F2',
    flex: 1,
  },
  bookCount: {
    fontSize: 14,
    color: '#FA991C',
    fontWeight: '500',
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  bookCard: {
    width: ITEM_WIDTH,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    height: ITEM_WIDTH * 1.5,
    backgroundColor: '#0D1B2A',
  },
  bookInfo: {
    padding: 12,
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
  },
  bookCondition: {
    backgroundColor: '#032539',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  conditionText: {
    fontSize: 12,
    color: '#FBF3F2',
    fontWeight: '500',
  },
  emptyBooks: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1C768F',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#FBF3F2',
    marginTop: 16,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#032539',
  },
  errorText: {
    fontSize: 18,
    color: '#FA991C',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#1C768F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#FBF3F2',
    fontSize: 16,
    fontWeight: '600',
  },
});