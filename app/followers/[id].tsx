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
import { colors, spacing, radius, type } from '@/src/presentation/theme/tokens';
import { Card, Button, EmptyState, ScreenHeader } from '@/src/presentation/components/ui';

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
      <Card style={styles.followerCard}>
        <View style={styles.followerRow}>
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
            <Button
              label={isFollowing ? 'Unfollow' : 'Follow'}
              onPress={() => toggleFollow(item.id)}
              variant={isFollowing ? 'secondary' : 'primary'}
              icon={
                isFollowing ? (
                  <UserMinus size={18} color={colors.text} />
                ) : (
                  <UserPlus size={18} color={colors.onPrimary} />
                )
              }
              style={styles.followButton}
              accessibilityLabel={isFollowing ? `Unfollow ${item.first_name} ${item.last_name}` : `Follow ${item.first_name} ${item.last_name}`}
            />
          )}
        </View>
      </Card>
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
        <View style={styles.headerTitle}>
          <ScreenHeader title="Followers" />
        </View>
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
            <EmptyState title="No followers yet" />
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
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 40 : 20,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  followersList: {
    padding: spacing.md,
  },
  followerCard: {
    marginBottom: spacing.sm,
  },
  followerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  followerInfo: {
    flex: 1,
  },
  name: {
    ...type.label,
    color: colors.text,
    marginBottom: 2,
  },
  username: {
    ...type.caption,
    color: colors.textMuted,
  },
  followButton: {
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...type.body,
    marginTop: spacing.sm,
    color: colors.text,
  },
  errorContainer: {
    padding: spacing.md,
    backgroundColor: colors.danger,
    margin: spacing.md,
    borderRadius: radius.sm,
  },
  errorText: {
    ...type.caption,
    color: colors.onDark,
    textAlign: 'center',
  },
});
