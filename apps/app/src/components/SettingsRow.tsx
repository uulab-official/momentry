import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';

export function SettingsRow({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={20} color={colors.primary} /></View>
      <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>{label}</Text>
      {value ? <Text numberOfLines={1} style={[styles.value, { color: colors.textMuted }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={value ? `${label}, ${value}` : label}
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {content}
      </View>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      pressedOpacity={0.75}
      scaleTo={0.99}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 34, height: 34, flexShrink: 0, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600' },
  value: { maxWidth: '42%', flexShrink: 1, fontSize: 14, textAlign: 'right' },
});
