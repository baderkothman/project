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
import { Stack, useLocalSearchParams, Link, useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import React from 'react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export default function FollowersScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      fetchFollowers();
    }
  }, [id]);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_follower_profiles', { uid: id });

      if (fetchError) throw fetchError;

      setFollowers(data || []);

      // Get following status for each follower
      if (session?.user?.id) {
        const followingStatus: Record<string, boolean> = {};
        for (const follower of data || []) {
          const { data: isFollowing } = await supabase
            .from('followers')
            .select('id')
            .eq('follower_id', session.user.id)
            .eq('following_id', follower.id)
            .maybeSingle();
          
          followingStatus[follower.id] = !!isFollowing;
        }
        setFollowingMap(followingStatus);
      }
    } catch (err) {
      console.error('Error fetching followers:', err);
      setError('Failed to load followers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (profileId: string) => {
    if (!session?.user?.id) {
      router.push('/login');
      return;
    }

    try {
      const isFollowing = followingMap[profileId];

      if (isFollowing) {
        const { error } = await supabase
          .from('followers')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', profileId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('followers')
          .insert({
            follower_id: session.user.id,
            following_id: profileId
          });

        if (error) throw error;
      }

      setFollowingMap(prev => ({
        ...prev,
        [profileId]: !isFollowing
      }));
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const renderFollower = ({ item }: { item: Profile }) => {
    const isFollowing = followingMap[item.id];
    const isCurrentUser = item.id === session?.user?.id;

    return (
      <View style={styles.followerCard}>
        <TouchableOpacity
          style={styles.followerContent}
          onPress={() => router.push(`/profile/${item.id}`)}
        >
          <Image
            source={{ 
              uri: item.avatar_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=400&q=80'
            }}
            style={styles.avatar}
          />
          <View style={styles.followerInfo}>
            <Text style={styles.name}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>

        {!isCurrentUser && session?.user?.id && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton
            ]}
            onPress={() => toggleFollow(item.id)}
          >
            {isFollowing ? (
              <UserMinus size={20} color="#FBF3F2" />
            ) : (
              <UserPlus size={20} color="#FBF3F2" />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity style={styles.backButton}>
            <ArrowLeft size={24} color="#FBF3F2" />
          </TouchableOpacity>
        </Link>
        <Text style={styles.title}>Followers</Text>
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
          <Text style={styles.loadingText}>Loading followers...</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderFollower}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.followersList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No followers yet</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
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
  followersList: {
    padding: 16,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C768F',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  followerContent: {
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
  followerInfo: {
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
  },
});