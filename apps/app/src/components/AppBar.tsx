import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { goBackOrHome } from '@/src/navigation/goBackOrHome';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';

type Props = { title: string; back?: boolean; close?: boolean; right?: ReactNode; onBack?: () => void };

const APP_BAR_HEIGHT = 56;

export function AppBar({ title, back = false, close = false, right, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const initialTop = initialWindowMetrics?.insets.top ?? 0;
  const safeTop = Math.max(insets.top, initialTop);
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.root,
        {
          height: safeTop + APP_BAR_HEIGHT,
          paddingTop: safeTop,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {back || close ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={close ? '닫기' : '뒤로 가기'}
            hitSlop={10}
            onPress={() => { Haptics.selectionAsync().catch(() => undefined); if (onBack) onBack(); else goBackOrHome(router); }}
            style={[styles.leading, { backgroundColor: colors.surface, borderColor: colors.border }]}
            pressedOpacity={0.62}
            scaleTo={0.96}>
            <Ionicons name={close ? 'close' : 'chevron-back'} size={close ? 25 : 28} color={colors.text} />
          </AnimatedPressable>
        ) : null}
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</Text>
        <View style={styles.actions}>{right}</View>
      </View>
    </View>
  );
}

export function AppBarAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={() => { Haptics.selectionAsync().catch(() => undefined); onPress(); }} style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]} pressedOpacity={0.62} scaleTo={0.96}>
      <Ionicons name={icon} size={24} color={colors.text} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 2, flexShrink: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { height: APP_BAR_HEIGHT, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  leading: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  title: { ...typography.screenTitle, flex: 1, minWidth: 0 },
  actions: { minWidth: 44, flexShrink: 0, alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  action: { width: 44, height: 44, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
});
