import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { StartupGate } from '@/src/components/StartupGate';
import { NotificationObserver } from '@/src/components/NotificationObserver';
import { EntriesProvider } from '@/src/providers/EntriesProvider';
import { AppThemeProvider, useAppTheme } from '@/src/providers/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf') });
  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return <AppThemeProvider><EntriesProvider><StartupGate><Navigation /></StartupGate></EntriesProvider></AppThemeProvider>;
}

function Navigation() {
  const { colorScheme } = useAppTheme();
  return <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}><NotificationObserver /><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="search" /><Stack.Screen name="entry/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="entry/[id]" /><Stack.Screen name="entry/[id]/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="discover/[kind]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="settings/index" /><Stack.Screen name="settings/theme" /><Stack.Screen name="settings/about" /><Stack.Screen name="settings/trash" /><Stack.Screen name="notifications" /><Stack.Screen name="notice" /><Stack.Screen name="faq" /><Stack.Screen name="privacy" /><Stack.Screen name="terms" /></Stack></ThemeProvider>;
}
