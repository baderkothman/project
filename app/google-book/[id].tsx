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
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Send, ArrowLeft, Info, BookOpen, Share2, Heart, Download } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { getGoogleBook } from '@/src/application/services/google-books';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { colors, type } from '@/src/presentation/theme/tokens';
import { Button, Card, Input, Stamp } from '@/src/presentation/components/ui';

interface GoogleBook {
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
    pageCount?: number;
    averageRating?: number;
  };
  saleInfo?: {
    listPrice?: {
      amount: number;
      currencyCode: string;
    };
  };
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export default function GoogleBookDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [book, setBook] = useState<GoogleBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isGuest, session } = useAuth();
  const [showShareModal, setShowShareModal] = useState(false);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const [sharingWith, setSharingWith] = useState<string | null>(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    fetchBookDetails();
    if (session?.user?.id) {
      checkWishlistStatus();
    }
  }, [id, session?.user?.id]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Book ID is required');
      }

      const data = await getGoogleBook(String(id));
      
      if (!data || !data.volumeInfo) {
        throw new Error('Invalid book data received');
      }
      
      if (data.volumeInfo?.description) {
        data.volumeInfo.description = data.volumeInfo.description
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
      }
      
      setBook(data as GoogleBook);
    } catch (err) {
      console.error('Error fetching book:', err);
      setError(err instanceof Error ? err.message : 'Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      const { data, error: wishlistError } = await dataClient
        .from('wishlist')
        .select('id')
        .eq('user_id', session?.user?.id)
        .eq('google_books_id', id)
        .maybeSingle();

      if (wishlistError) throw wishlistError;
      setIsInWishlist(!!data);
    } catch (err) {
      console.error('Error checking wishlist status:', err);
    }
  };

  const toggleWishlist = async () => {
    if (isGuest) {
      router.push('/login');
      return;
    }

    try {
      setWishlistLoading(true);

      if (isInWishlist) {
        const { error: removeError } = await dataClient
          .from('wishlist')
          .delete()
          .eq('user_id', session?.user?.id)
          .eq('google_books_id', id);

        if (removeError) throw removeError;
      } else {
        const { error: addError } = await dataClient
          .from('wishlist')
          .insert({
            user_id: session?.user?.id,
            google_books_id: id,
            created_at: new Date().toISOString()
          });

        if (addError) throw addError;
      }

      setIsInWishlist(!isInWishlist);
    } catch (err) {
      console.error('Error updating wishlist:', err);
      showToast('Failed to update wishlist', 'error');
    } finally {
      setWishlistLoading(false);
    }
  };

  const fetchFollowers = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoadingFollowers(true);
      const { data: followingData, error: followingError } = await dataClient
        .rpc('get_following_profiles', { uid: session.user.id });

      if (followingError) throw followingError;
      setFollowers(followingData || []);
    } catch (err) {
      console.error('Error fetching followers:', err);
      showToast('Failed to load followers', 'error');
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleShare = async (recipientId: string) => {
    if (!session?.user?.id || !book) return;

    try {
      setSharingWith(recipientId);
      
      const { error: shareError } = await dataClient
        .from('shared_books')
        .insert({
          book_id: book.id,
          sender_id: session.user.id,
          recipient_id: recipientId,
          title: book.volumeInfo.title,
          image: book.volumeInfo.imageLinks?.thumbnail,
          preview_link: book.volumeInfo.previewLink,
        });

      if (shareError) throw shareError;

      showToast('Book shared successfully!', 'success');
      setTimeout(() => setShowShareModal(false), 1500);
    } catch (err) {
      console.error('Error sharing book:', err);
      showToast('Failed to share book', 'error');
    } finally {
      setSharingWith(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePreview = () => {
    if (book?.volumeInfo?.previewLink) {
      if (Platform.OS === 'web') {
        window.open(book.volumeInfo.previewLink, '_blank');
      } else {
        Linking.openURL(book.volumeInfo.previewLink);
      }
    }
  };

  const renderFollower = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={[
        styles.followerItem,
        sharingWith === item.id && styles.followerItemSharing
      ]}
      onPress={() => handleShare(item.id)}
      disabled={sharingWith === item.id}
      accessibilityRole="button"
      accessibilityLabel={`Share with ${item.first_name} ${item.last_name}`}
    >
      <Image
        source={{ 
          uri: item.avatar_url || 
            'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400&q=80'
        }}
        style={styles.followerAvatar}
      />
      <View style={styles.followerInfo}>
        <Text style={styles.followerName}>
          {item.first_name} {item.last_name}
        </Text>
        <Text style={styles.followerUsername}>@{item.username}</Text>
      </View>
      {sharingWith === item.id ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Send size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Book not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to browse"
        >
          <Text style={styles.backButtonText}>Back to Browse</Text>
        </TouchableOpacity>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              wishlistLoading && styles.buttonDisabled
            ]}
            onPress={toggleWishlist}
            disabled={wishlistLoading}
            accessibilityRole="button"
            accessibilityLabel={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            accessibilityState={{ selected: isInWishlist, disabled: wishlistLoading }}
          >
            <Heart
              size={24}
              color={colors.text}
              fill={isInWishlist ? colors.text : "none"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (isGuest) {
                router.push('/login');
                return;
              }
              setShowShareModal(true);
              fetchFollowers();
            }}
            accessibilityRole="button"
            accessibilityLabel="Share this book"
          >
            <Share2 size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: book.volumeInfo.imageLinks?.thumbnail ||
                'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80'
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{book.volumeInfo.title}</Text>
          {book.volumeInfo.authors && (
            <Text style={styles.author}>
              by {book.volumeInfo.authors.join(', ')}
            </Text>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this book</Text>
            <Text style={styles.description}>
              {book.volumeInfo.description || 'No description available.'}
            </Text>
          </View>

          <Card style={styles.detailsGrid}>
            {book.volumeInfo.language && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Language</Text>
                <Text style={styles.detailValue}>
                  {book.volumeInfo.language.toUpperCase()}
                </Text>
              </View>
            )}
            {book.volumeInfo.pageCount && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Pages</Text>
                <Text style={styles.detailValue}>
                  {book.volumeInfo.pageCount}
                </Text>
              </View>
            )}
            {book.volumeInfo.publishedDate && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Published</Text>
                <Text style={styles.detailValue}>
                  {new Date(book.volumeInfo.publishedDate).getFullYear()}
                </Text>
              </View>
            )}
          </Card>

          {book.volumeInfo.categories && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categories}>
                {book.volumeInfo.categories.map((category, index) => (
                  <Stamp key={index} tone="ink">
                    {category.toUpperCase()}
                  </Stamp>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Download"
          onPress={handlePreview}
          disabled={!book.volumeInfo.previewLink}
          icon={<Download size={20} color={colors.onPrimary} />}
          style={styles.previewButton}
        />
        <Button
          label="Preview"
          onPress={() => Linking.openURL(book.volumeInfo.previewLink || '')}
          variant="secondary"
          icon={<BookOpen size={20} color={colors.text} />}
          style={styles.infoButton}
        />
      </View>

      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share with Friends</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowShareModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Close share dialog"
              >
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              style={styles.searchInput}
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loadingFollowers ? (
              <View style={styles.loadingFollowers}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingFollowersText}>
                  Loading friends...
                </Text>
              </View>
            ) : followers.length === 0 ? (
              <View style={styles.emptyFollowers}>
                <Text style={styles.emptyFollowersText}>
                  You're not following anyone yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={followers}
                renderItem={renderFollower}
                keyExtractor={(item) => item.id}
                style={styles.followersList}
                contentContainerStyle={styles.followersContent}
              />
            )}
          </View>
        </View>
      </Modal>

      {toast && (
        <View style={[
          styles.toast,
          toast.type === 'error' && styles.toastError
        ]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 500,
    backgroundColor: colors.surface,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    padding: 24,
  },
  title: {
    ...type.title,
    color: colors.text,
    marginBottom: 8,
  },
  author: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...type.heading,
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    ...type.body,
    color: colors.textMuted,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  detailItem: {
    flex: 1,
    minWidth: '33%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    ...type.label,
    color: colors.text,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {},
  categoryText: {
    ...type.caption,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    gap: 12,
  },
  previewButton: {
    flex: 1,
  },
  infoButton: {
    flex: 1,
  },
  buttonText: {
    ...type.label,
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
    marginTop: 12,
    color: colors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    ...type.body,
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    ...type.label,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    ...type.heading,
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  searchInput: {
    marginBottom: 16,
  },
  followersList: {
    maxHeight: 400,
  },
  followersContent: {
    paddingBottom: 20,
  },
  followerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  followerItemSharing: {
    opacity: 0.7,
  },
  followerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    ...type.label,
    color: colors.text,
    marginBottom: 2,
  },
  followerUsername: {
    ...type.caption,
    color: colors.textMuted,
  },
  loadingFollowers: {
    padding: 20,
    alignItems: 'center',
  },
  loadingFollowersText: {
    ...type.caption,
    color: colors.text,
    marginTop: 8,
  },
  emptyFollowers: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFollowersText: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: colors.available,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  toastError: {
    backgroundColor: colors.danger,
  },
  toastText: {
    ...type.label,
    color: colors.text,
  },
});
