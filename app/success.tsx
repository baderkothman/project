import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Check } from 'lucide-react-native';
import React from 'react';
import { colors, spacing, type } from '@/src/presentation/theme/tokens';
import { Button, Card, Stamp } from '@/src/presentation/components/ui';

export default function SuccessScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.content}>
        <View style={styles.iconContainer}>
          <Check size={48} color={colors.onPrimary} />
        </View>
        <Text style={styles.title}>Payment Successful!</Text>
        <View style={styles.stampWrap}>
          <Stamp tone="bookplate">Confirmed</Stamp>
        </View>
        <Text style={styles.message}>
          Thank you for your purchase. Your payment has been processed successfully.
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
    backgroundColor: colors.primary,
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
  stampWrap: {
    marginBottom: spacing.md,
  },
  message: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
