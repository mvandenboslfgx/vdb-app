export const colors = {
  backgroundPrimary: '#050505',
  backgroundSecondary: '#0D0D0F',
  surfacePrimary: '#121214',
  surfaceSecondary: '#171719',
  surfaceElevated: '#1A1A1D',
  textPrimary: '#F5F5F3',
  textSecondary: '#A5A5A8',
  textMuted: '#7F7F84',
  borderSubtle: '#262629',
  borderStrong: '#3A3A3E',
  champagneGold: '#C7A66A',
  champagneGoldLight: '#E0C38A',
  champagneGoldDim: '#A98B56',
  champagneSoft: '#A98B56',
  tabBarBackground: '#080809',
  tabBarBorder: '#202023',
  success: '#3D9B6E',
  successMuted: '#1F3D2E',
  warning: '#D4A017',
  warningMuted: '#3D3210',
  error: '#D64545',
  errorMuted: '#3D1A1A',
  info: '#4A8FBF',
  infoMuted: '#1A2E3D',
  overlay: 'rgba(5, 5, 5, 0.72)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    mono: 'SpaceMono',
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    /** Refined page greeting — not oversized display */
    greeting: 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const shadows = {
  none: {
    shadowColor: colors.transparent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const motion = {
  fast: 150,
  normal: 220,
  slow: 320,
} as const;

export const hitSlop = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
  motion,
  hitSlop,
} as const;

export type Theme = typeof theme;
export type ThemeColors = typeof colors;
