import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { colors, spacing, type } from '@/src/presentation/theme/tokens';
import { EmptyState } from '@/src/presentation/components/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <EmptyState
          title="This screen doesn't exist."
          action={
            <Link href="/">
              <Text style={styles.link}>Go to home screen!</Text>
            </Link>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  link: {
    ...type.label,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});
