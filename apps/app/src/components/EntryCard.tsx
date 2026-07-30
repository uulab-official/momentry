import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { Entry, ENTRY_LABEL } from '@/src/types/entry';

export const EntryCard = memo(function EntryCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const icon = entry.kind === 'diary' ? 'sparkles' : entry.kind === 'movie' ? 'film' : 'book';
  const mediaStyle = entry.kind === 'diary' ? styles.diaryMedia : styles.posterMedia;
  const workMeta = [entry.creator, entry.releaseYear].filter(Boolean).join(' · ');

  return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`${ENTRY_LABEL[entry.kind]} ${entry.title}, ${entry.entryDate}`}
        accessibilityHint="기록 상세 화면으로 이동"
        onPress={() => { Haptics.selectionAsync().catch(() => undefined); router.push(`/entry/${entry.id}`); }}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        pressedOpacity={0.94}
        scaleTo={0.985}>
        {entry.imageUri ? (
          <Image source={{ uri: entry.imageUri }} style={[styles.media, mediaStyle]} resizeMode="cover" resizeMethod="resize" fadeDuration={160} />
        ) : (
          <View style={[styles.media, mediaStyle, styles.placeholder, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={icon} size={30} color={colors.primary} />
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.metaRow}>
            <View style={[styles.kindPill, { backgroundColor: colors.primarySoft }]}><Text style={[styles.kind, { color: colors.primary }]}>{ENTRY_LABEL[entry.kind]}</Text></View>
            <Text style={[styles.date, { color: colors.textMuted }]}>{entry.entryDate}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{entry.title}</Text>
          {workMeta ? <Text numberOfLines={1} style={[styles.workMeta, { color: colors.textMuted }]}>{workMeta}</Text> : null}
          <Text numberOfLines={2} style={[styles.body, { color: colors.textMuted }]}>{entry.content || '아직 기록한 내용이 없어요.'}</Text>
          {entry.rating > 0 ? <Text style={[styles.rating, { color: colors.primary }]}>{'★'.repeat(entry.rating)}<Text style={{ color: colors.border }}>{'★'.repeat(5 - entry.rating)}</Text></Text> : null}
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
  media: { flexShrink: 0, borderRadius: 13 },
  diaryMedia: { width: 78, height: 78 },
  posterMedia: { width: 62, height: 88 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kindPill: { minHeight: 23, borderRadius: 8, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  kind: typography.overline,
  date: typography.caption,
  title: typography.sectionTitle,
  workMeta: typography.caption,
  body: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  rating: { fontSize: 13, letterSpacing: 1 },
  chevron: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
});
