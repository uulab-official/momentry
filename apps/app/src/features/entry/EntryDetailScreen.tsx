import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, AppBarAction } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { MediaViewer } from '@/src/components/MediaViewer';
import { ShimmerBlock, useShimmerAnimation } from '@/src/components/Skeleton';
import { goBackOrHome } from '@/src/navigation/goBackOrHome';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { pretendard } from '@/src/theme/typography';
import { Entry, ENTRY_LABEL } from '@/src/types/entry';

export function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { find, remove } = useEntries();
  const numericId = Number(id);
  const validId = Number.isSafeInteger(numericId) && numericId > 0;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const requestVersion = useRef(0);

  const loadEntry = useCallback(() => {
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    setEntry(null);
    setLoadError(false);
    setLoading(true);
    void (async () => {
      if (!validId) {
        if (requestVersion.current === version) { setLoadError(true); setLoading(false); }
        return;
      }
      try {
        const result = await find(numericId);
        if (requestVersion.current === version) setEntry(result);
      } catch {
        if (requestVersion.current === version) setLoadError(true);
      } finally {
        if (requestVersion.current === version) setLoading(false);
      }
    })();
  }, [find, numericId, validId]);

  useFocusEffect(useCallback(() => {
    loadEntry();
    return () => { requestVersion.current += 1; };
  }, [loadEntry]));

  const deleteEntry = async () => {
    if (!entry || deleting) return;
    setDeleting(true);
    try {
      await remove(entry.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setConfirming(false);
      goBackOrHome(router);
    } catch {
      setDeleting(false);
      setConfirming(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setDeleteError(true);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBar title={entry ? ENTRY_LABEL[entry.kind] : '기록'} back right={entry ? <><AppBarAction icon="create-outline" label="수정" onPress={() => router.push({ pathname: '/entry/[id]/edit', params: { id: String(entry.id), kind: entry.kind } })} /><AppBarAction icon="trash-outline" label="삭제" onPress={() => setConfirming(true)} /></> : undefined} />
      {loading ? <DetailSkeleton colors={colors} /> : !entry ? <View style={styles.center}><Text style={{ color: colors.textMuted }}>{loadError ? '기록을 불러오지 못했어요.' : '기록을 찾지 못했어요.'}</Text><AnimatedPressable accessibilityRole="button" onPress={() => loadEntry()} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>다시 시도</Text></AnimatedPressable></View> : (
        <ScrollView contentContainerStyle={styles.content}>
          {entry.imageUri ? <AnimatedPressable accessibilityRole="button" accessibilityLabel="사진 크게 보기" onPress={() => { Haptics.selectionAsync().catch(() => undefined); setViewerVisible(true); }} style={styles.heroPressable} pressedOpacity={0.9} scaleTo={0.99}><Image source={{ uri: entry.imageUri }} style={styles.hero} resizeMode="cover" resizeMethod="resize" fadeDuration={160} /></AnimatedPressable> : <View style={[styles.hero, styles.placeholder, { backgroundColor: colors.primarySoft }]}><Ionicons name={entry.kind === 'diary' ? 'sparkles' : entry.kind === 'movie' ? 'film' : 'book'} size={58} color={colors.primary} /></View>}
          <View style={styles.meta}><Text style={[styles.kind, { color: colors.tint }]}>{ENTRY_LABEL[entry.kind]}</Text><Text style={{ color: colors.textMuted }}>{entry.entryDate}</Text></View>
          <Text style={[styles.title, { color: colors.text }]}>{entry.title}</Text>
          {entry.creator || entry.releaseYear ? <Text style={[styles.creator, { color: colors.textMuted }]}>{[entry.creator, entry.releaseYear].filter(Boolean).join(' · ')}</Text> : null}
          {entry.rating > 0 ? <Text style={[styles.rating, { color: colors.primary }]}>{'★'.repeat(entry.rating)}<Text style={{ color: colors.border }}>{'★'.repeat(5 - entry.rating)}</Text></Text> : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.body, { color: colors.text }]}>{entry.content || '아직 남긴 감상이 없어요.'}</Text>
        </ScrollView>
      )}
      <ConfirmDialog
        visible={confirming}
        title="이 기억을 삭제할까요?"
        message="최근 삭제에서 30일 동안 복원할 수 있어요."
        confirmLabel={deleting ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        destructive
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void deleteEntry()}
      />
      <ConfirmDialog
        visible={deleteError}
        title="삭제하지 못했어요"
        message="기록을 삭제하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요."
        onConfirm={() => setDeleteError(false)}
      />
      <MediaViewer visible={viewerVisible} imageUri={entry?.imageUri ?? null} onClose={() => setViewerVisible(false)} />
    </View>
  );
}

function DetailSkeleton({ colors }: { colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const { progress, reduceMotion } = useShimmerAnimation();
  const neutral = { progress, reduceMotion, baseColor: colors.surfaceMuted, highlightColor: colors.surface };
  const accent = { progress, reduceMotion, baseColor: colors.primarySoft, highlightColor: colors.surface };

  return <ScrollView contentContainerStyle={styles.content} accessibilityLabel="기록을 불러오는 중">
    <ShimmerBlock {...neutral} style={styles.skeletonHero} />
    <View style={styles.skeletonMeta}><ShimmerBlock {...accent} style={styles.skeletonKind} /><ShimmerBlock {...neutral} style={styles.skeletonDate} /></View>
    <ShimmerBlock {...neutral} style={styles.skeletonTitle} />
    <ShimmerBlock {...neutral} style={styles.skeletonSubtitle} />
    <View style={[styles.skeletonDivider, { backgroundColor: colors.border }]} />
    <ShimmerBlock {...neutral} style={styles.skeletonLine} /><ShimmerBlock {...neutral} style={styles.skeletonLine} /><ShimmerBlock {...neutral} style={styles.skeletonLineShort} />
  </ScrollView>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }, retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, retryText: { ...typography.button, color: '#fff' }, content: { padding: 16, paddingBottom: 60 }, heroPressable: { marginBottom: 20 }, hero: { width: '100%', aspectRatio: 1.45, borderRadius: 24 }, placeholder: { marginBottom: 20, alignItems: 'center', justifyContent: 'center' }, meta: { flexDirection: 'row', gap: 10, alignItems: 'center' }, kind: typography.label, title: { ...typography.display, marginTop: 9 }, creator: { ...typography.label, ...pretendard(400), marginTop: 6 }, rating: { ...pretendard(400), fontSize: 18, letterSpacing: 2, marginTop: 12 }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 22 }, body: { ...pretendard(400), fontSize: 16, lineHeight: 26 }, skeletonHero: { width: '100%', aspectRatio: 1.45, borderRadius: 24, marginBottom: 20 }, skeletonMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 }, skeletonKind: { width: 42, height: 16, borderRadius: 8 }, skeletonDate: { width: 88, height: 14, borderRadius: 7 }, skeletonTitle: { width: '78%', height: 31, borderRadius: 10, marginTop: 13 }, skeletonSubtitle: { width: '44%', height: 16, borderRadius: 8, marginTop: 10 }, skeletonDivider: { height: StyleSheet.hairlineWidth, marginVertical: 24 }, skeletonLine: { width: '100%', height: 16, borderRadius: 8, marginBottom: 13 }, skeletonLineShort: { width: '64%', height: 16, borderRadius: 8 } });
