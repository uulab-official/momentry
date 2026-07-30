import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { AppBar } from '@/src/components/AppBar';
import { ThemeMode, useAppTheme } from '@/src/providers/ThemeProvider';

const OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'system', label: '시스템 설정', description: '기기의 테마를 자동으로 따라가요.', icon: 'phone-portrait-outline' },
  { value: 'light', label: '라이트 모드', description: '밝고 따뜻한 아이보리 화면이에요.', icon: 'sunny-outline' },
  { value: 'dark', label: '다크 모드', description: '어두운 곳에서도 눈이 편안해요.', icon: 'moon-outline' },
];

export function ThemeSettingsScreen() {
  const { colors, mode, setMode } = useAppTheme();

  const chooseMode = async (next: ThemeMode) => {
    if (next === mode) return;
    Haptics.selectionAsync().catch(() => undefined);
    await setMode(next);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBar title="테마" back />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="color-palette-outline" size={30} color={colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: colors.text }]}>기록할 때 가장 편안한 화면</Text>
            <Text style={[styles.heroBody, { color: colors.textMuted }]}>선택한 테마는 이 기기에만 저장되고 다음 실행에도 유지돼요.</Text>
          </View>
        </View>
        <View style={[styles.group, { borderColor: colors.border }]}>
          {OPTIONS.map((option) => {
            const selected = mode === option.value;
            return (
              <AnimatedPressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label}, ${option.description}`}
                accessibilityState={{ selected }}
                onPress={() => void chooseMode(option.value)}
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                pressedOpacity={0.76}
                scaleTo={0.99}
              >
                <View style={[styles.optionIcon, { backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted }]}>
                  <Ionicons name={option.icon} size={22} color={selected ? colors.primary : colors.textMuted} />
                </View>
                <View style={styles.text}>
                  <Text style={[styles.label, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.description, { color: colors.textMuted }]}>{option.description}</Text>
                </View>
                <View style={[styles.radio, { backgroundColor: selected ? colors.primary : colors.background, borderColor: selected ? colors.primary : colors.border }]}>
                  {selected ? <Ionicons name="checkmark" size={17} color="#FFFFFF" /> : null}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 16, fontWeight: '900' },
  heroBody: { fontSize: 13, lineHeight: 19 },
  group: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  row: { minHeight: 82, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minWidth: 0, gap: 4 },
  label: { fontSize: 16, fontWeight: '800' },
  description: { fontSize: 13, lineHeight: 18 },
  radio: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
