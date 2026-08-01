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
import { typography } from '@/src/theme/tokens';
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
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
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
    setStatus(null);
    Haptics.selectionAsync().catch(() => undefined);
    try {
      await restoreEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      await refresh();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setStatus('기록을 복원했어요. 해당 기록 목록에서 다시 확인할 수 있어요.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '기록을 복원하지 못했어요.');
    } finally {
      setRestoringId(null);
    }
  };

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <AppBar title="최근 삭제" back />
    <View style={[styles.notice, { borderColor: colors.border }]}><Text style={[styles.noticeLabel, { color: colors.primary }]}>30일 보관</Text><Text style={[styles.noticeText, { color: colors.textMuted }]}>삭제한 기록은 이 기간 안에 복원할 수 있어요.</Text></View>
    {status ? <View accessibilityLiveRegion="polite" style={[styles.status, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}><Ionicons name="checkmark-circle" size={20} color={colors.primary} /><Text style={[styles.statusText, { color: colors.text }]}>{status}</Text><AnimatedPressable accessibilityRole="button" accessibilityLabel="복원 완료 메시지 닫기" onPress={() => setStatus(null)} style={styles.statusClose} pressedOpacity={0.6} scaleTo={0.9}><Ionicons name="close" size={18} color={colors.textMuted} /></AnimatedPressable></View> : null}
    {loading && entries.length === 0 ? <TrashListSkeleton /> : error && entries.length === 0 ? <View style={styles.center}><Text style={{ color: colors.textMuted }}>{error}</Text><AnimatedPressable accessibilityRole="button" onPress={() => void load()} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>다시 시도</Text></AnimatedPressable></View> : <FlatList
      data={entries}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[styles.list, entries.length === 0 && styles.emptyList]}
      refreshing={loading}
      onRefresh={() => void load()}
      renderItem={({ item }) => <View style={[styles.card, { borderColor: colors.border }]}>
        {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.thumb} resizeMode="cover" /> : <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.primarySoft }]}><Ionicons name={item.kind === 'diary' ? 'sparkles' : item.kind === 'movie' ? 'film' : 'book'} size={24} color={colors.primary} /></View>}
        <View style={styles.cardBody}><Text style={[styles.kind, { color: colors.tint }]}>{ENTRY_LABEL[item.kind]} · {formatDeletedAt(item.deletedAt)}</Text><Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>{item.title}</Text><Text style={[styles.date, { color: colors.textMuted }]}>{item.entryDate}</Text></View>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${item.title} 복원`} accessibilityState={{ busy: restoringId === item.id }} disabled={restoringId !== null} onPress={() => void restore(item.id)} style={[styles.restore, { borderColor: colors.primary, opacity: restoringId !== null ? 0.55 : 1 }]} pressedOpacity={0.7} scaleTo={0.95}>{restoringId === item.id ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} />}<Text style={[styles.restoreText, { color: colors.primary }]}>복원</Text></AnimatedPressable>
      </View>}
      ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyEyebrow, { color: colors.primary }]}>최근 삭제</Text><Text style={[styles.emptyTitle, { color: colors.text }]}>복원할 기록이 없어요</Text><Text style={[styles.emptyBody, { color: colors.textMuted }]}>삭제한 기록이 생기면 30일 동안 이곳에 표시됩니다.</Text></View>}
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
        <View key={row} style={[styles.card, { borderColor: colors.border }]}>
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
  root: { flex: 1 }, notice: { marginHorizontal: 18, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 }, noticeLabel: typography.overline, noticeText: typography.caption, status: { marginHorizontal: 18, marginTop: 14, minHeight: 52, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingLeft: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, statusText: { ...typography.caption, flex: 1, minWidth: 0 }, statusClose: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: 18, paddingBottom: 42 }, emptyList: { flexGrow: 1 }, card: { minHeight: 94, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }, thumb: { width: 54, height: 68, borderRadius: 6 }, thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' }, cardBody: { flex: 1, minWidth: 0, gap: 3 }, kind: typography.overline, title: typography.itemTitle, date: typography.caption, restore: { minWidth: 58, height: 44, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, restoreText: typography.caption, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, retryText: { ...typography.button, color: '#fff' }, empty: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 2, paddingBottom: 90, gap: 7 }, emptyEyebrow: typography.overline, emptyTitle: typography.sectionTitle, emptyBody: { ...typography.body, maxWidth: 300 }, error: { ...typography.caption, marginHorizontal: 18, marginBottom: 16 },
  skeletonList: { paddingHorizontal: 18 },
  skeletonBody: { flex: 1, gap: 7 },
  skeletonMeta: { width: '78%', height: 11, borderRadius: 6 },
  skeletonTitle: { width: '68%', height: 16, borderRadius: 7 },
  skeletonDate: { width: '48%', height: 11, borderRadius: 6 },
  skeletonRestore: { width: 58, height: 44, borderRadius: 10 },
});
