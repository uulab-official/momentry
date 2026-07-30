import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AnimatedDialog } from '@/src/components/AnimatedDialog';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { AppBar } from '@/src/components/AppBar';
import { SettingsRow } from '@/src/components/SettingsRow';
import { exportBackup, ImportCandidate, importBackup, pickBackup } from '@/src/services/backup';
import { listDeletedEntries } from '@/src/db/database';
import { useEntries } from '@/src/providers/EntriesProvider';
import { useAppTheme } from '@/src/providers/ThemeProvider';

type BusyAction = 'export' | 'import' | null;

export function SettingsScreen() {
  const router = useRouter();
  const { colors, mode } = useAppTheme();
  const { refresh } = useEntries();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingImport, setPendingImport] = useState<ImportCandidate | null>(null);
  const [deletedCount, setDeletedCount] = useState(0);
  const modeLabel = mode === 'system' ? '시스템' : mode === 'dark' ? '다크' : '라이트';

  useFocusEffect(useCallback(() => {
    let active = true;
    void listDeletedEntries().then((entries) => { if (active) setDeletedCount(entries.length); }).catch(() => undefined);
    return () => { active = false; };
  }, []));

  const runExport = async () => {
    setStatus(null);
    setBusy('export');
    Haptics.selectionAsync().catch(() => undefined);
    try {
      const result = await exportBackup();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setStatus(`${result.entryCount}개 기록과 최근 삭제 ${result.deletedEntryCount}개를 사진과 함께 백업했어요.`);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setStatus(error instanceof Error ? error.message : '백업 파일을 만들지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  const pickImport = async () => {
    setConfirmImport(false);
    setStatus(null);
    setBusy('import');
    Haptics.selectionAsync().catch(() => undefined);
    try {
      const candidate = await pickBackup();
      if (candidate) {
        setPendingImport(candidate);
        setConfirmImport(true);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '백업 파일을 가져오지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  const commitImport = async () => {
    if (!pendingImport) return;
    setConfirmImport(false);
    setStatus(null);
    setBusy('import');
    Haptics.selectionAsync().catch(() => undefined);
    try {
      const result = await importBackup(pendingImport);
      await refresh();
      setPendingImport(null);
      setDeletedCount(result.deletedEntryCount);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setStatus(`${result.entryCount}개 기록과 최근 삭제 ${result.deletedEntryCount}개를 가져왔어요.`);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setStatus(error instanceof Error ? error.message : '백업 파일을 가져오지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppBar title="설정" back />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.group, { borderColor: colors.border }]}>
          <SettingsRow icon="color-palette-outline" label="테마" value={modeLabel} onPress={() => router.push('/settings/theme')} />
          <SettingsRow icon="notifications-outline" label="알림 설정" onPress={() => router.push('/notifications')} />
          <SettingsRow icon="information-circle-outline" label="앱 정보" onPress={() => router.push('/settings/about')} />
        </View>
        <Text style={[styles.section, { color: colors.textMuted }]}>데이터</Text>
        <View style={[styles.group, { borderColor: colors.border }]}>
          <SettingsRow icon="share-outline" label="백업 내보내기" value={busy === 'export' ? '준비 중' : undefined} onPress={busy ? undefined : runExport} />
          <SettingsRow icon="document-attach-outline" label="백업 가져오기" value={busy === 'import' ? '가져오는 중' : undefined} onPress={busy ? undefined : () => setConfirmImport(true)} />
          <SettingsRow icon="trash-outline" label="최근 삭제" value={deletedCount > 0 ? `${deletedCount}개` : '비어 있음'} onPress={() => router.push('/settings/trash')} />
        </View>
        <View style={[styles.dataNote, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.dataNoteTitle, { color: colors.text }]}>사진과 최근 삭제 기록까지 한 파일에</Text>
          <Text style={[styles.dataNoteBody, { color: colors.textMuted }]}>백업 파일은 기기 밖에 직접 보관해야 앱 삭제나 기기 분실 뒤에도 가져올 수 있어요.</Text>
        </View>
        {status ? <View accessibilityLiveRegion="polite" style={[styles.status, { backgroundColor: colors.primarySoft }]}><Text style={[styles.statusText, { color: colors.text }]}>{status}</Text></View> : null}
        {busy ? <ActivityIndicator accessibilityLabel="데이터 처리 중" color={colors.primary} style={styles.busy} /> : null}
      </ScrollView>
      <AnimatedDialog visible={confirmImport} onRequestClose={() => { setConfirmImport(false); setPendingImport(null); }} dialogStyle={[styles.dialog, { backgroundColor: colors.surface }]}>
        <Text style={[styles.dialogTitle, { color: colors.text }]}>{pendingImport ? '이 백업을 가져올까요?' : '백업을 가져올까요?'}</Text>
        <Text style={[styles.dialogBody, { color: colors.textMuted }]}>{pendingImport ? `${pendingImport.entryCount}개 기록과 최근 삭제 ${pendingImport.deletedEntryCount}개가 들어 있어요. 내보낸 시각은 ${formatExportedAt(pendingImport.exportedAt)}입니다. 현재 기기의 기록은 이 백업으로 교체됩니다.` : '현재 기기의 기록과 최근 삭제 목록이 선택한 백업 파일로 교체됩니다. 먼저 현재 기록을 내보내 두는 것을 권장해요.'}</Text>
        <View style={styles.dialogActions}>
          <AnimatedPressable accessibilityRole="button" onPress={() => { setConfirmImport(false); setPendingImport(null); }} style={[styles.dialogButton, { backgroundColor: colors.surfaceMuted }]} pressedOpacity={0.72} scaleTo={0.98}><Text style={{ color: colors.text, fontWeight: '700' }}>취소</Text></AnimatedPressable>
          <AnimatedPressable accessibilityRole="button" onPress={pendingImport ? commitImport : pickImport} style={[styles.dialogButton, { backgroundColor: colors.primary }]} pressedOpacity={0.84} scaleTo={0.98}><Text style={{ color: '#fff', fontWeight: '800' }}>{pendingImport ? '가져오기' : '파일 선택'}</Text></AnimatedPressable>
        </View>
      </AnimatedDialog>
    </View>
  );
}

function formatExportedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '알 수 없음';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 32 },
  group: { marginHorizontal: 16, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  section: { fontSize: 12, fontWeight: '800', marginHorizontal: 21, marginBottom: 8, marginTop: 20 },
  dataNote: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 3 },
  dataNoteTitle: { fontSize: 13, fontWeight: '800' },
  dataNoteBody: { fontSize: 12, lineHeight: 18 },
  status: { margin: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  statusText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  busy: { marginTop: 10 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 22, padding: 22 },
  dialogTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  dialogBody: { fontSize: 14, lineHeight: 21 },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  dialogButton: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
