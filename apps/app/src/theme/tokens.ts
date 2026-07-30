export const palette = {
  forest: '#24513F',
  forestSoft: '#E8EFEC',
  ink: '#17201C',
  muted: '#66716C',
  white: '#FFFFFF',
};

export const lightColors = {
  background: '#F7F8F7',
  surface: palette.white,
  surfaceMuted: '#F0F3F1',
  text: palette.ink,
  textMuted: palette.muted,
  border: '#DDE3E0',
  primary: palette.forest,
  primarySoft: palette.forestSoft,
  tint: palette.forest,
};

export type AppColors = typeof lightColors;

export const typography = {
  display: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  screenTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  overline: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
} as const;
