import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '@/src/presentation/theme/tokens';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  title: { ...type.label, color: colors.text, textAlign: 'center', marginTop: spacing.xs },
  description: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
});
