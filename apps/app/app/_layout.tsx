import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { StartupGate } from '@/src/components/StartupGate';
import { NotificationObserver } from '@/src/components/NotificationObserver';
import { EntriesProvider } from '@/src/providers/EntriesProvider';
import { AppThemeProvider } from '@/src/providers/ThemeProvider';
import { lightColors } from '@/src/theme/tokens';
import { disposeMomentrySplash, getMomentryStartup, momentryReadableFrame } from '@/src/startup/StartupRuntime';
import type { MomentryStartupState } from '@/src/startup/momentry-startup';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [runtime] = useState(getMomentryStartup);
  const currentSession = useRef<ReturnType<typeof runtime.mount> | null>(null);
  const [startup, setStartup] = useState<MomentryStartupState>({ phase: 'loading', fontsReady: false, progress: 0.06, message: '기억을 꺼낼 준비를 하고 있어요', retrying: false });
  useEffect(() => {
    const session = runtime.mount();
    currentSession.current = session;
    const unsubscribe = session.subscribe(setStartup);
    session.start();
    return () => { unsubscribe(); session.close('unmount'); disposeMomentrySplash(); };
  }, [runtime]);
  if (!startup.fontsReady) {
    if (startup.phase !== 'recovery') return null;
    return <View accessibilityRole="alert" onLayout={momentryReadableFrame} style={recoveryStyles.root}>
      <Image source={require('../assets/images/splash-mark.png')} style={recoveryStyles.logo} resizeMode="contain" />
      <Text style={recoveryStyles.message}>글꼴을 준비하지 못했어요. 다시 시도해 주세요.</Text>
      <Pressable accessibilityRole="button" disabled={startup.retrying} onPress={() => currentSession.current?.retry()}>
        <Text style={recoveryStyles.button}>{startup.retrying ? '글꼴을 준비하고 있어요' : '다시 시도'}</Text>
      </Pressable>
    </View>;
  }
  return <AppThemeProvider><EntriesProvider><StartupGate startup={startup}><Navigation /></StartupGate></EntriesProvider></AppThemeProvider>;
}

const recoveryStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 34, backgroundColor: lightColors.background },
  logo: { width: 176, height: 176 },
  message: { color: lightColors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 34 },
  button: { color: lightColors.primary, fontSize: 14, lineHeight: 20, marginTop: 17, padding: 12 },
});

function Navigation() {
  return <ThemeProvider value={DefaultTheme}><StatusBar style="dark" /><NotificationObserver /><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="(tabs)" /><Stack.Screen name="search" /><Stack.Screen name="entry/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="entry/[id]" /><Stack.Screen name="entry/[id]/edit" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="discover/[kind]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} /><Stack.Screen name="settings/index" /><Stack.Screen name="settings/about" /><Stack.Screen name="settings/trash" /><Stack.Screen name="notifications" /><Stack.Screen name="notice" /><Stack.Screen name="faq" /><Stack.Screen name="privacy" /><Stack.Screen name="terms" /></Stack></ThemeProvider>;
}
