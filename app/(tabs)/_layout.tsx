import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Book, MessageSquare, User, Plus, Heart, Settings } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  const { session, isGuest } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FA991C',
        tabBarInactiveTintColor: '#FBF3F2',
        tabBarStyle: {
          backgroundColor: '#032539',
          borderTopWidth: 1,
          borderTopColor: '#1C768F',
        },
        headerStyle: {
          backgroundColor: '#032539',
        },
        headerTitleStyle: {
          color: '#FBF3F2',
          fontSize: 20,
          fontWeight: 'bold',
        },
        headerTintColor: '#FBF3F2',
        headerRight: () => (
          <View style={styles.headerRight}>
            {!isGuest ? (
              <View style={styles.headerButtons}>
                <Link href="/wishlist" asChild>
                  <TouchableOpacity style={styles.iconButton}>
                    <Heart size={20} color="#FA991C" />
                  </TouchableOpacity>
                </Link>
                <Link href="/settings" asChild>
                  <TouchableOpacity style={styles.iconButton}>
                    <Settings size={20} color="#FA991C" />
                  </TouchableOpacity>
                </Link>
              </View>
            ) : (
              <View style={styles.authButtons}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity style={[styles.iconButton, styles.emptyProfileButton]}>
                    <User size={25} color="#FA991C" />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FBF3F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FA991C',
  },
  emptyProfileButton: {
    backgroundColor: '#FBF3F2',
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