import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Book, MessageSquare, User, Plus, Heart, Settings } from 'lucide-react-native';
import { useAuth } from '@/src/presentation/providers/AuthProvider';
import { Link } from 'expo-router';
import { colors, touchTarget, type } from '@/src/presentation/theme/tokens';
import React from 'react';

export default function TabLayout() {
  const { isGuest } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          minHeight: 64,
        },
        tabBarLabelStyle: type.caption,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          color: colors.text,
          ...type.heading,
        },
        headerTintColor: colors.text,
        headerRight: () => (
          <View style={styles.headerRight}>
            {!isGuest ? (
              <View style={styles.headerButtons}>
                <Link href="/wishlist" asChild>
                  <TouchableOpacity
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel="Open wishlist"
                  >
                    <Heart size={21} color={colors.primary} />
                  </TouchableOpacity>
                </Link>
                <Link href="/settings" asChild>
                  <TouchableOpacity
                    style={styles.iconButton}
                    accessibilityRole="button"
                    accessibilityLabel="Open settings"
                  >
                    <Settings size={21} color={colors.primary} />
                  </TouchableOpacity>
                </Link>
              </View>
            ) : (
              <View style={styles.authButtons}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity
                    style={StyleSheet.flatten([styles.iconButton, styles.emptyProfileButton])}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in"
                  >
                    <User size={24} color={colors.primary} />
                  </TouchableOpacity>
                </Link>
              </View>
            )}
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          tabBarIcon: ({ color, size }) => <Book size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => <Plus size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    ...touchTarget,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyProfileButton: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  authButtons: {
    flexDirection: 'row',
    gap: 8,
  },
});
