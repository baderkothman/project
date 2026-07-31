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
      <Card style={styles.followingCard}>
        <View style={styles.followingRow}>
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
            <Button
              label="Unfollow"
              onPress={() => handleUnfollow(item.id)}
              variant="secondary"
              icon={<UserMinus size={18} color={colors.text} />}
              style={styles.unfollowButton}
              accessibilityLabel={`Unfollow ${item.first_name} ${item.last_name}`}
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
          <ScreenHeader title="Following" />
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
          <Text style={styles.loadingText}>Loading following...</Text>
        </View>
      ) : (
        <FlatList
          data={following}
          renderItem={renderFollowing}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.followingList}
          ListEmptyComponent={
            <EmptyState title="Not following anyone yet" />
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
  followingList: {
    padding: spacing.md,
  },
  followingCard: {
    marginBottom: spacing.sm,
  },
  followingRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  followingInfo: {
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
  unfollowButton: {
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
