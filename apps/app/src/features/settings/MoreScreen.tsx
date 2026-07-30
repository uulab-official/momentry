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
      <View style={[styles.profile, { backgroundColor: colors.primary }]}>
        <Text style={styles.eyebrow}>MOMENTRY</Text>
        <Text style={styles.profileTitle}>나의 기억이 자라는 곳</Text>
        <Text style={styles.profileBody}>일기와 영화, 책에서 만난 순간을{`\n`}오래 간직해보세요.</Text>
      </View>
      {entriesLoading && totalCount === 0 ? <MemoryStatsSkeleton /> : <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statsHeader}><Text style={[styles.statsTitle, { color: colors.text }]}>기억 나무</Text><Text style={[styles.statsTotal, { color: colors.primary }]}>{totalCount}개</Text></View>
        <View style={styles.statsRow}>{ENTRY_KINDS.map((kind, index) => <View key={kind} style={[styles.stat, index > 0 && { borderLeftColor: colors.border, borderLeftWidth: StyleSheet.hairlineWidth }]}><Ionicons name={kind === 'diary' ? 'sparkles-outline' : kind === 'movie' ? 'film-outline' : 'book-outline'} size={18} color={colors.primary} /><Text style={[styles.statValue, { color: colors.text }]}>{entriesFor(kind).length}</Text><Text style={[styles.statLabel, { color: colors.textMuted }]}>{ENTRY_LABEL[kind]}</Text></View>)}</View>
        {recentEntry ? <AnimatedPressable accessibilityRole="button" accessibilityLabel={`최근 기록 ${recentEntry.title} 열기`} onPress={openRecentEntry} style={[styles.recent, { backgroundColor: colors.primarySoft }]} pressedOpacity={0.82} scaleTo={0.985}><View style={styles.recentText}><Text style={[styles.recentEyebrow, { color: colors.primary }]}>최근 기록</Text><Text numberOfLines={1} style={[styles.recentTitle, { color: colors.text }]}>{recentEntry.title}</Text><Text style={[styles.recentMeta, { color: colors.textMuted }]}>{ENTRY_LABEL[recentEntry.kind]} · {recentEntry.entryDate}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.primary} /></AnimatedPressable> : <Text style={[styles.recentEmpty, { color: colors.textMuted }]}>첫 기록을 남기면 여기에서 다시 만날 수 있어요.</Text>}
      </View>}
      <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><SettingsRow icon="search-outline" label="모든 기억 검색" value="일기·영화·책" onPress={() => router.push('/search')} /></View>
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
    <View accessibilityLabel="기억 통계를 불러오는 중" style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.statsHeader}>
        <ShimmerBlock {...blockProps} style={styles.statsSkeletonTitle} />
        <ShimmerBlock {...blockProps} style={styles.statsSkeletonCount} />
      </View>
      <View style={styles.statsSkeletonRow}>
        {[0, 1, 2].map((index) => <ShimmerBlock key={index} {...blockProps} style={styles.statsSkeletonItem} />)}
      </View>
      <ShimmerBlock {...blockProps} style={styles.statsSkeletonRecent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 110 },
  profile: { borderRadius: 24, padding: 22, marginBottom: 14 },
  searchCard: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', marginBottom: 8 },
  statsCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 8 },
  statsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  statsTitle: typography.sectionTitle,
  statsTotal: typography.label,
  statsRow: { flexDirection: 'row', marginBottom: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { ...typography.screenTitle, fontVariant: ['tabular-nums'] },
  statLabel: typography.caption,
  recent: { borderRadius: 14, minHeight: 62, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  recentText: { flex: 1, minWidth: 0, gap: 2 },
  recentEyebrow: typography.overline,
  recentTitle: typography.itemTitle,
  recentMeta: typography.caption,
  recentEmpty: { fontSize: 13, lineHeight: 19, paddingHorizontal: 4 },
  statsSkeletonTitle: { width: 68, height: 16, borderRadius: 8 },
  statsSkeletonCount: { width: 38, height: 14, borderRadius: 7 },
  statsSkeletonRow: { height: 57, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 14 },
  statsSkeletonItem: { width: 44, height: 44, borderRadius: 14 },
  statsSkeletonRecent: { minHeight: 62, borderRadius: 14 },
  eyebrow: { ...typography.overline, color: 'rgba(255,255,255,0.78)', letterSpacing: 1.4 },
  profileTitle: { ...typography.screenTitle, color: '#fff', marginTop: 10 },
  profileBody: { ...typography.body, color: 'rgba(255,255,255,0.78)', marginTop: 8 },
  section: { ...typography.caption, marginLeft: 5, marginBottom: 8, marginTop: 12 },
  group: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
});
