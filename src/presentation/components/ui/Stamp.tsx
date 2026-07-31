import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing, stamp, type } from '@/src/presentation/theme/tokens';

type StampTone = 'stamp' | 'bookplate' | 'ink' | 'foil';

interface StampProps {
  children: string;
  tone?: StampTone;
  style?: ViewStyle;
}

const TONE_COLOR: Record<StampTone, string> = {
  stamp: colors.primary,
  bookplate: colors.success,
  ink: colors.textMuted,
  foil: colors.foil,
};

// The signature motif: a rotated, ink-bordered pill standing in for the
// due-date stamp glued in the back of a library book. Used for condition
// tags, availability state, and one-off confirmations.
export function Stamp({ children, tone = 'stamp', style }: StampProps) {
  const tint = TONE_COLOR[tone];
  return (
    <View style={[styles.stamp, { borderColor: tint }, style]}>
      <Text style={[styles.stampText, { color: tint }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: stamp.borderWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    transform: [{ rotate: stamp.rotation }],
  },
  stampText: {
    ...type.eyebrow,
  },
});
