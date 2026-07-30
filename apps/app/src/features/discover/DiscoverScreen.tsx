import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { ShimmerBlock, useShimmerAnimation } from '@/src/components/Skeleton';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { EntryKind, ENTRY_LABEL } from '@/src/types/entry';

type SearchResult = { id: string; title: string; creator?: string; year?: string; imageUri?: string };

const SEARCH_TIMEOUT_MS = 12_000;

async function fetchSearchJson(url: string, label: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${label} 검색에 실패했어요.`);
    return response.json();
  } catch (reason) {
    if (reason instanceof Error && reason.name === 'AbortError') {
      throw new Error(`${label} 검색 응답이 늦어요. 잠시 후 다시 시도해주세요.`);
    }
    throw reason;
  } finally {
    clearTimeout(timeout);
  }
}

async function searchBooks(query: string): Promise<SearchResult[]> {
  const data = await fetchSearchJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i`, '책');
  return (data.docs ?? [])
    .filter((item: any) => typeof item.key === 'string' && typeof item.title === 'string' && item.title.trim())
    .map((item: any) => ({ id: item.key, title: item.title.trim(), creator: item.author_name?.slice(0, 2).join(', '), year: String(item.first_publish_year ?? ''), imageUri: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : undefined }));
}

async function searchMovies(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (!apiKey) return [];
  const data = await fetchSearchJson(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ko-KR`, '영화');
  return (data.results ?? [])
    .filter((item: any) => item?.id != null && typeof item.title === 'string' && item.title.trim())
    .slice(0, 12)
    .map((item: any) => ({ id: String(item.id), title: item.title.trim(), year: item.release_date?.slice(0, 4), imageUri: item.poster_path ? `https://image.tmdb.org/t/p/w342${item.poster_path}` : undefined }));
}

export function DiscoverScreen() {
  const { kind: rawKind } = useLocalSearchParams<{ kind: string }>();
  const kind = (rawKind === 'movie' ? 'movie' : 'book') as EntryKind;
  const router = useRouter();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const searchVersion = useRef(0);

  const search = async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || loading) return;
    const version = searchVersion.current + 1;
    searchVersion.current = version;
    setLoading(true); setError(''); setResults([]);
    try {
      const nextResults = kind === 'book' ? await searchBooks(normalizedQuery) : await searchMovies(normalizedQuery);
      if (version !== searchVersion.current) return;
      setResults(nextResults);
      setSearched(true);
    } catch (reason) {
      if (version !== searchVersion.current) return;
      setError(reason instanceof Error ? reason.message : '검색에 실패했어요.');
      setSearched(true);
    } finally {
      if (version === searchVersion.current) setLoading(false);
    }
  };

  const openForm = (item?: SearchResult) => router.push({ pathname: '/entry/new', params: { kind, title: item?.title ?? query, sourceId: item?.id, creator: item?.creator, releaseYear: item?.year, imageUri: item?.imageUri } });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBar title={`${ENTRY_LABEL[kind]} 찾기`} close />
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="search" size={20} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search" autoFocus placeholder={`${ENTRY_LABEL[kind]} 제목을 검색하세요`} placeholderTextColor={colors.textMuted} accessibilityLabel={`${ENTRY_LABEL[kind]} 검색`} style={[styles.searchInput, { color: colors.text }]} />{query ? <AnimatedPressable accessibilityRole="button" accessibilityLabel="검색어 지우기" hitSlop={8} onPress={() => setQuery('')} style={styles.clearSearch} pressedOpacity={0.64} scaleTo={0.9}><Ionicons name="close-circle" size={19} color={colors.textMuted} /></AnimatedPressable> : null}</View>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="검색 실행" accessibilityState={{ busy: loading, disabled: !query.trim() || loading }} disabled={!query.trim() || loading} onPress={() => { Haptics.selectionAsync().catch(() => undefined); search(); }} style={[styles.searchButton, { backgroundColor: colors.primary, opacity: !query.trim() || loading ? 0.45 : 1 }]} pressedOpacity={0.82} scaleTo={0.96}>{loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.searchButtonText}>검색</Text>}</AnimatedPressable>
      </View>
      {kind === 'movie' && !process.env.EXPO_PUBLIC_TMDB_API_KEY ? <Text style={[styles.help, { color: colors.textMuted }]}>TMDB 키가 없어 직접 등록으로 열릴게요.</Text> : null}
      {loading ? <SearchResultsSkeleton /> : (
        <FlatList data={results} keyExtractor={(item) => item.id} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} removeClippedSubviews={Platform.OS === 'android'} contentContainerStyle={[styles.list, results.length === 0 && styles.emptyList]} ItemSeparatorComponent={() => <View style={{ height: 10 }} />} ListHeaderComponent={searched && results.length > 0 ? <View style={styles.resultHeader}><Text style={[styles.resultCount, { color: colors.text }]}>{results.length}개 결과</Text><Text style={[styles.resultHint, { color: colors.textMuted }]}>선택하면 기록 화면으로 이어져요</Text></View> : null} renderItem={({ item }) => (
          <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${item.title} 선택`} onPress={() => { Haptics.selectionAsync().catch(() => undefined); openForm(item); }} style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]} pressedOpacity={0.88} scaleTo={0.985}>{item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.cover} resizeMethod="resize" fadeDuration={160} /> : <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.primarySoft }]}><Ionicons name={kind === 'movie' ? 'film' : 'book'} size={25} color={colors.primary} /></View>}<View style={styles.resultText}><Text numberOfLines={2} style={[styles.resultTitle, { color: colors.text }]}>{item.title}</Text><Text style={{ color: colors.textMuted }}>{[item.creator, item.year].filter(Boolean).join(' · ')}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></AnimatedPressable>
        )} ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surfaceMuted }]}><View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={error ? 'cloud-offline-outline' : kind === 'movie' ? 'film-outline' : 'book-outline'} size={32} color={colors.primary} /></View><Text style={[styles.emptyTitle, { color: colors.text }]}>{error ? '검색을 잠시 쉬어갈게요' : searched ? '검색 결과가 없어요' : `${ENTRY_LABEL[kind]} 제목을 입력해보세요`}</Text><Text style={[styles.emptyBody, { color: colors.textMuted }]}>{error ?? (searched ? '직접 입력해 기록할 수 있어요.' : '검색 결과를 고르거나 검색 없이 직접 등록할 수 있어요.')}</Text>{error ? <AnimatedPressable accessibilityRole="button" onPress={search} style={[styles.retry, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.retryText}>다시 검색</Text></AnimatedPressable> : null}</View>} />
      )}
      <AnimatedPressable accessibilityRole="button" accessibilityLabel={`${ENTRY_LABEL[kind]} 직접 등록`} onPress={() => { Haptics.selectionAsync().catch(() => undefined); openForm(); }} style={[styles.manual, { borderColor: colors.primary, bottom: Math.max(insets.bottom, 10) }]} pressedOpacity={0.8} scaleTo={0.985}><Text style={[styles.manualText, { color: colors.primary }]}>검색 없이 직접 등록</Text></AnimatedPressable>
    </View>
  );
}

function SearchResultsSkeleton() {
  const { colors } = useAppTheme();
  const { progress, reduceMotion } = useShimmerAnimation();
  const blockProps = { progress, reduceMotion, baseColor: colors.surfaceMuted, highlightColor: colors.surface };

  return (
    <View accessibilityLabel="검색 결과를 불러오는 중" style={styles.skeletonList}>
      <ShimmerBlock {...blockProps} style={styles.skeletonHeader} />
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={[styles.result, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ShimmerBlock {...blockProps} style={styles.cover} />
          <View style={styles.skeletonText}>
            <ShimmerBlock {...blockProps} style={styles.skeletonTitle} />
            <ShimmerBlock {...blockProps} style={styles.skeletonMeta} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 9 }, searchBox: { flex: 1, height: 48, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 }, searchInput: { flex: 1, height: '100%', paddingLeft: 8, fontSize: 15 }, clearSearch: { width: 36, height: 44, alignItems: 'flex-end', justifyContent: 'center' }, searchButton: { height: 48, minWidth: 58, borderRadius: 15, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center' }, searchButtonText: { color: '#fff', fontWeight: '800' }, help: { paddingHorizontal: 18, fontSize: 12, marginBottom: 4 }, list: { padding: 16, paddingBottom: 128 }, emptyList: { flexGrow: 1 }, resultHeader: { minHeight: 30, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, resultCount: { fontSize: 13, fontWeight: '900' }, resultHint: { fontSize: 11 }, result: { borderWidth: 1, borderRadius: 17, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, cover: { width: 54, height: 72, borderRadius: 9 }, coverPlaceholder: { alignItems: 'center', justifyContent: 'center' }, resultText: { flex: 1, gap: 4 }, resultTitle: { fontSize: 16, fontWeight: '800' }, empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 42, borderRadius: 18, gap: 7 }, emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 7 }, emptyTitle: { fontSize: 18, fontWeight: '800' }, emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' }, retry: { minHeight: 44, marginTop: 10, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, retryText: { color: '#fff', fontSize: 14, fontWeight: '800' }, manual: { position: 'absolute', left: 16, right: 16, height: 52, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, manualText: { fontWeight: '800', fontSize: 16 }, skeletonList: { padding: 16, gap: 10 }, skeletonHeader: { width: 72, height: 13, borderRadius: 7, marginBottom: 2 }, skeletonText: { flex: 1, gap: 9 }, skeletonTitle: { width: '78%', height: 18, borderRadius: 8 }, skeletonMeta: { width: '48%', height: 13, borderRadius: 7 } });
