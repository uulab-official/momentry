import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { AppBar } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { ShimmerBlock, useShimmerAnimation } from '@/src/components/Skeleton';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { listDeletedEntries, restoreEntry } from '@/src/db/database';
import { DeletedEntry, ENTRY_LABEL } from '@/src/types/entry';

function formatDeletedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '삭제 시각을 알 수 없어요';
  return `${date.toLocaleDateString('ko-KR')} 삭제`;
}

export function TrashScreen() {
  const { colors } = useAppTheme();
  const { refresh } = useEntries();
  const [entries, setEntries] = useState<DeletedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listDeletedEntries());
    } catch {
      setError('최근 삭제 기록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const restore = async (id: number) => {
    if (restoringId !== null) return;
    setRestoringId(id);
    Haptics.selectionAsync().catch(() => undefined);
    try {
      await restoreEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '기록을 복원하지 못했어요.');
    } finally {
      setRestoringId(null);
    }
  };

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <AppBar title="최근 삭제" back />
    <View style={[styles.notice, { backgroundColor: colors.primarySoft }]}><Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.text }]}>삭제한 기록은 30일 동안 보관한 뒤 자동으로 정리돼요.</Text></View>
    {loading && entries.length === 0 ? <TrashListSkeleton /> : error && entries.length === 0 ? <View style={styles.center}><Text style={{ color: colors.textMuted }}>{error}</Text><AnimatedPressable accessibilityRole="button" onPress={() => void load()} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>다시 시도</Text></AnimatedPressable></View> : <FlatList
      data={entries}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.list, entries.length === 0 && styles.emptyList]}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      refreshing={loading}
      onRefresh={() => void load()}
      renderItem={({ item }) => <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.thumb} resizeMode="cover" /> : <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.primarySoft }]}><Ionicons name={item.kind === 'diary' ? 'sparkles' : item.kind === 'movie' ? 'film' : 'book'} size={24} color={colors.primary} /></View>}
        <View style={styles.cardBody}><Text style={[styles.kind, { color: colors.tint }]}>{ENTRY_LABEL[item.kind]} · {formatDeletedAt(item.deletedAt)}</Text><Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>{item.title}</Text><Text style={[styles.date, { color: colors.textMuted }]}>{item.entryDate}</Text></View>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${item.title} 복원`} accessibilityState={{ busy: restoringId === item.id }} disabled={restoringId !== null} onPress={() => void restore(item.id)} style={[styles.restore, { backgroundColor: colors.primarySoft, opacity: restoringId !== null ? 0.55 : 1 }]} pressedOpacity={0.7} scaleTo={0.95}>{restoringId === item.id ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-undo-outline" size={19} color={colors.primary} />}<Text style={[styles.restoreText, { color: colors.primary }]}>복원</Text></AnimatedPressable>
      </View>}
      ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="trash-outline" size={32} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>최근 삭제된 기록이 없어요</Text><Text style={[styles.emptyBody, { color: colors.textMuted }]}>삭제한 기록은 30일 동안 이곳에서 복원할 수 있어요.</Text></View>}
    />}
    {error && entries.length > 0 ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.tint }]}>{error}</Text> : null}
  </View>;
}

function TrashListSkeleton() {
  const { colors } = useAppTheme();
  const { progress, reduceMotion } = useShimmerAnimation();
  const blockProps = { progress, reduceMotion, baseColor: colors.surfaceMuted, highlightColor: colors.surface };

  return (
    <View accessibilityLabel="최근 삭제 기록을 불러오는 중" style={styles.skeletonList}>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ShimmerBlock {...blockProps} style={styles.thumb} />
          <View style={styles.skeletonBody}>
            <ShimmerBlock {...blockProps} style={styles.skeletonMeta} />
            <ShimmerBlock {...blockProps} style={styles.skeletonTitle} />
            <ShimmerBlock {...blockProps} style={styles.skeletonDate} />
          </View>
          <ShimmerBlock {...blockProps} style={styles.skeletonRestore} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, notice: { marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' }, list: { padding: 16, paddingBottom: 42 }, emptyList: { flexGrow: 1 }, card: { borderWidth: 1, borderRadius: 18, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, thumb: { width: 58, height: 70, borderRadius: 11 }, thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1, minWidth: 0, gap: 3 }, kind: { fontSize: 11, fontWeight: '900' }, title: { fontSize: 15, fontWeight: '800' }, date: { fontSize: 12 }, restore: { minWidth: 56, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2 }, restoreText: { fontSize: 12, fontWeight: '900' }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, retryText: { color: '#fff', fontWeight: '900' }, empty: { alignItems: 'center', borderRadius: 18, paddingHorizontal: 24, paddingVertical: 42, gap: 8 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }, emptyTitle: { fontSize: 18, fontWeight: '900' }, emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' }, error: { marginHorizontal: 18, marginBottom: 16, fontSize: 13 },
  skeletonList: { padding: 16, gap: 10 },
  skeletonBody: { flex: 1, gap: 7 },
  skeletonMeta: { width: '78%', height: 11, borderRadius: 6 },
  skeletonTitle: { width: '68%', height: 16, borderRadius: 7 },
  skeletonDate: { width: '48%', height: 11, borderRadius: 6 },
  skeletonRestore: { width: 56, height: 40, borderRadius: 12 },
});
