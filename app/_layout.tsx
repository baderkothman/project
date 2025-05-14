import { useEffect, Suspense, lazy } from 'react';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useCachedResources } from '@/hooks/useCachedResources';
import React from 'react';
// Loading component for Suspense fallback
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FA991C" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const isLoadingComplete = useCachedResources();

  if (!isLoadingComplete) {
    return <LoadingScreen />;
  }

  return (
    <CartProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: {
              backgroundColor: '#032539'
            },
            animation: 'fade'
          }}
        >
          {loading ? null : (
            <>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
              <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
              <Stack.Screen 
                name="(auth)" 
                options={{ 
                  headerShown: false,
                  presentation: 'modal',
                  animation: 'fade'
                }} 
              />
            </>
          )}
        </Stack>
      </Suspense>
    </CartProvider>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="light" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#032539',
  },
  loadingText: {
    marginTop: 12,
    color: '#FBF3F2',
    fontSize: 16,
  },
});