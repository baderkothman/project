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
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { colors, spacing, radius, type } from '@/src/presentation/theme/tokens';
import { Card, Button, EmptyState } from '@/src/presentation/components/ui';

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
      const { data, error: profileError } = await dataClient
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
      const { data, error: booksError } = await dataClient
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
      const { data, error } = await dataClient
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
        const { error } = await dataClient
          .from('followers')
          .delete()
          .eq('follower_id', session?.user?.id)
          .eq('following_id', id);

        if (error) throw error;
      } else {
        const { error } = await dataClient
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
        <Button
          label="Go Back"
          onPress={() => router.back()}
          variant="secondary"
          style={styles.backButton}
        />
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
            <Button
              label={isFollowing ? 'Following' : 'Follow'}
              onPress={toggleFollow}
              variant={isFollowing ? 'secondary' : 'primary'}
              loading={followLoading}
              icon={
                isFollowing ? (
                  <UserMinus size={20} color={colors.text} />
                ) : (
                  <UserPlus size={20} color={colors.onPrimary} />
                )
              }
              style={styles.followButton}
              accessibilityLabel={isFollowing ? `Unfollow ${profile.first_name} ${profile.last_name}` : `Follow ${profile.first_name} ${profile.last_name}`}
            />
          )}
        </View>

        <View style={styles.booksSection}>
          <View style={styles.sectionHeader}>
            <BookOpen size={24} color={colors.primary} />
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
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${book.title}`}
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
            <EmptyState
              icon={<BookOpen size={48} color={colors.textMuted} />}
              title="No books listed yet"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    ...type.title,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  username: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  bio: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  followButton: {
    paddingHorizontal: spacing.md,
  },
  booksSection: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
    flex: 1,
  },
  bookCount: {
    ...type.label,
    color: colors.primary,
  },
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_SPACING,
  },
  bookCard: {
    width: ITEM_WIDTH,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  bookImage: {
    width: '100%',
    height: ITEM_WIDTH * 1.5,
    backgroundColor: colors.badgeBackground,
  },
  bookInfo: {
    padding: spacing.sm,
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
    color: colors.primary,
  },
  bookCondition: {
    backgroundColor: colors.background,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xxs,
  },
  conditionText: {
    ...type.caption,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...type.body,
    marginTop: spacing.sm,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: {
    ...type.heading,
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
