import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { pretendard } from '@/src/theme/typography';
import { markMomentryAppEntered, momentryReadableFrame } from '@/src/startup/StartupRuntime';
import type { MomentryStartupState } from '@/src/startup/momentry-startup';

export function StartupGate({ children, startup }: PropsWithChildren<{ startup: MomentryStartupState }>) {
  const { colors, hydrated: themeHydrated } = useAppTheme();
  const ready = startup.phase === 'ready';
  const message = startup.message;
  const [progress] = useState(() => new Animated.Value(0.06));
  const progressFloor = useRef(0.06);
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);
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
    moveTo(startup.progress, startup.progress === 1 ? 380 : 300);
    return () => progressAnimation.current?.stop();
  // Progress is intentionally monotonic within this mounted splash.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startup.progress]);

  useEffect(() => { if (ready && themeHydrated) markMomentryAppEntered(); }, [ready, themeHydrated]);

  if (ready && themeHydrated) return <View style={{ flex: 1 }} onLayout={momentryReadableFrame}>{children}</View>;
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return <View onLayout={momentryReadableFrame} style={[styles.root, { backgroundColor: colors.background }]}><View style={styles.logoSlot}><Image source={require('../../assets/images/splash-mark.png')} style={styles.logo} resizeMode="contain" /><Text style={[styles.title, { color: colors.text }]}>모멘트리</Text><Text style={[styles.tagline, { color: colors.textMuted }]}>나의 기억이 자라는 곳</Text></View><View style={styles.messageSlot}><Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text></View><View style={styles.progressSlot}><View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}><Animated.View style={[styles.fill, { backgroundColor: colors.primary, width }]} /></View><Text style={[styles.percent, { color: colors.textMuted }]}>{percent}%</Text></View><View style={styles.spinnerSlot} /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'stretch', justifyContent: 'center', paddingHorizontal: 34 }, logoSlot: { height: 260, alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end' }, logo: { width: 176, height: 176 }, title: { ...typography.display, marginTop: 4 }, tagline: { ...typography.caption, marginTop: 5 }, messageSlot: { marginTop: 34, marginBottom: 17 }, message: { ...typography.label, ...pretendard(400), textAlign: 'center', includeFontPadding: true }, progressSlot: { width: '100%', maxWidth: 330, height: 44, alignSelf: 'center' }, track: { height: 7, borderRadius: 5, overflow: 'hidden' }, fill: { height: 7, borderRadius: 5 }, percent: { ...typography.caption, textAlign: 'center', marginTop: 8, fontVariant: ['tabular-nums'] }, spinnerSlot: { height: 24 } });
