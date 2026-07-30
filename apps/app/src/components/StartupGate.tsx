import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { pretendard } from '@/src/theme/typography';

const RELOAD_FLOOR_KEY = 'momentry.startupReloadFloor';
const UPDATE_CHECK_TIMEOUT_MS = 8_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('OTA check timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function StartupGate({ children }: PropsWithChildren) {
  const { colors, hydrated: themeHydrated } = useAppTheme();
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('기억을 꺼낼 준비를 하고 있어요');
  const [progress] = useState(() => new Animated.Value(0.06));
  const progressFloor = useRef(0.06);
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [percent, setPercent] = useState(6);

  const moveTo = (next: number, duration = 300) => {
    const value = Math.max(progressFloor.current, next);
    progressFloor.current = value;
    progressAnimation.current?.stop();
    progressAnimation.current = Animated.timing(progress, { toValue: value, duration, useNativeDriver: false });
    progressAnimation.current.start();
  };

  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setPercent(Math.round(Math.max(0, Math.min(1, value)) * 100));
    });
    return () => progress.removeListener(listenerId);
  }, [progress]);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      const storedFloor = await AsyncStorage.getItem(RELOAD_FLOOR_KEY).catch(() => null);
      const floor = Number(storedFloor) || 0;
      if (floor > 0) moveTo(Math.min(floor, 0.94), 120);
      try {
        moveTo(0.28);
        if (Updates.isEnabled) {
          setMessage('최신 업데이트를 확인하고 있어요');
          const update = await withTimeout(Updates.checkForUpdateAsync(), UPDATE_CHECK_TIMEOUT_MS);
          moveTo(0.52);
          if (update.isAvailable) {
            setMessage('업데이트를 적용하고 있어요');
            await withTimeout(Updates.fetchUpdateAsync(), UPDATE_CHECK_TIMEOUT_MS);
            await AsyncStorage.setItem(RELOAD_FLOOR_KEY, '0.88').catch(() => undefined);
            moveTo(0.88);
            await Updates.reloadAsync();
            return;
          }
        }
      } catch {
        // Offline startup remains usable with the bundled update.
      }
      await AsyncStorage.removeItem(RELOAD_FLOOR_KEY).catch(() => undefined);
      moveTo(1, 380);
      setMessage('준비가 끝났어요');
      completionTimer.current = setTimeout(() => mounted && setReady(true), 430);
    };
    start();
    return () => {
      mounted = false;
      progressAnimation.current?.stop();
      if (completionTimer.current) clearTimeout(completionTimer.current);
    };
  // Startup must run once; progress is intentionally monotonic inside this lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ready && themeHydrated) return children;
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View style={[styles.root, { backgroundColor: colors.background }]}><View style={styles.logoSlot}><Image source={require('../../assets/images/splash-mark.png')} style={styles.logo} resizeMode="contain" /><Text style={[styles.title, { color: colors.text }]}>모멘트리</Text><Text style={[styles.tagline, { color: colors.textMuted }]}>나의 기억이 자라는 곳</Text></View><View style={styles.messageSlot}><Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text></View><View style={styles.progressSlot}><View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><Animated.View style={[styles.fill, { backgroundColor: colors.primary, width }]} /></View><Text style={[styles.percent, { color: colors.textMuted }]}>{percent}%</Text></View><View style={styles.spinnerSlot} /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 34 }, logoSlot: { height: 260, alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end' }, logo: { width: 176, height: 176 }, title: { ...typography.display, marginTop: 4 }, tagline: { ...typography.caption, marginTop: 5 }, messageSlot: { marginTop: 34, marginBottom: 17 }, message: { ...typography.label, ...pretendard(400), textAlign: 'center', includeFontPadding: true }, progressSlot: { width: '100%', maxWidth: 330, height: 44, alignSelf: 'center' }, track: { height: 7, borderRadius: 5, overflow: 'hidden' }, fill: { height: 7, borderRadius: 5 }, percent: { ...typography.caption, textAlign: 'center', marginTop: 8, fontVariant: ['tabular-nums'] }, spinnerSlot: { height: 24 } });
