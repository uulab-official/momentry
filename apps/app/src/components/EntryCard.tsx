import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { Entry, ENTRY_LABEL } from '@/src/types/entry';

export const EntryCard = memo(function EntryCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const icon = entry.kind === 'diary' ? 'sparkles' : entry.kind === 'movie' ? 'film' : 'book';

  return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`${ENTRY_LABEL[entry.kind]} ${entry.title}, ${entry.entryDate}`}
        onPress={() => { Haptics.selectionAsync().catch(() => undefined); router.push(`/entry/${entry.id}`); }}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        pressedOpacity={0.94}
        scaleTo={0.985}>
        {entry.imageUri ? (
          <Image source={{ uri: entry.imageUri }} style={styles.image} resizeMode="cover" resizeMethod="resize" fadeDuration={160} />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={icon} size={30} color={colors.primary} />
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <Text style={[styles.kind, { color: colors.tint }]}>{ENTRY_LABEL[entry.kind]}</Text>
            <Text style={[styles.date, { color: colors.textMuted }]}>{entry.entryDate}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{entry.title}</Text>
          <Text numberOfLines={2} style={[styles.body, { color: colors.textMuted }]}>{entry.content || '아직 기록한 내용이 없어요.'}</Text>
          {entry.rating > 0 ? <Text style={styles.rating}>{'★'.repeat(entry.rating)}<Text style={{ color: colors.border }}>{'★'.repeat(5 - entry.rating)}</Text></Text> : null}
        </View>
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    ...Platform.select({
      web: { boxShadow: '0 4px 10px rgba(18, 32, 25, 0.055)' },
      default: { shadowColor: '#122019', shadowOpacity: 0.055, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
    }),
  },
  image: { width: 72, height: 82, flexShrink: 0, borderRadius: 13 },
  placeholder: { width: 72, height: 82, flexShrink: 0, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kind: { fontSize: 12, fontWeight: '800' },
  date: { fontSize: 12 },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.25 },
  body: { fontSize: 13, lineHeight: 18 },
  rating: { color: '#ECAA3D', fontSize: 13, letterSpacing: 1 },
  chevron: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
