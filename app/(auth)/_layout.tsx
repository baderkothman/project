import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '@/src/presentation/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        presentation: 'modal',
        animation: 'fade',
        contentStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
