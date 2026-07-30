import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

import { AppColors, darkColors, lightColors } from '@/src/theme/tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  colorScheme: 'light' | 'dark';
  colors: AppColors;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'momentry.themeMode';

function resolveScheme(mode: ThemeMode, system: ColorSchemeName) {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (mounted && (stored === 'system' || stored === 'light' || stored === 'dark')) setModeState(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const colorScheme = resolveScheme(mode, system);
  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colorScheme,
    colors: colorScheme === 'dark' ? darkColors : lightColors,
    hydrated,
    setMode: async (next) => {
      setModeState(next);
      await AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
    },
  }), [colorScheme, hydrated, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return value;
}
