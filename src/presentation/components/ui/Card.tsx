import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/src/presentation/theme/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
}

// The card-catalog surface: cloth-raised block, hairline border, no shadow
// theatrics — the app leans on ink and paper, not drop shadows.
export function Card({ children, style, raised = true }: CardProps) {
  return (
    <View style={[styles.card, !raised && styles.flat, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  flat: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
  },
});
