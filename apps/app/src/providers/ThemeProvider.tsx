import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';

import { AppColors, lightColors } from '@/src/theme/tokens';

type ThemeContextValue = {
  colors: AppColors;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const LIGHT_THEME: ThemeContextValue = { colors: lightColors, hydrated: true };

export function AppThemeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    AsyncStorage.removeItem('momentry.themeMode').catch(() => undefined);
    if (Platform.OS !== 'web' && typeof Appearance.setColorScheme === 'function') {
      Appearance.setColorScheme('light');
    }
  }, []);

  return <ThemeContext.Provider value={LIGHT_THEME}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return value;
}
