import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppBar } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { EntryCard } from '@/src/components/EntryCard';
import { EntryListSkeleton } from '@/src/components/EntryListSkeleton';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { Entry, ENTRY_KINDS, ENTRY_LABEL } from '@/src/types/entry';

function compareNewest(left: Entry, right: Entry) {
  return right.entryDate.localeCompare(left.entryDate) || right.id - left.id;
}

export function AllEntriesSearchScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { entriesFor, loadingFor, errorFor, refresh } = useEntries();
  const listRef = useRef<FlatList<Entry>>(null);
  const [query, setQuery] = useState('');

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const entries = useMemo(() => ENTRY_KINDS.flatMap((kind) => entriesFor(kind)).sort(compareNewest), [entriesFor]);
  const loading = ENTRY_KINDS.some((kind) => loadingFor(kind));
  const error = ENTRY_KINDS.map((kind) => errorFor(kind)).find(Boolean) ?? null;
  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    if (!normalized) return entries;
    return entries.filter((entry) => [entry.title, entry.content, entry.creator, entry.entryDate, ENTRY_LABEL[entry.kind]]
      .some((value) => value?.toLocaleLowerCase('ko-KR').includes(normalized)));
  }, [entries, query]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBar title="모든 기억" back />
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={19} color={colors.textMuted} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="제목, 내용, 저자, 날짜 검색"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="모든 기억 검색"
          style={[styles.searchInput, { color: colors.text }]}
        />
        {query ? <AnimatedPressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setQuery('')} style={styles.clearSearch} pressedOpacity={0.64} scaleTo={0.9}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></AnimatedPressable> : null}
      </View>
      <View style={styles.resultMeta}><Text style={[styles.resultCount, { color: colors.text }]}>{query.trim() ? `${visibleEntries.length}개 찾음` : `${entries.length}개 기록`}</Text><Text style={[styles.resultHint, { color: colors.textMuted }]}>제목 · 내용 · 저자 · 날짜</Text></View>
      {loading && entries.length === 0 ? (
        <EntryListSkeleton />
      ) : (
        <FlatList
          ref={listRef}
          data={visibleEntries}
          keyExtractor={(item) => String(item.id)}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[styles.list, visibleEntries.length === 0 && styles.emptyList]}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <EntryCard entry={item} />}
          refreshing={loading}
          onRefresh={() => refresh()}
          ListHeaderComponent={error && entries.length > 0 ? <View accessibilityLiveRegion="polite" style={[styles.inlineError, { backgroundColor: colors.primarySoft }]}><Text style={[styles.inlineErrorText, { color: colors.text }]}>일부 기록을 새로고침하지 못했어요.</Text><AnimatedPressable accessibilityRole="button" accessibilityLabel="모든 기록 다시 불러오기" onPress={() => refresh()} style={styles.inlineRetry} pressedOpacity={0.7} scaleTo={0.96}><Ionicons name="refresh" size={18} color={colors.primary} /></AnimatedPressable></View> : null}
          ListHeaderComponentStyle={error && entries.length > 0 ? styles.listHeader : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="search-outline" size={40} color={colors.primary} /></View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{error ?? (query.trim() ? '검색 결과가 없어요' : '아직 저장한 기억이 없어요')}</Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{error ? '잠시 후 다시 시도해주세요.' : query.trim() ? '다른 검색어로 기억을 찾아보세요.' : '일기, 영화, 책 기록을 남기면 이곳에서 한 번에 찾아볼 수 있어요.'}</Text>
              {error ? <AnimatedPressable accessibilityRole="button" onPress={() => refresh()} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>다시 시도</Text></AnimatedPressable> : null}
              {!error && !query.trim() ? <AnimatedPressable accessibilityRole="button" onPress={() => router.push('/entry/new?kind=diary')} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>첫 기억 남기기</Text></AnimatedPressable> : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBox: { height: 48, marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15 },
  clearSearch: { width: 40, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  resultMeta: { minHeight: 28, paddingHorizontal: 18, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCount: { ...typography.label, fontVariant: ['tabular-nums'] },
  resultHint: typography.overline,
  list: { padding: 16, paddingBottom: 40 },
  listHeader: { paddingBottom: 12 },
  inlineError: { minHeight: 44, borderRadius: 12, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineErrorText: { ...typography.caption, flex: 1 },
  inlineRetry: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 70 },
  emptyIcon: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { ...typography.sectionTitle, marginBottom: 8 },
  emptyBody: { ...typography.body, textAlign: 'center' },
  retry: { marginTop: 18, minHeight: 44, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  retryText: { ...typography.button, color: '#fff' },
});
