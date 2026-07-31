import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, radius, spacing, touchTarget, type } from '@/src/presentation/theme/tokens';

interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
}

export function Input({ icon, style, ...rest }: InputProps) {
  return (
    <View style={styles.container}>
      {icon}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.minHeight,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.text,
  },
});
