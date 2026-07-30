export const colors = {
  background: '#032539',
  surface: '#1C768F',
  surfaceRaised: '#173C4C',
  border: '#2C5869',
  text: '#FBF3F2',
  textMuted: '#BCD0D8',
  primary: '#FA991C',
  primaryPressed: '#D98520',
  onPrimary: '#1F1405',
  info: '#69C5DD',
  success: '#5EC78A',
  danger: '#DC2626',
  overlay: 'rgba(0, 0, 0, 0.56)',
  disabled: '#666666',
  onDark: '#FFFFFF',
  badgeBackground: '#0D1B2A',
  warningBackground: '#FEF3C7',
  available: '#228B22',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
} as const;

export const touchTarget = {
  minHeight: 48,
  minWidth: 48,
} as const;

// Legacy screen-level font sizes, centralized so magic numbers aren't
// scattered across StyleSheet.create() calls. Prefer `type.*` for new code.
export const fontSizes = {
  12: 12,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  17: 17,
  18: 18,
  20: 20,
  22: 22,
  24: 24,
  28: 28,
  32: 32,
  48: 48,
} as const;

