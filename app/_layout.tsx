import { Suspense } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useFrameworkReady } from '@/src/presentation/hooks/useFrameworkReady';
import { CartProvider } from '@/src/presentation/providers/CartProvider';
import { AuthProvider } from '@/src/presentation/providers/AuthProvider';
import { useCachedResources } from '@/src/presentation/hooks/useCachedResources';
import { colors, spacing, type } from '@/src/presentation/theme/tokens';
import React from 'react';
// Loading component for Suspense fallback
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function RootLayoutNav() {
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
              backgroundColor: colors.background
            },
            animation: 'fade'
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
          <Stack.Screen
            name="(auth)"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'fade'
            }}
          />
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
    backgroundColor: colors.background,
  },
  loadingText: {
    ...type.body,
    marginTop: spacing.sm,
    color: colors.text,
  },
});
