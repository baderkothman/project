import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '@/src/presentation/theme/tokens';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}

// Section/screen title in the display face, with an optional monospace
// eyebrow above it — the catalog-card label that precedes a book's title.
export function ScreenHeader({ eyebrow, title, action }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  textBlock: { flex: 1 },
  eyebrow: { ...type.eyebrow, color: colors.foil, marginBottom: spacing.xxs },
  title: { ...type.heading, color: colors.text },
});
