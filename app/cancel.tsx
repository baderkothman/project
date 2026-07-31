import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { X } from 'lucide-react-native';
import React from 'react';
import { colors, spacing, type } from '@/src/presentation/theme/tokens';
import { Button, Card } from '@/src/presentation/components/ui';

export default function CancelScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.content}>
        <View style={styles.iconContainer}>
          <X size={48} color={colors.onDark} />
        </View>
        <Text style={styles.title}>Payment Cancelled</Text>
        <Text style={styles.message}>
          Your payment was cancelled. No charges have been made to your account.
        </Text>
        <Link href="/(tabs)" asChild>
          <Button label="Return to Home" onPress={() => {}} accessibilityLabel="Return to home" />
        </Link>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...type.heading,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
