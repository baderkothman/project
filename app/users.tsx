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
import { colors, spacing, radius, type } from '@/src/presentation/theme/tokens';
import { Card, Button, EmptyState, ScreenHeader } from '@/src/presentation/components/ui';

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
    <Card style={styles.userCard}>
      <View style={styles.userRow}>
        <TouchableOpacity
          style={styles.userContent}
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
          <View style={styles.userInfo}>
            <Text style={styles.name}>
              {item.first_name} {item.last_name}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </TouchableOpacity>

        <Button
          label={followingMap[item.id] ? 'Unfollow' : 'Follow'}
          onPress={() => toggleFollow(item.id)}
          variant={followingMap[item.id] ? 'secondary' : 'primary'}
          icon={
            followingMap[item.id] ? (
              <UserMinus size={18} color={colors.text} />
            ) : (
              <UserPlus size={18} color={colors.onPrimary} />
            )
          }
          style={styles.followButton}
          accessibilityLabel={followingMap[item.id] ? `Unfollow ${item.first_name} ${item.last_name}` : `Follow ${item.first_name} ${item.last_name}`}
        />
      </View>
    </Card>
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
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <ScreenHeader title="Search Results" />
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
          <Text style={styles.loadingText}>Searching users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.usersList}
          ListEmptyComponent={
            <EmptyState title={`No users found for "${searchQuery}"`} />
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
    paddingTop: Platform.select({
      ios: 60,
      android: 40,
      default: 20
    }),
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
  usersList: {
    padding: spacing.md,
  },
  userCard: {
    marginBottom: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userInfo: {
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
