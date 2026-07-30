export const palette = {
  forest: '#244D3F',
  forestSoft: '#DDE9E3',
  coral: '#EC725C',
  gold: '#ECAA3D',
  ivory: '#FBF7EE',
  ink: '#17201C',
  muted: '#69736E',
  white: '#FFFFFF',
  danger: '#C44343',
};

export const lightColors = {
  background: palette.ivory,
  surface: palette.white,
  surfaceMuted: '#F1EDE4',
  text: palette.ink,
  textMuted: palette.muted,
  border: '#E4DED2',
  primary: palette.forest,
  primarySoft: palette.forestSoft,
  tint: palette.coral,
};

export const darkColors = {
  background: '#111714',
  surface: '#1B2420',
  surfaceMuted: '#26302B',
  text: '#F5F3EC',
  textMuted: '#AEB9B3',
  border: '#35413B',
  primary: '#8BB9A2',
  primarySoft: '#293C33',
  tint: '#F08A76',
};

export type AppColors = typeof lightColors;
