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
import { dataClient } from '@/src/infrastructure/local-api/client';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import React from 'react';
import { colors, fontSizes } from '@/src/presentation/theme/tokens';

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

      const { data, error: fetchError } = await dataClient
        .rpc('get_follower_profiles', { uid: id });

      if (fetchError) throw fetchError;

      setFollowers(data || []);

      // Get following status for each follower
      if (session?.user?.id) {
        const followingStatus: Record<string, boolean> = {};
        for (const follower of data || []) {
          const { data: isFollowing } = await dataClient
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
        const { error } = await dataClient
          .from('followers')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', profileId);

        if (error) throw error;
      } else {
        const { error } = await dataClient
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
          accessibilityRole="button"
          accessibilityLabel={`View ${item.first_name} ${item.last_name}'s profile`}
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
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? `Unfollow ${item.first_name} ${item.last_name}` : `Follow ${item.first_name} ${item.last_name}`}
            accessibilityState={{ selected: isFollowing }}
          >
            {isFollowing ? (
              <UserMinus size={20} color={colors.text} />
            ) : (
              <UserPlus size={20} color={colors.text} />
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
          <TouchableOpacity style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={24} color={colors.text} />
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
          <ActivityIndicator size="large" color={colors.primary} />
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes[20],
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.surface,
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
    borderColor: colors.primary,
  },
  followerInfo: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes[16],
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  username: {
    fontSize: fontSizes[14],
    color: colors.text,
    opacity: 0.7,
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes[16],
    color: colors.text,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: colors.background,
    fontSize: fontSizes[14],
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes[16],
    color: colors.text,
    textAlign: 'center',
  },
});