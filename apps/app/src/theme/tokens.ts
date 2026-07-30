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
