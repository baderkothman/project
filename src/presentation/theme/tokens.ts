export const colors = {
  background: '#071D2A',
  surface: '#102E3D',
  surfaceRaised: '#173C4C',
  border: '#2C5869',
  text: '#F7FAFC',
  textMuted: '#BCD0D8',
  primary: '#F4A340',
  primaryPressed: '#D98520',
  onPrimary: '#1F1405',
  info: '#69C5DD',
  success: '#5EC78A',
  danger: '#FF7B72',
  overlay: 'rgba(0, 0, 0, 0.56)',
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

