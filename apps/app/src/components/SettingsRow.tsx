import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';

export function SettingsRow({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; onPress?: () => void }) {
  const { colors } = useAppTheme();
  const content = (
    <>
      <View style={styles.icon}><Ionicons name={icon} size={21} color={colors.primary} /></View>
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
        style={[styles.row, { borderColor: colors.border }]}
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
      style={[styles.row, { borderColor: colors.border }]}
      pressedOpacity={0.75}
      scaleTo={0.99}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 28, height: 40, flexShrink: 0, alignItems: 'flex-start', justifyContent: 'center' },
  label: { ...typography.itemTitle, flex: 1, minWidth: 0 },
  value: { ...typography.caption, maxWidth: '42%', flexShrink: 1, textAlign: 'right' },
});
