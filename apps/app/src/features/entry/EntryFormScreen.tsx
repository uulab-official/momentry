import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '@/src/components/AppBar';
import { AnimatedDialog } from '@/src/components/AnimatedDialog';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { ConfirmDialog } from '@/src/components/ConfirmDialog';
import { ShimmerBlock, useShimmerAnimation } from '@/src/components/Skeleton';
import { goBackOrHome } from '@/src/navigation/goBackOrHome';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { typography } from '@/src/theme/tokens';
import { EntryDraft, EntryKind, ENTRY_LABEL } from '@/src/types/entry';

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

function localDateString(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function isValidEntryDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
    && value >= '2000-01-01'
    && value <= localDateString();
}

function validKind(value: string | undefined): EntryKind {
  return value === 'movie' || value === 'book' || value === 'diary' ? value : 'diary';
}

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 20_000;
type FormSnapshot = { title: string; content: string; rating: number; imageUri: string; date: string };
type Notice = { title: string; message: string };

export function EntryFormScreen() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { add, find, update } = useEntries();
  const rawId = first(params.id);
  const editingId = rawId && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
  const kind = validKind(first(params.kind));
  const today = useMemo(() => localDateString(), []);
  const [title, setTitle] = useState(first(params.title) ?? '');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(kind === 'diary' ? 0 : 3);
  const [imageUri, setImageUri] = useState(first(params.imageUri) ?? '');
  const [date, setDate] = useState(today);
  const [dateDraft, setDateDraft] = useState(today);
  const [dateError, setDateError] = useState<string | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(editingId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'content' | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<FormSnapshot>(() => ({ title: first(params.title) ?? '', content: '', rating: kind === 'diary' ? 0 : 3, imageUri: first(params.imageUri) ?? '', date: today }));
  const navigation = useNavigation();
  const allowRemove = useRef(false);
  const pendingDiscardAction = useRef<(() => void) | null>(null);

  const loadEntry = useCallback(async () => {
    if (!editingId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const entry = await find(editingId);
      if (!entry) {
        setLoadError('이미 삭제되었거나 이동할 수 없는 기록이에요.');
        return;
      }
      setTitle(entry.title);
      setContent(entry.content);
      setRating(entry.rating);
      setImageUri(entry.imageUri ?? '');
      setDate(entry.entryDate);
      setDateDraft(entry.entryDate);
      setInitialSnapshot({ title: entry.title, content: entry.content, rating: entry.rating, imageUri: entry.imageUri ?? '', date: entry.entryDate });
    } catch {
      setLoadError('기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [editingId, find]);

  useEffect(() => {
    if (!editingId) return;
    let active = true;
    void (async () => {
      try {
        const entry = await find(editingId);
        if (!active) return;
        if (!entry) {
          setLoadError('이미 삭제되었거나 이동할 수 없는 기록이에요.');
          return;
        }
        setTitle(entry.title);
        setContent(entry.content);
        setRating(entry.rating);
        setImageUri(entry.imageUri ?? '');
        setDate(entry.entryDate);
        setDateDraft(entry.entryDate);
        setInitialSnapshot({ title: entry.title, content: entry.content, rating: entry.rating, imageUri: entry.imageUri ?? '', date: entry.entryDate });
      } catch {
        if (active) setLoadError('기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [editingId, find]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.78,
        allowsEditing: true,
        aspect: kind === 'diary' ? [4, 3] : [2, 3],
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        Haptics.selectionAsync().catch(() => undefined);
      }
    } catch {
      setNotice({ title: '사진을 불러오지 못했어요', message: '사진 접근 권한과 저장 공간을 확인해주세요.' });
    }
  };

  const saveDate = () => {
    if (!isValidEntryDate(dateDraft)) {
      setDateError(`2000-01-01부터 ${today} 사이의 날짜를 입력해주세요.`);
      return;
    }
    setDateError(null);
    setDate(dateDraft);
    setDateOpen(false);
  };

  const save = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle || saving) return;
    if (normalizedTitle.length > MAX_TITLE_LENGTH) {
      setNotice({ title: '제목이 너무 길어요', message: `제목은 ${MAX_TITLE_LENGTH}자 이내로 입력해주세요.` });
      return;
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      setNotice({ title: '내용이 너무 길어요', message: `내용은 ${MAX_CONTENT_LENGTH.toLocaleString()}자 이내로 입력해주세요.` });
      return;
    }
    const draft: EntryDraft = {
      kind,
      title: normalizedTitle,
      content,
      entryDate: date,
      rating,
      imageUri: imageUri || null,
      sourceId: first(params.sourceId) ?? null,
      creator: first(params.creator) ?? null,
      releaseYear: first(params.releaseYear) ?? null,
    };
    setSaving(true);
    try {
      if (editingId) {
        const existing = await find(editingId);
        if (!existing) throw new Error('기록을 찾지 못했어요.');
        await update(editingId, {
          ...draft,
          kind: existing.kind,
          sourceId: existing.sourceId,
          creator: existing.creator,
          releaseYear: existing.releaseYear,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        allowRemove.current = true;
        goBackOrHome(router);
      } else {
        const id = await add(draft);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        allowRemove.current = true;
        router.replace(`/entry/${id}`);
      }
    } catch (reason) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setNotice({ title: '저장하지 못했어요', message: reason instanceof Error ? reason.message : '잠시 후 다시 시도해주세요.' });
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = title !== initialSnapshot.title
    || content !== initialSnapshot.content
    || rating !== initialSnapshot.rating
    || imageUri !== initialSnapshot.imageUri
    || date !== initialSnapshot.date;

  const requestBack = () => {
    if (!hasUnsavedChanges || saving) {
      goBackOrHome(router);
      return;
    }
    pendingDiscardAction.current = () => {
      allowRemove.current = true;
      goBackOrHome(router);
    };
    setDiscardOpen(true);
  };

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (allowRemove.current) {
      allowRemove.current = false;
      return;
    }
    if (loading || saving || !hasUnsavedChanges) return;
    event.preventDefault();
    pendingDiscardAction.current = () => {
      allowRemove.current = true;
      navigation.dispatch(event.data.action);
    };
    setDiscardOpen(true);
  }), [hasUnsavedChanges, loading, navigation, saving]);

  const discardChanges = () => {
    const action = pendingDiscardAction.current;
    pendingDiscardAction.current = null;
    setDiscardOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    action?.();
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppBar title={`${ENTRY_LABEL[kind]} 수정`} close />
        <EntryFormSkeleton kind={kind} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AppBar title={`${ENTRY_LABEL[kind]} 수정`} close />
        <View style={styles.loadError}>
          <View style={[styles.loadErrorIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="document-text-outline" size={34} color={colors.primary} />
          </View>
          <Text style={[styles.loadErrorTitle, { color: colors.text }]}>기록을 열지 못했어요</Text>
          <Text style={[styles.loadErrorBody, { color: colors.textMuted }]}>{loadError}</Text>
          <View style={styles.loadErrorActions}>
            <AnimatedPressable accessibilityRole="button" onPress={() => void loadEntry()} style={[styles.loadErrorButton, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={styles.loadErrorPrimaryText}>다시 시도</Text></AnimatedPressable>
            <AnimatedPressable accessibilityRole="button" onPress={() => goBackOrHome(router)} style={[styles.loadErrorButton, { backgroundColor: colors.surfaceMuted }]} pressedOpacity={0.72} scaleTo={0.98}><Text style={[styles.loadErrorSecondaryText, { color: colors.text }]}>돌아가기</Text></AnimatedPressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppBar title={`${ENTRY_LABEL[kind]} ${editingId ? '수정' : '기록'}`} close onBack={requestBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 116 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel={imageUri ? '사진 바꾸기' : '사진 선택'} accessibilityState={{ selected: Boolean(imageUri) }} onPress={pickImage} style={[styles.imagePicker, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} pressedOpacity={0.86} scaleTo={0.99}>
            {imageUri ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <><Ionicons name="image-outline" size={34} color={colors.primary} /><Text style={{ color: colors.textMuted }}>사진을 추가해보세요</Text></>}
          </AnimatedPressable>
          {imageUri ? <AnimatedPressable accessibilityRole="button" accessibilityLabel="사진 제거" onPress={() => { Haptics.selectionAsync().catch(() => undefined); setImageUri(''); }} style={[styles.removeImage, { backgroundColor: colors.surface }]} pressedOpacity={0.72} scaleTo={0.9}><Ionicons name="close" size={20} color={colors.text} /></AnimatedPressable> : null}
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>날짜</Text>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel={`기록 날짜 ${date} 변경`} onPress={() => { Haptics.selectionAsync().catch(() => undefined); setDateDraft(date); setDateOpen(true); }} style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]} pressedOpacity={0.86} scaleTo={0.99}><Ionicons name="calendar-outline" size={21} color={colors.primary} /><Text style={[styles.dateText, { color: colors.text }]}>{date}</Text><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></AnimatedPressable>
        </View>
        <View style={styles.field}>
          <View style={styles.fieldHeader}><Text style={[styles.label, { color: colors.text }]}>제목</Text><Text style={[styles.counter, { color: colors.textMuted }]}>{title.length}/{MAX_TITLE_LENGTH}</Text></View>
          <TextInput value={title} maxLength={MAX_TITLE_LENGTH} onChangeText={setTitle} onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)} accessibilityLabel="기록 제목" returnKeyType="next" placeholder={kind === 'diary' ? '오늘의 모멘트' : `${ENTRY_LABEL[kind]} 제목`} placeholderTextColor={colors.textMuted} selectionColor={colors.primary} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: focusedField === 'title' ? colors.primary : colors.border }]} />
          <Text style={[styles.helper, { color: colors.textMuted }]}>{title.trim() ? '제목은 기억 목록에서 가장 먼저 보여요.' : '제목을 입력하면 저장할 수 있어요.'}</Text>
        </View>
        {kind !== 'diary' ? <View style={styles.field}><View style={styles.ratingHeader}><Text style={[styles.label, { color: colors.text }]}>나의 별점</Text><View style={[styles.ratingValue, { backgroundColor: colors.primarySoft }]}><Text style={[styles.ratingValueText, { color: colors.primary }]}>{rating}점</Text></View></View><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <AnimatedPressable key={star} accessibilityRole="radio" accessibilityLabel={`${star}점`} accessibilityState={{ selected: star === rating }} onPress={() => { Haptics.selectionAsync().catch(() => undefined); setRating(star); }} hitSlop={5} pressedOpacity={0.68} scaleTo={0.88}><Ionicons name={star <= rating ? 'star' : 'star-outline'} size={31} color={colors.primary} /></AnimatedPressable>)}</View><Text style={[styles.ratingHint, { color: colors.textMuted }]}>별을 눌러 이 순간의 여운을 남겨보세요.</Text></View> : null}
        <View style={styles.field}>
          <View style={styles.fieldHeader}><Text style={[styles.label, { color: colors.text }]}>내용</Text><Text style={[styles.counter, { color: colors.textMuted }]}>{content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}</Text></View>
          <TextInput value={content} maxLength={MAX_CONTENT_LENGTH} onChangeText={setContent} onFocus={() => setFocusedField('content')} onBlur={() => setFocusedField(null)} accessibilityLabel="기록 내용" multiline textAlignVertical="top" placeholder="기억하고 싶은 순간을 자유롭게 적어보세요." placeholderTextColor={colors.textMuted} selectionColor={colors.primary} style={[styles.input, styles.textarea, { color: colors.text, backgroundColor: colors.surface, borderColor: focusedField === 'content' ? colors.primary : colors.border }]} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 12), borderColor: colors.border }]}>
        <AnimatedPressable accessibilityRole="button" accessibilityState={{ disabled: !title.trim() || saving, busy: saving }} disabled={!title.trim() || saving} onPress={save} style={[styles.save, { backgroundColor: colors.primary, opacity: !title.trim() || saving ? 0.4 : 1 }]} pressedOpacity={0.85} scaleTo={0.985}>
          <View style={styles.saveContent}>{saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={20} color="#fff" />}<Text style={styles.saveText}>{saving ? '저장 중…' : editingId ? '수정 완료' : '기억 저장하기'}</Text></View>
        </AnimatedPressable>
      </View>
      <AnimatedDialog visible={dateOpen} onRequestClose={() => setDateOpen(false)} dialogStyle={[styles.dateDialog, { backgroundColor: colors.surface }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dateDialogContent}>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>기록 날짜</Text>
          <Text style={{ color: colors.textMuted }}>YYYY-MM-DD 형식으로 입력해주세요.</Text>
          <TextInput autoFocus accessibilityLabel="기록 날짜" accessibilityHint={dateError ?? '연도 네 자리, 월 두 자리, 일 두 자리로 입력'} keyboardType="numbers-and-punctuation" maxLength={10} value={dateDraft} onChangeText={(value) => { setDateDraft(value); if (dateError) setDateError(null); }} placeholder="2026-07-23" placeholderTextColor={colors.textMuted} style={[styles.dateInput, { color: colors.text, borderColor: dateError ? colors.tint : colors.border, backgroundColor: colors.background }]} />
          {dateError ? <Text accessibilityLiveRegion="polite" style={[styles.dateError, { color: colors.tint }]}>{dateError}</Text> : null}
          <AnimatedPressable accessibilityRole="button" onPress={() => { setDateDraft(today); setDateError(null); }} pressedOpacity={0.68} scaleTo={0.98}><Text style={[styles.today, { color: colors.primary }]}>오늘로 설정</Text></AnimatedPressable>
          <View style={styles.dialogActions}>
            <AnimatedPressable accessibilityRole="button" onPress={() => { setDateOpen(false); setDateError(null); }} style={[styles.dialogButton, { backgroundColor: colors.surfaceMuted }]} pressedOpacity={0.72} scaleTo={0.98}><Text style={[typography.button, { color: colors.text }]}>취소</Text></AnimatedPressable>
            <AnimatedPressable accessibilityRole="button" onPress={saveDate} style={[styles.dialogButton, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={[typography.button, { color: '#fff' }]}>적용</Text></AnimatedPressable>
          </View>
        </KeyboardAvoidingView>
      </AnimatedDialog>
      <ConfirmDialog
        visible={Boolean(notice)}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
      />
      <ConfirmDialog
        visible={discardOpen}
        title="작성 중인 내용을 버릴까요?"
        message="저장하지 않은 제목, 내용, 사진과 별점은 사라져요."
        confirmLabel="버리기"
        cancelLabel="계속 작성"
        destructive
        onCancel={() => {
          pendingDiscardAction.current = null;
          setDiscardOpen(false);
        }}
        onConfirm={discardChanges}
      />
    </KeyboardAvoidingView>
  );
}

function EntryFormSkeleton({ kind }: { kind: EntryKind }) {
  const { colors } = useAppTheme();
  const { progress, reduceMotion } = useShimmerAnimation();
  const blockProps = {
    progress,
    reduceMotion,
    baseColor: colors.surfaceMuted,
    highlightColor: colors.surface,
  };

  return (
    <View accessibilityLabel="기록을 불러오는 중" style={styles.skeletonContent}>
      <ShimmerBlock {...blockProps} style={styles.skeletonImage} />
      <View style={styles.skeletonField}>
        <ShimmerBlock {...blockProps} style={styles.skeletonLabel} />
        <ShimmerBlock {...blockProps} style={styles.skeletonInput} />
      </View>
      <View style={styles.skeletonField}>
        <ShimmerBlock {...blockProps} style={styles.skeletonLabel} />
        <ShimmerBlock {...blockProps} style={styles.skeletonInput} />
      </View>
      {kind !== 'diary' ? (
        <View style={styles.skeletonField}>
          <ShimmerBlock {...blockProps} style={styles.skeletonLabel} />
          <View style={styles.skeletonStars}>
            {[0, 1, 2, 3, 4].map((star) => (
              <ShimmerBlock key={star} {...blockProps} style={styles.skeletonStar} />
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.skeletonField}>
        <ShimmerBlock {...blockProps} style={styles.skeletonLabel} />
        <ShimmerBlock {...blockProps} style={styles.skeletonTextarea} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 16, gap: 22 },
  imagePicker: { height: 220, borderRadius: 22, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 9 },
  removeImage: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 3px 6px rgba(0, 0, 0, 0.18)' },
      default: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, elevation: 3 },
    }),
  },
  field: { gap: 9 }, fieldHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }, label: typography.label, counter: { ...typography.caption, fontVariant: ['tabular-nums'] }, helper: typography.caption,
  input: { ...typography.body, borderWidth: 1.5, minHeight: 52, borderRadius: 15, paddingHorizontal: 15, fontSize: 16 },
  dateButton: { borderWidth: 1, height: 52, borderRadius: 15, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { ...typography.body, flex: 1, fontSize: 16, fontVariant: ['tabular-nums'] },
  textarea: { minHeight: 180, paddingTop: 15, lineHeight: 23 },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingValue: { minHeight: 28, borderRadius: 9, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  ratingValueText: { ...typography.caption, fontVariant: ['tabular-nums'] },
  stars: { flexDirection: 'row', gap: 8 },
  ratingHint: typography.caption,
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12 },
  save: { height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, saveContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, saveText: { ...typography.button, color: '#fff' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 20 },
  dateDialog: { width: '100%', maxWidth: 360, padding: 22, borderRadius: 22 }, dateDialogContent: { gap: 10 }, dialogTitle: typography.screenTitle,
  dateInput: { ...typography.body, borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 14, fontSize: 16, marginTop: 6, fontVariant: ['tabular-nums'] },
  dateError: typography.caption,
  today: { ...typography.label, alignSelf: 'flex-end' }, dialogActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  dialogButton: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  skeletonContent: { padding: 16, gap: 22 },
  skeletonImage: { height: 220, borderRadius: 22 },
  skeletonField: { gap: 9 },
  skeletonLabel: { width: 46, height: 14, borderRadius: 7 },
  skeletonInput: { height: 52, borderRadius: 15 },
  skeletonTextarea: { height: 180, borderRadius: 15 },
  skeletonStars: { flexDirection: 'row', gap: 8 },
  skeletonStar: { width: 31, height: 31, borderRadius: 8 },
  loadError: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  loadErrorIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  loadErrorTitle: typography.screenTitle,
  loadErrorBody: { ...typography.body, marginTop: 8, textAlign: 'center' },
  loadErrorActions: { width: '100%', maxWidth: 340, marginTop: 22, gap: 10 },
  loadErrorButton: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loadErrorPrimaryText: { ...typography.button, color: '#FFFFFF' },
  loadErrorSecondaryText: typography.button,
});
