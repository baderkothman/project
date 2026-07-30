import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter, Link } from 'expo-router';
import { Send, ArrowLeft, Info } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

interface ChatItem {
  id: string;
  content: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  item_type: 'message' | 'shared_book';
  book_data?: {
    book_id: string;
    title: string;
    image: string;
    preview_link: string;
  };
}

interface UserProfile {
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
}

// Separate component for animated chat items
function AnimatedChatItem({ item, isUserItem, handleBookPreview }: {
  item: ChatItem;
  isUserItem: boolean;
  handleBookPreview: (link: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  if (item.item_type === 'shared_book' && item.book_data) {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={[
            styles.sharedBookCard,
            isUserItem ? styles.userSharedBook : styles.otherSharedBook
          ]}
          onPress={() => handleBookPreview(item.book_data!.book_id)}
          accessibilityRole="button"
          accessibilityLabel={`Open shared book ${item.book_data.title}`}
        >
          <View style={styles.sharedBookContent}>
            <Image
              source={{ uri: item.book_data.image }}
              style={styles.sharedBookImage}
              resizeMode="cover"
            />
            <View style={styles.sharedBookInfo}>
              <Text style={styles.sharedBookTitle} numberOfLines={2}>
                {item.book_data.title}
              </Text>
              <View style={styles.sharedBookAction}>
                <Text style={[
                  styles.sharedBookActionText,
                  isUserItem ? styles.userSharedBookText : styles.otherSharedBookText
                ]}>
                  View Book
                </Text>
              </View>
            </View>
          </View>
          <Text style={[
            styles.timestamp,
            isUserItem ? styles.userTimestamp : styles.otherTimestamp
          ]}>
            {new Date(item.created_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
            })}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={[
        styles.messageContainer,
        isUserItem ? styles.userMessage : styles.otherMessage
      ]}>
        <Text style={[
          styles.messageText,
          isUserItem ? styles.userMessageText : styles.otherMessageText
        ]}>{item.content}</Text>
        <Text style={[
          styles.timestamp,
          isUserItem ? styles.userTimestamp : styles.otherTimestamp
        ]}>
          {new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ChatDetail() {
  const { id: recipientId } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastTimestamp, setLastTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id && recipientId) {
      loadChatItems();
      loadUserProfile();
      const subscription = subscribeToUpdates();
      const chatSubscription = subscribeToChatUpdates();

      // Add Presence Tracking here
      const presenceChannel = dataClient.channel(`presence:${session?.user?.id}-${recipientId}`, {
        config: {
          presence: {
            key: session?.user?.id
          }
        }
      });

      presenceChannel.on('presence', { event: 'sync' }, () => {
        console.log('Online users:', presenceChannel.presenceState());
      });

      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            user_id: session?.user?.id,
            typing: false // You can add typing status here later
          });
        }
      });

      return () => {
        subscription.unsubscribe();
        chatSubscription.unsubscribe();
        presenceChannel.unsubscribe(); // Clean up presence channel too
      };
    }
  }, [session?.user?.id, recipientId]);

  const loadChatItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dataClient.rpc(
        'get_chat_items',
        {
          chat_user_id: session?.user?.id,
          other_user_id: recipientId,
          page_size: 50,
          last_timestamp: lastTimestamp || null
        }
      );

      if (fetchError) throw fetchError;

      if (data) {
        setChatItems(data);
        setHasMore(data.length === 50);
        if (data.length > 0) {
          setLastTimestamp(data[data.length - 1].created_at);
        }
      }
    } catch (err) {
      console.error('Error loading chat items:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await dataClient
        .from('profiles')
        .select('username, avatar_url, first_name, last_name')
        .eq('id', recipientId)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.error('Error loading user profile:', err);
    }
  };

  const subscribeToUpdates = () => {
    const channel = dataClient
      .channel(`chat:${session?.user?.id}-${recipientId}`) // Unique channel name
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${session?.user?.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${session?.user?.id}))`
        },
        (payload) => {
          const newMessage = payload.new;
          setChatItems(prev => {
            // Check if message already exists
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (!exists) {
              // Add new message to the bottom
              return [...prev, {
                ...newMessage,
                item_type: 'message'
              } as ChatItem];
            }
            return prev;
          });

          // Scroll to bottom if it's a new message from this chat
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          });
        }
      )
      .subscribe();

    return channel;
  };

  const subscribeToChatUpdates = () => {
    return dataClient
      .channel('shared_books_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shared_books',
          filter: `or(sender_id.eq.${session?.user?.id},recipient_id.eq.${session?.user?.id})`
        },
        (payload) => {
          const sharedBook = payload.new;
          if (sharedBook.sender_id === recipientId || sharedBook.recipient_id === recipientId) {
            setChatItems(prev => {
              const existingItem = prev.find(item =>
                item.item_type === 'shared_book' &&
                item.book_data?.book_id === sharedBook.book_id
              );
              if (!existingItem) {
                return [...prev, {
                  id: sharedBook.id,
                  sender_id: sharedBook.sender_id,
                  recipient_id: sharedBook.recipient_id,
                  created_at: sharedBook.created_at,
                  item_type: 'shared_book',
                  content: '',
                  book_data: {
                    book_id: sharedBook.book_id,
                    title: sharedBook.title,
                    image: sharedBook.image || '',
                    preview_link: sharedBook.preview_link || ''
                  }
                } as ChatItem];
              }
              return prev;
            });

            requestAnimationFrame(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            });
          }
        }
      )
      .subscribe();
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatItem = {
      id: tempId,
      content: newMessage.trim(),
      sender_id: session?.user?.id!,
      recipient_id: recipientId as string,
      created_at: new Date().toISOString(),
      item_type: 'message'
    };

    // Add to UI immediately
    setChatItems(prev => [...prev, tempMessage]);
    setNewMessage('');

    // Scroll to bottom
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    try {
      // Send to server
      const { data, error } = await dataClient
        .from('messages')
        .insert({
          sender_id: session?.user?.id,
          recipient_id: recipientId,
          content: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temporary message with real one
      setChatItems(prev =>
        prev.map(msg => msg.id === tempId ? {
          ...msg,
          id: data.id // Replace temp ID with real ID
        } : msg)
      );

    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setChatItems(prev => prev.filter(msg => msg.id !== tempId));
      setError('Failed to send message');
    }
  };

  const handleBookPreview = (previewLinkOrId: string) => {
    router.push(`/book/${previewLinkOrId}`);
  };

  const handleUserPress = () => {
    router.push(`/profile/${recipientId}`);
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const isUserItem = item.sender_id === session?.user?.id;
    return (
      <AnimatedChatItem
        item={item}
        isUserItem={isUserItem}
        handleBookPreview={handleBookPreview}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  const displayName = userProfile ?
    `${userProfile.first_name} ${userProfile.last_name}`.trim() || userProfile.username :
    'Loading...';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.userBar}>
        <Link href="/(tabs)/chat" asChild>
          <TouchableOpacity style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={handleUserPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${displayName}'s profile`}
        >
          <Text style={styles.userName}>{displayName}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowUserInfo(!showUserInfo)}
          accessibilityRole="button"
          accessibilityLabel="Toggle user info"
          accessibilityState={{ expanded: showUserInfo }}
        >
          <Info size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {showUserInfo && (
        <TouchableOpacity
          style={styles.userInfoPanel}
          onPress={handleUserPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${displayName}'s profile`}
        >
          <Image
            source={{
              uri: userProfile?.avatar_url ||
                'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=400&q=80'
            }}
            style={styles.userAvatar}
          />
          <Text style={styles.userFullName}>
            {userProfile?.first_name} {userProfile?.last_name}
          </Text>
          <Text style={styles.userUsername}>@{userProfile?.username}</Text>
        </TouchableOpacity>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={chatItems}
        renderItem={renderChatItem}
        keyExtractor={(item) => `${item.item_type}-${item.id}`}
        contentContainerStyle={[
          styles.messagesList,
          { flexGrow: 1, justifyContent: 'flex-end' }
        ]}
        onEndReached={async () => {
          if (hasMore && !loadingMore && lastTimestamp) {
            setLoadingMore(true);
            await loadChatItems();
            setLoadingMore(false);
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
        onLayout={() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.surface}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !newMessage.trim() && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !newMessage.trim() }}
        >
          <Send size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    padding: 8,
  },
  userName: {
    color: colors.text,
    fontSize: fontSizes[18],
    fontWeight: '600',
  },
  infoButton: {
    padding: 8,
  },
  userInfoPanel: {
    backgroundColor: colors.surface,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  userFullName: {
    color: colors.text,
    fontSize: fontSizes[20],
    fontWeight: '600',
    marginBottom: 4,
  },
  userUsername: {
    color: colors.text,
    fontSize: fontSizes[16],
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes[16],
    color: colors.text,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 12,
    backgroundColor: colors.primary,
    margin: 12,
    borderRadius: 8,
  },
  errorText: {
    color: colors.background,
    fontSize: fontSizes[14],
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: fontSizes[16],
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.background,
  },
  otherMessageText: {
    color: colors.text,
  },
  timestamp: {
    fontSize: fontSizes[12],
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: colors.background,
    opacity: 0.8,
  },
  otherTimestamp: {
    color: colors.text,
    opacity: 0.7,
  },
  sharedBookCard: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userSharedBook: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  otherSharedBook: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  sharedBookContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedBookImage: {
    width: 60,
    height: 90,
    borderRadius: 8,
  },
  sharedBookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sharedBookTitle: {
    fontSize: fontSizes[14],
    fontWeight: '600',
    marginBottom: 8,
  },
  userSharedBookText: {
    color: colors.background,
  },
  otherSharedBookText: {
    color: colors.text,
  },
  sharedBookAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sharedBookActionText: {
    fontSize: fontSizes[14],
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    color: colors.background,
    fontSize: fontSizes[16],
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  }
});
