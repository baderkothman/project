// "The Ledger" — a design system grounded in the physical object being
// traded: cloth-bound covers, manila card-catalog stock, and the ink
// due-date stamp glued in the back of a library book.

export const colors = {
  // Cloth: the dark, primary surface (a hardcover binding)
  background: '#16302A',
  surface: '#1E4038',
  surfaceRaised: '#25493F',
  border: '#3C5A4E',

  // Paper: text sitting on cloth
  text: '#F4ECD8',
  textMuted: '#AEC0B4',

  // Kraft: manila card stock, for chips / inputs / light accents
  kraft: '#E7DAB9',
  kraftMuted: '#D7C7A0',
  ink: '#211A10',
  inkMuted: '#5B4E38',

  // Stamp: the rubber due-date-stamp red — primary action color
  primary: '#A23E48',
  primaryPressed: '#82323A',
  onPrimary: '#F4ECD8',

  // Foil: sparing gold accent (ratings, foil-stamped detail)
  foil: '#C8A24A',

  info: '#7FA8B8',
  success: '#5C8A63',
  danger: '#B23A2E',
  overlay: 'rgba(11, 22, 19, 0.72)',
  disabled: '#5B6B62',
  onDark: '#F4ECD8',
  badgeBackground: '#0F231D',
  warningBackground: '#3A2E17',
  available: '#5C8A63',
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

// Three registers, used deliberately rather than interchangeably:
// display carries real titles, body carries reading copy, mono carries
// the catalog-card metadata (labels, prices, dates, tags, eyebrows).
export const fontFamily = {
  display: 'RobotoSlab-Bold',
  displaySemibold: 'RobotoSlab-SemiBold',
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodyBold: 'Inter-Bold',
  mono: 'SpaceMono-Regular',
  monoBold: 'SpaceMono-Bold',
} as const;

export const type = {
  title: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fontFamily.displaySemibold, fontSize: 21, lineHeight: 27 },
  body: { fontFamily: fontFamily.body, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bodyBold, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: fontFamily.bodyMedium, fontSize: 15, lineHeight: 20 },
  // Catalog-card register: uppercase, tracked-out, monospaced metadata.
  eyebrow: {
    fontFamily: fontFamily.monoBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  caption: { fontFamily: fontFamily.mono, fontSize: 13, lineHeight: 18 },
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

// The signature motif: a rotated, ink-bordered pill standing in for a
// library due-date stamp. Used for condition/status and confirmations.
export const stamp = {
  rotation: '-3deg',
  borderWidth: 1.5,
} as const;
