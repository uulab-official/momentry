import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { StartupGate } from '@/src/components/StartupGate';
import { NotificationObserver } from '@/src/components/NotificationObserver';
import { EntriesProvider } from '@/src/providers/EntriesProvider';
import { AppThemeProvider } from '@/src/providers/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Pretendard-100': require('../assets/fonts/pretendard/Pretendard-Thin.otf'),
    'Pretendard-200': require('../assets/fonts/pretendard/Pretendard-ExtraLight.otf'),
    'Pretendard-300': require('../assets/fonts/pretendard/Pretendard-Light.otf'),
    'Pretendard-400': require('../assets/fonts/pretendard/Pretendard-Regular.otf'),
    'Pretendard-500': require('../assets/fonts/pretendard/Pretendard-Medium.otf'),
    'Pretendard-600': require('../assets/fonts/pretendard/Pretendard-SemiBold.otf'),
    'Pretendard-700': require('../assets/fonts/pretendard/Pretendard-Bold.otf'),
    'Pretendard-800': require('../assets/fonts/pretendard/Pretendard-ExtraBold.otf'),
    'Pretendard-900': require('../assets/fonts/pretendard/Pretendard-Black.otf'),
  });
  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;
  return <AppThemeProvider><EntriesProvider><StartupGate><Navigation /></StartupGate></EntriesProvider></AppThemeProvider>;
}

function Navigation() {
  return <ThemeProvider value={DefaultTheme}><StatusBar style="dark" /><NotificationObserver /><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="search" /><Stack.Screen name="entry/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="entry/[id]" /><Stack.Screen name="entry/[id]/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="discover/[kind]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="settings/index" /><Stack.Screen name="settings/about" /><Stack.Screen name="settings/trash" /><Stack.Screen name="notifications" /><Stack.Screen name="notice" /><Stack.Screen name="faq" /><Stack.Screen name="privacy" /><Stack.Screen name="terms" /></Stack></ThemeProvider>;
}
