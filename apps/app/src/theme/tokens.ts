import { pretendard } from '@/src/theme/typography';

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
    ...pretendard(700),
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.45,
  },
  screenTitle: {
    ...pretendard(600),
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    ...pretendard(600),
    fontSize: 16,
    lineHeight: 22,
  },
  itemTitle: {
    ...pretendard(500),
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    ...pretendard(400),
    fontSize: 15,
    lineHeight: 23,
  },
  label: {
    ...pretendard(600),
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    ...pretendard(600),
    fontSize: 15,
    lineHeight: 20,
  },
  caption: {
    ...pretendard(500),
    fontSize: 12,
    lineHeight: 17,
  },
  overline: {
    ...pretendard(600),
    fontSize: 11,
    lineHeight: 15,
  },
} as const;
