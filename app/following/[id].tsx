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
import { ArrowLeft, UserMinus } from 'lucide-react-native';
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

export default function FollowingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchFollowing();
    }
  }, [id]);

  const fetchFollowing = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await dataClient
        .rpc('get_following_profiles', { uid: id });

      if (fetchError) throw fetchError;

      setFollowing(data || []);
    } catch (err) {
      console.error('Error fetching following:', err);
      setError('Failed to load following. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (profileId: string) => {
    try {
      const { error } = await dataClient
        .from('followers')
        .delete()
        .eq('follower_id', session?.user?.id)
        .eq('following_id', profileId);

      if (error) throw error;

      setFollowing(prev => prev.filter(profile => profile.id !== profileId));
    } catch (err) {
      console.error('Error unfollowing user:', err);
    }
  };

  const renderFollowing = ({ item }: { item: Profile }) => {
    const isCurrentUser = item.id === session?.user?.id;

    return (
      <View style={styles.followingCard}>
        <TouchableOpacity
          style={styles.followingContent}
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
          <View style={styles.followingInfo}>
            <Text style={styles.name}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>

        {!isCurrentUser && session?.user?.id && (
          <TouchableOpacity
            style={styles.unfollowButton}
            onPress={() => handleUnfollow(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Unfollow ${item.first_name} ${item.last_name}`}
          >
            <UserMinus size={20} color={colors.text} />
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
        <Text style={styles.title}>Following</Text>
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
          <Text style={styles.loadingText}>Loading following...</Text>
        </View>
      ) : (
        <FlatList
          data={following}
          renderItem={renderFollowing}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.followingList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Not following anyone yet</Text>
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
  followingList: {
    padding: 16,
  },
  followingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
  },
  followingContent: {
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
  followingInfo: {
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
  unfollowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
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