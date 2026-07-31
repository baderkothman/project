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
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Share2 } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { Modal, FlatList } from 'react-native';
import { Send } from 'lucide-react-native';
import { colors, fontFamily, fontSizes, type } from '@/src/presentation/theme/tokens';
import { Card, Input, Stamp } from '@/src/presentation/components/ui';


interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  language: string;
  condition: string;
  price: number;
  pages: number | null;
  isbn: string | null;
  location: string | null;
  images: string[];
  user_id: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  first_name: string;
  last_name: string;
  username: string;
}

export default function BookDetails() {
  const { id } = useLocalSearchParams();
  const { session, isGuest } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingWith, setSharingWith] = useState<string | null>(null);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [uploader, setUploader] = useState<Profile | null>(null);


  useEffect(() => {
    if (session?.user?.id && id) {
      fetchBookDetails();
    }
  }, [session?.user?.id, id]);

  const fetchUploader = async (userId: string) => {
    try {
      const { data, error } = await dataClient
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUploader(data);
    } catch (err) {
      console.error('Error fetching uploader:', err);
    }
  };

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dataClient
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (fetchError) throw fetchError;
      if (!data) throw new Error('Book not found');

      setBook(data);
      fetchUploader(data.user_id);
    } catch (err: any) {
      console.error('Error fetching book:', err?.message || err);
      setError(err?.message || 'Failed to load book details. Please try again.');
    } finally {
      setLoading(false);
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
          title: book.title,
          image: book.images?.[0] || '',
          preview_link: null,
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

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading book details...</Text>
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Book not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.text} />
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

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: book.images?.[0] || 'https://via.placeholder.com/400x600?text=No+Image' }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>${book.price.toFixed(2)}</Text>
            <Stamp tone="stamp">{book.condition.toUpperCase()}</Stamp>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this book</Text>
            <Text style={styles.description}>{book.description}</Text>
          </View>

          <Card style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Language</Text>
              <Text style={styles.detailValue}>{book.language}</Text>
            </View>
            {book.pages && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Pages</Text>
                <Text style={styles.detailValue}>{book.pages}</Text>
              </View>
            )}
            {book.isbn && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>ISBN</Text>
                <Text style={styles.detailValue}>{book.isbn}</Text>
              </View>
            )}{uploader && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Uploaded by</Text>
                <Text style={styles.uploaderName}>
                  {uploader.first_name} {uploader.last_name} (@{uploader.username})
                </Text>
              </View>
            )}
          </Card>

          {book.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.location}>{book.location}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  categoryBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 28,
    gap: 8,
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    height: 56,
    borderRadius: 28,
    gap: 8,
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
  location: {
    ...type.body,
    color: colors.textMuted,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  price: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSizes[24],
    color: colors.primary,
  },
  uploaderName: {
    ...type.body,
    color: colors.textMuted,
  },
});