// app/users.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react-native';
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';

interface User {
  id: string;
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
}

export default function UsersScreen() {
  const router = useRouter();
  const { q: searchQuery } = useLocalSearchParams();
  const { session } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    searchUsers();
  }, [searchQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = dataClient
        .from<User>('profiles')
        .select('id, username, avatar_url, first_name, last_name')
        .ilike('username', `%${searchQuery}%`)
        .order('username');

      // Only filter out current user if we have a valid session
      if (session?.user?.id) {
        query = query.neq('id', session.user.id);
      }

      const { data: users, error: searchError } = await query;

      if (searchError) throw searchError;
      const userRows = (users || []) as User[];

      if (session?.user?.id) {
        const { data: following } = await dataClient
          .from<{ following_id: string }>('followers')
          .select('following_id')
          .eq('follower_id', session.user.id);

        const followingRows = (following || []) as { following_id: string }[];
        const followingIds = new Set(followingRows.map((f) => f.following_id));
        setFollowingMap(
          userRows.reduce((acc: Record<string, boolean>, user: User) => ({
            ...acc,
            [user.id]: followingIds.has(user.id)
          }), {})
        );
      }

      setUsers(userRows);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (userId: string) => {
    try {
      const isFollowing = followingMap[userId];

      if (isFollowing) {
        await dataClient
          .from('followers')
          .delete()
          .eq('follower_id', session?.user?.id)
          .eq('following_id', userId);
      } else {
        await dataClient
          .from('followers')
          .insert({
            follower_id: session?.user?.id,
            following_id: userId
          });
      }

      setFollowingMap(prev => ({
        ...prev,
        [userId]: !isFollowing
      }));
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <TouchableOpacity 
        style={styles.userContent}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <Image
          source={{ 
            uri: item.avatar_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=400&q=80'
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.name}>
            {item.first_name} {item.last_name}
          </Text>
          <Text style={styles.username}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.followButton,
          followingMap[item.id] && styles.followingButton
        ]}
        onPress={() => toggleFollow(item.id)}
      >
        {followingMap[item.id] ? (
          <UserMinus size={20} color="#FBF3F2" />
        ) : (
          <UserPlus size={20} color="#FBF3F2" />
        )}
      </TouchableOpacity>
    </View>
  );

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
        >
          <ArrowLeft size={24} color="#FBF3F2" />
        </TouchableOpacity>
        <Text style={styles.title}>Search Results</Text>
        <View style={styles.placeholder} />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FA991C" />
          <Text style={styles.loadingText}>Searching users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No users found for "{searchQuery}"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
      default: 20
    }),
    paddingBottom: 16,
    backgroundColor: '#032539',
    borderBottomWidth: 1,
    borderBottomColor: '#1C768F',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C768F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FBF3F2',
  },
  placeholder: {
    width: 40,
  },
  usersList: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C768F',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userContent: {
    flex: 1,
    flexDirection: 'row',
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
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBF3F2',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#FBF3F2',
    opacity: 0.7,
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FA991C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#1C768F',
    borderWidth: 2,
    borderColor: '#FA991C',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});
