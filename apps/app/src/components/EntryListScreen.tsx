import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useScrollToTop } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, FlatList, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppBar, AppBarAction } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { EntryCard } from '@/src/components/EntryCard';
import { EntryListSkeleton } from '@/src/components/EntryListSkeleton';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { Entry, EntryKind, ENTRY_LABEL } from '@/src/types/entry';

export function EntryListScreen({ kind }: { kind: EntryKind }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { entriesFor, loadingFor, errorFor, refresh } = useEntries();
  const listRef = useRef<FlatList<Entry>>(null);
  const searchInputRef = useRef<TextInput>(null);
  const [searchProgress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [oldestFirst, setOldestFirst] = useState(false);

  useFocusEffect(useCallback(() => { refresh(kind); }, [kind, refresh]));
  useScrollToTop(listRef);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduceMotion(enabled); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    searchProgress.stopAnimation();
    if (reduceMotion) {
      searchProgress.setValue(searching ? 1 : 0);
      if (searching) searchInputRef.current?.focus();
      return;
    }
    if (searching) searchInputRef.current?.focus();
    Animated.timing(searchProgress, {
      toValue: searching ? 1 : 0,
      duration: searching ? 220 : 170,
      easing: searching ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [reduceMotion, searchProgress, searching]);

  const entries = entriesFor(kind);
  const loading = loadingFor(kind);
  const error = errorFor(kind);

  const openCreate = () => {
    if (kind === 'diary') router.push('/entry/new?kind=diary');
    else router.push(`/discover/${kind}`);
  };

  const openCreateWithFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    openCreate();
  };

  const toggleSearch = () => {
    if (searching) setQuery('');
    setSearching((current) => !current);
  };

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ko-KR');
    const filtered = normalized
      ? entries.filter((entry) => [entry.title, entry.content, entry.creator, entry.releaseYear, entry.entryDate].some((value) => value?.toLocaleLowerCase('ko-KR').includes(normalized)))
      : entries;
    return oldestFirst ? [...filtered].reverse() : filtered;
  }, [entries, oldestFirst, query]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBar
        title={kind === 'diary' ? '모멘트리' : ENTRY_LABEL[kind]}
        right={<><AppBarAction icon={searching ? 'close' : 'search'} label={searching ? '검색 닫기' : '기록 검색'} onPress={toggleSearch} />{kind === 'diary' ? <AppBarAction icon="notifications-outline" label="알림" onPress={() => router.push('/notifications')} /> : null}</>}
      />
      <Animated.View
        pointerEvents={searching ? 'auto' : 'none'}
        aria-hidden={!searching}
        accessibilityElementsHidden={!searching}
        importantForAccessibility={searching ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.toolsClip,
          {
            height: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 54] }),
            opacity: searchProgress,
            transform: [{ translateY: searchProgress.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) }],
          },
        ]}>
        <View style={styles.tools}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={19} color={colors.textMuted} />
            <TextInput ref={searchInputRef} editable={searching} value={query} onChangeText={setQuery} placeholder="제목, 내용, 저자, 날짜 검색" placeholderTextColor={colors.textMuted} accessibilityLabel="기록 검색" style={[styles.searchInput, { color: colors.text }]} />
            {query ? <AnimatedPressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setQuery('')} style={styles.clearSearch} pressedOpacity={0.64} scaleTo={0.9}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></AnimatedPressable> : null}
          </View>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel={oldestFirst ? '최신순으로 정렬' : '오래된순으로 정렬'} accessibilityState={{ selected: oldestFirst }} onPress={() => { Haptics.selectionAsync().catch(() => undefined); setOldestFirst((current) => !current); }} style={[styles.sortButton, { backgroundColor: colors.surface, borderColor: colors.border }]} pressedOpacity={0.76} scaleTo={0.97}><Ionicons name={oldestFirst ? 'arrow-up' : 'arrow-down'} size={18} color={colors.primary} /><Text style={[styles.sortText, { color: colors.text }]}>{oldestFirst ? '오래된순' : '최신순'}</Text></AnimatedPressable>
        </View>
      </Animated.View>
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
          onRefresh={() => refresh(kind)}
          ListHeaderComponent={entries.length > 0 ? <View style={styles.headerContent}><View style={styles.listHeader}><Text style={[styles.count, { color: colors.text }]}>{query.trim() ? `${visibleEntries.length}개 찾음` : `${entries.length}개 기록`}</Text><Text style={[styles.orderHint, { color: colors.textMuted }]}>{oldestFirst ? '오래된 기록부터' : '최근 기록부터'}</Text></View>{error ? <View accessibilityLiveRegion="polite" style={[styles.inlineError, { backgroundColor: colors.primarySoft }]}><Text style={[styles.inlineErrorText, { color: colors.text }]}>새로고침하지 못했어요. 기존 기록을 보여드려요.</Text><AnimatedPressable accessibilityRole="button" accessibilityLabel="기록 다시 불러오기" onPress={() => refresh(kind)} style={styles.inlineRetry} pressedOpacity={0.7} scaleTo={0.96}><Ionicons name="refresh" size={18} color={colors.primary} /></AnimatedPressable></View> : null}</View> : null}
          ListHeaderComponentStyle={styles.listHeaderContainer}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={kind === 'diary' ? 'leaf-outline' : kind === 'movie' ? 'film-outline' : 'book-outline'} size={42} color={colors.primary} /></View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{error ?? (query.trim() ? '검색 결과가 없어요' : `첫 번째 ${ENTRY_LABEL[kind]}를 남겨보세요`)}</Text>
              <Text style={[styles.emptyBody, { color: colors.textMuted }]}>{error ? '잠시 후 다시 시도해주세요.' : query.trim() ? '다른 검색어로 기억을 찾아보세요.' : <>오늘의 마음과 감상을 모으면{`\n`}나만의 기억 나무가 자라요.</>}</Text>
              {error ? <AnimatedPressable onPress={() => refresh(kind)} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>다시 시도</Text></AnimatedPressable> : null}
              {!error && !query.trim() ? <AnimatedPressable accessibilityRole="button" accessibilityLabel={`첫 ${ENTRY_LABEL[kind]} 남기기`} onPress={openCreateWithFeedback} style={[styles.emptyAction, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Ionicons name="add" size={20} color="#fff" /><Text style={styles.emptyActionText}>첫 {ENTRY_LABEL[kind]} 남기기</Text></AnimatedPressable> : null}
            </View>
          }
        />
      )}
      {entries.length > 0 ? <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${ENTRY_LABEL[kind]} 추가`} onPress={openCreateWithFeedback} style={[styles.fab, { backgroundColor: colors.primary }]} pressedOpacity={0.86} scaleTo={0.9}>
        <Ionicons name="add" size={30} color="#fff" />
      </AnimatedPressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolsClip: { flexShrink: 0, overflow: 'hidden' },
  tools: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  searchBox: { flex: 1, height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, height: '100%', fontSize: 15 },
  clearSearch: { width: 40, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' },
  sortButton: { height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { fontSize: 12, fontWeight: '800' },
  list: { padding: 16, paddingBottom: 120 },
  listHeaderContainer: { paddingBottom: 12 },
  headerContent: { gap: 9 },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  inlineError: { minHeight: 44, borderRadius: 12, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineErrorText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  inlineRetry: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 14, fontWeight: '800' },
  orderHint: { fontSize: 12 },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '800', marginBottom: 8 },
  emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyAction: { minHeight: 48, marginTop: 22, borderRadius: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  retry: { marginTop: 18, minHeight: 44, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 5px 10px rgba(0, 0, 0, 0.2)' },
      default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
    }),
  },
});
