import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageSquare, UserPlus, UserMinus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

interface ChatPreview {
  id: string;
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  content: string;
  created_at: string;
  unread_count: number;
  other_user_id: string;
}

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  is_following?: boolean;
}

export default function ChatScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (session?.user?.id) {
      loadChats();
      const subscription = subscribeToMessages();
      const chatSubscription = subscribeToChatUpdates();

      return () => {
        subscription.unsubscribe();
        chatSubscription.unsubscribe();
      };
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [searchQuery]);

  const loadChats = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc('get_recent_chats');

      if (error) {
        console.error('Error loading chats:', error);
        setError('Failed to load chats. Please check your connection and try again.');
        return;
      }

      setChats(data || []);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${session?.user?.id},recipient_id.eq.${session?.user?.id}),and(sender_id.eq.${session?.user?.id},recipient_id.eq.${session?.user?.id}))`,
        },
        (payload) => {
          const newMessage = payload.new;
          setChats(currentChats => {
            const updatedChats = [...currentChats];
            const chatIndex = updatedChats.findIndex(chat => 
              chat.other_user_id === (newMessage.sender_id === session?.user?.id ? newMessage.recipient_id : newMessage.sender_id)
            );

            if (chatIndex !== -1) {
              updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                content: newMessage.content,
                created_at: newMessage.created_at,
                unread_count: newMessage.sender_id === session?.user?.id ? 0 : updatedChats[chatIndex].unread_count + 1
              };
              const [chat] = updatedChats.splice(chatIndex, 1);
              updatedChats.unshift(chat);
            }
            return updatedChats;
          });
        }
      )
      .subscribe();
  };

  const subscribeToChatUpdates = () => {
    return supabase
      .channel('chat_read_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id.eq.${session?.user?.id}`,
        },
        () => {
          loadChats();
        }
      )
      .subscribe();
  };

  const markMessagesAsRead = async (senderId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('recipient_id', session?.user?.id)
        .eq('sender_id', senderId)
        .eq('read', false);

      if (error) throw error;

      setChats(currentChats => 
        currentChats.map(chat => 
          chat.other_user_id === senderId 
            ? { ...chat, unread_count: 0 }
            : chat
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const searchUsers = async () => {
    try {
      setSearching(true);
      setError(null);

      const { data: users, error: searchError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, first_name, last_name')
        .neq('id', session?.user?.id)
        .ilike('username', `%${searchQuery}%`)
        .limit(5);

      if (searchError) throw searchError;

      if (!users) {
        setSearchResults([]);
        return;
      }

      const { data: following, error: followError } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', session?.user?.id);

      if (followError) throw followError;

      const followingIds = new Set((following || []).map(f => f.following_id));

      const resultsWithFollowing = users.map(user => ({
        ...user,
        is_following: followingIds.has(user.id)
      }));

      setSearchResults(resultsWithFollowing);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const toggleFollow = async (userId: string) => {
    try {
      setFollowLoading(prev => ({ ...prev, [userId]: true }));
      
      const isFollowing = searchResults.find(r => r.id === userId)?.is_following;

      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', session?.user?.id)
          .eq('following_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: session?.user?.id,
            following_id: userId
          });

        if (error) throw error;
      }

      setSearchResults(prev =>
        prev.map(result =>
          result.id === userId
            ? { ...result, is_following: !isFollowing }
            : result
        )
      );
    } catch (err) {
      console.error('Error toggling follow:', err);
      setError('Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleChatPress = (userId: string) => {
    markMessagesAsRead(userId);
    router.push(`/chat/${userId}`);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <View style={styles.searchResult}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <Image
          source={{ uri: item.avatar_url }}
          style={styles.searchAvatar}
        />
        <View style={styles.searchUserInfo}>
          <Text style={styles.searchName}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.searchUsername}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.followButton,
            item.is_following && styles.followingButton,
            followLoading[item.id] && styles.buttonDisabled
          ]}
          onPress={() => toggleFollow(item.id)}
          disabled={followLoading[item.id]}
        >
          {followLoading[item.id] ? (
            <ActivityIndicator size="small" color="#FBF3F2" />
          ) : (
            <>
              {item.is_following ? (
                <UserMinus size={16} color="#FBF3F2" />
              ) : (
                <UserPlus size={16} color="#FBF3F2" />
              )}
              <Text style={styles.followButtonText}>
                {item.is_following ? 'Following' : 'Follow'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => router.push(`/chat/${item.id}`)}
        >
          <MessageSquare size={20} color="#FA991C" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderChat = ({ item }: { item: ChatPreview }) => {
    const displayName = `${item.first_name} ${item.last_name}`.trim() || item.username;

    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => handleChatPress(item.other_user_id)}
      >
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.messageTime}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          <View style={styles.messagePreview}>
            <Text 
              style={[
                styles.messageText,
                item.unread_count > 0 && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {item.content || 'Start the conversation...'}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FA991C" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#1C768F" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users to message..."
            placeholderTextColor="#1C768F"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {searchQuery ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResults}
          ListEmptyComponent={
            !searching ? (
              <Text style={styles.emptyText}>No users found</Text>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Search for users above to start a conversation
              </Text>
            </View>
          }
        />
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FBF3F2',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#FBF3F2',
    opacity: 0.8,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  searchResults: {
    padding: 16,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C768F',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FA991C',
  },
  searchUserInfo: {
    flex: 1,
  },
  searchName: {
    fontSize: 16,
    color: '#FBF3F2',
    fontWeight: '500',
  },
  searchUsername: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.7,
  },
  chatList: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#1C768F',
    borderRadius: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FA991C',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBF3F2',
  },
  messageTime: {
    fontSize: 12,
    color: '#FBF3F2',
    opacity: 0.7,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageText: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.8,
    flex: 1,
    marginRight: 8,
  },
  unreadMessage: {
    color: '#FBF3F2',
    fontWeight: '500',
    opacity: 1,
  },
  unreadBadge: {
    backgroundColor: '#FA991C',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#032539',
    fontSize: 12,
    fontWeight: 'bold',
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
    padding: 16,
    backgroundColor: '#FA991C',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#032539',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#FBF3F2',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FA991C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  followingButton: {
    backgroundColor: '#1C768F',
    borderWidth: 1,
    borderColor: '#FA991C',
  },
  followButtonText: {
    color: '#FBF3F2',
    fontSize: 14,
    fontWeight: '500',
  },
  messageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C768F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});