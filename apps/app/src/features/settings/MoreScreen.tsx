import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBar, AppBarAction } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { ShimmerBlock, useShimmerAnimation } from '@/src/components/Skeleton';
import { SettingsRow } from '@/src/components/SettingsRow';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { ENTRY_KINDS, ENTRY_LABEL } from '@/src/types/entry';

export function MoreScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { entriesFor, loadingFor, refresh } = useEntries();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const totalCount = ENTRY_KINDS.reduce((total, kind) => total + entriesFor(kind).length, 0);
  const entriesLoading = ENTRY_KINDS.some((kind) => loadingFor(kind));
  const recentEntry = useMemo(() => ENTRY_KINDS
    .flatMap((kind) => entriesFor(kind))
    .sort((left, right) => right.entryDate.localeCompare(left.entryDate) || right.id - left.id)[0] ?? null, [entriesFor]);

  const openRecentEntry = () => {
    if (!recentEntry) return;
    Haptics.selectionAsync().catch(() => undefined);
    router.push(`/entry/${recentEntry.id}`);
  };

  return <View style={[styles.root, { backgroundColor: colors.background }]}>
    <AppBar title="전체" right={<AppBarAction icon="settings-outline" label="설정" onPress={() => router.push('/settings')} />} />
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      {entriesLoading && totalCount === 0 ? <MemoryStatsSkeleton /> : <View style={[styles.summary, { borderColor: colors.border }]}>
        <View style={styles.summaryHeader}><Text style={[styles.summaryTitle, { color: colors.text }]}>기록</Text><Text style={[styles.summaryTotal, { color: colors.text }]}>{totalCount}개</Text></View>
        <Text style={[styles.breakdown, { color: colors.textMuted }]}>{ENTRY_KINDS.map((kind) => `${ENTRY_LABEL[kind]} ${entriesFor(kind).length}`).join('  ·  ')}</Text>
        {recentEntry ? <AnimatedPressable accessibilityRole="button" accessibilityLabel={`최근 기록 ${recentEntry.title} 열기`} onPress={openRecentEntry} style={[styles.recent, { borderTopColor: colors.border }]} pressedOpacity={0.7} scaleTo={0.99}><View style={styles.recentText}><Text style={[styles.recentEyebrow, { color: colors.primary }]}>최근 기록</Text><Text numberOfLines={1} style={[styles.recentTitle, { color: colors.text }]}>{recentEntry.title}</Text><Text style={[styles.recentMeta, { color: colors.textMuted }]}>{ENTRY_LABEL[recentEntry.kind]} · {recentEntry.entryDate}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></AnimatedPressable> : <Text style={[styles.recentEmpty, { color: colors.textMuted }]}>아직 기록이 없어요.</Text>}
      </View>}
      <View style={[styles.searchGroup, { borderColor: colors.border }]}><SettingsRow icon="search-outline" label="모든 기록 검색" value="일기·영화·책" onPress={() => router.push('/search')} /></View>
      <Text style={[styles.section, { color: colors.textMuted }]}>도움</Text>
      <View style={[styles.group, { borderColor: colors.border }]}><SettingsRow icon="notifications-outline" label="알림" onPress={() => router.push('/notifications')} /><SettingsRow icon="megaphone-outline" label="공지사항" onPress={() => router.push('/notice')} /><SettingsRow icon="help-circle-outline" label="자주 묻는 질문" onPress={() => router.push('/faq')} /><SettingsRow icon="chatbubble-ellipses-outline" label="문의하기" onPress={() => WebBrowser.openBrowserAsync('https://uulab.co.kr/contact/')} /></View>
      <Text style={[styles.section, { color: colors.textMuted }]}>앱 정보</Text>
      <View style={[styles.group, { borderColor: colors.border }]}><SettingsRow icon="document-text-outline" label="이용약관" onPress={() => router.push('/terms')} /><SettingsRow icon="shield-checkmark-outline" label="개인정보 처리방침" onPress={() => router.push('/privacy')} /><SettingsRow icon="information-circle-outline" label="버전" value={Constants.expoConfig?.version ?? '1.0.0'} /></View>
    </ScrollView>
  </View>;
}

function MemoryStatsSkeleton() {
  const { colors } = useAppTheme();
  const { progress, reduceMotion } = useShimmerAnimation();
  const blockProps = {
    progress,
    reduceMotion,
    baseColor: colors.surfaceMuted,
    highlightColor: colors.surface,
  };

  return (
    <View accessibilityLabel="기록 통계를 불러오는 중" style={[styles.summary, { borderColor: colors.border }]}>
      <View style={styles.summaryHeader}>
        <ShimmerBlock {...blockProps} style={styles.statsSkeletonTitle} />
        <ShimmerBlock {...blockProps} style={styles.statsSkeletonCount} />
      </View>
      <ShimmerBlock {...blockProps} style={styles.statsSkeletonBreakdown} />
      <ShimmerBlock {...blockProps} style={styles.statsSkeletonRecent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 110 },
  summary: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 18, marginBottom: 24 },
  summaryHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  summaryTitle: typography.sectionTitle,
  summaryTotal: { ...typography.screenTitle, fontVariant: ['tabular-nums'] },
  breakdown: typography.caption,
  recent: { borderTopWidth: StyleSheet.hairlineWidth, minHeight: 68, marginTop: 16, paddingTop: 14, flexDirection: 'row', alignItems: 'center' },
  recentText: { flex: 1, minWidth: 0, gap: 2 },
  recentEyebrow: typography.overline,
  recentTitle: typography.itemTitle,
  recentMeta: typography.caption,
  recentEmpty: { ...typography.caption, marginTop: 16 },
  statsSkeletonTitle: { width: 68, height: 16, borderRadius: 8 },
  statsSkeletonCount: { width: 38, height: 14, borderRadius: 7 },
  statsSkeletonBreakdown: { width: 156, height: 13, borderRadius: 6, marginBottom: 18 },
  statsSkeletonRecent: { minHeight: 54, borderRadius: 8 },
  searchGroup: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 8 },
  section: { ...typography.caption, marginHorizontal: 4, marginBottom: 7, marginTop: 24 },
  group: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
});
