import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppBar } from '@/src/components/AppBar';
import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { useAppTheme } from '@/src/providers/ThemeProvider';
import { disableDailyReminder, loadReconciledReminderSettings, scheduleDailyReminder } from '@/src/services/reminder';

function hasPermission(status: Notifications.NotificationPermissionsStatus) {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function configureNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('momentry', {
    name: '모멘트리 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: '#24513F',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

export function NotificationsScreen() {
  const { colors } = useAppTheme();
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [hourText, setHourText] = useState('21');
  const [minuteText, setMinuteText] = useState('00');

  useFocusEffect(useCallback(() => {
    let active = true;
    void (async () => {
      setBusy(true);
      try {
        await configureNotificationChannel();
        const permission = await Notifications.getPermissionsAsync();
        const reminder = await loadReconciledReminderSettings();
        if (active) {
          setAllowed(hasPermission(permission));
          setReminderEnabled(reminder.enabled);
          setHourText(String(reminder.hour).padStart(2, '0'));
          setMinuteText(String(reminder.minute).padStart(2, '0'));
        }
      } catch {
        if (active) setMessage('알림 권한 상태를 확인하지 못했어요.');
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []));

  const requestPermission = async () => {
    setMessage(null);
    setBusy(true);
    Haptics.selectionAsync().catch(() => undefined);
    try {
      await configureNotificationChannel();
      const permission = await Notifications.requestPermissionsAsync();
      const nextAllowed = hasPermission(permission);
      setAllowed(nextAllowed);
      setMessage(nextAllowed ? '알림 권한을 허용했어요.' : '기기 설정에서 모멘트리 알림을 허용해주세요.');
      return nextAllowed;
    } catch {
      setMessage('알림 권한을 변경하지 못했어요.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const scheduleTest = async () => {
    if (!allowed) return requestPermission();
    setMessage(null);
    setBusy(true);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '모멘트리 알림 테스트',
          body: '기억을 남길 시간이 되었어요.',
          data: { url: '/notifications' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
          repeats: false,
          channelId: 'momentry',
        },
      });
      setMessage('2초 뒤 테스트 알림을 보낼게요.');
    } catch {
      setMessage('테스트 알림을 예약하지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const toggleReminder = async (nextEnabled: boolean) => {
    if (busy) return;
    setMessage(null);
    if (!nextEnabled) {
      setBusy(true);
      try {
        await disableDailyReminder();
        setReminderEnabled(false);
        setMessage('매일 알림을 껐어요.');
      } catch {
        setMessage('알림을 끄지 못했어요.');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!allowed) {
      const granted = await requestPermission();
      if (granted) await saveReminder();
      return;
    }
    await saveReminder();
  };

  const saveReminder = async () => {
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
      setMessage('알림 시간은 00:00부터 23:59 사이로 입력해주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    Haptics.selectionAsync().catch(() => undefined);
    try {
      await scheduleDailyReminder(hour, minute);
      setReminderEnabled(true);
      setHourText(String(hour).padStart(2, '0'));
      setMinuteText(String(minute).padStart(2, '0'));
      setMessage(`매일 ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}에 알려드릴게요.`);
    } catch {
      setMessage('매일 알림을 예약하지 못했어요. 권한과 시간을 확인해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AppBar title="알림 설정" back />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>기록을 잊지 않도록</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>알림 권한을 켜면 기기 리마인더와 모멘트리 알림을 받을 준비가 됩니다. 알림은 언제든 기기 설정에서 끌 수 있어요.</Text>
          <View style={[styles.status, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>{allowed ? '알림 권한 허용됨' : '알림 권한 꺼짐'}</Text>
          </View>
          <AnimatedPressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={allowed ? scheduleTest : requestPermission} style={[styles.button, { backgroundColor: colors.primary, opacity: busy ? 0.55 : 1 }]} pressedOpacity={0.84} scaleTo={0.985}>
            <Text style={styles.buttonText}>{allowed ? '테스트 알림 보내기' : '알림 권한 허용하기'}</Text>
          </AnimatedPressable>
          {!allowed ? <AnimatedPressable accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => undefined)} style={styles.settingsButton} pressedOpacity={0.68} scaleTo={0.98}><Text style={[styles.settingsText, { color: colors.primary }]}>기기 설정 열기</Text></AnimatedPressable> : null}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.reminderHeader}><View style={styles.reminderTitleWrap}><Text style={[styles.title, { color: colors.text }]}>매일 기록 알림</Text><Text style={[styles.body, { color: colors.textMuted }]}>원하는 시간에 기기에만 알림을 예약해요.</Text></View><Switch accessibilityLabel="매일 기록 알림" accessibilityState={{ checked: reminderEnabled, disabled: busy }} value={reminderEnabled} onValueChange={toggleReminder} disabled={busy} trackColor={{ false: colors.border, true: colors.primarySoft }} thumbColor={reminderEnabled ? colors.primary : colors.textMuted} /></View>
          <View style={styles.timeRow}><Text style={[styles.timeLabel, { color: colors.textMuted }]}>알림 시간</Text><View style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border }]}><TextInput accessibilityLabel="알림 시" keyboardType="number-pad" maxLength={2} value={hourText} onChangeText={setHourText} style={[styles.timeText, { color: colors.text }]} /><Text style={[styles.colon, { color: colors.textMuted }]}>:</Text><TextInput accessibilityLabel="알림 분" keyboardType="number-pad" maxLength={2} value={minuteText} onChangeText={setMinuteText} style={[styles.timeText, { color: colors.text }]} /></View><AnimatedPressable accessibilityRole="button" accessibilityState={{ disabled: busy || !allowed }} disabled={busy || !allowed} onPress={saveReminder} style={[styles.saveButton, { backgroundColor: colors.primary, opacity: busy || !allowed ? 0.45 : 1 }]} pressedOpacity={0.84} scaleTo={0.97}><Text style={styles.saveText}>저장</Text></AnimatedPressable></View>
        </View>
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 32 },
  card: { marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderRadius: 22, padding: 20 },
  title: { fontSize: 21, fontWeight: '900', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21 },
  status: { marginTop: 18, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  statusText: { fontSize: 13, fontWeight: '800' },
  button: { minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  settingsButton: { alignItems: 'center', paddingVertical: 16 },
  settingsText: { fontSize: 14, fontWeight: '800' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderTitleWrap: { flex: 1, gap: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  timeLabel: { flex: 1, fontSize: 13, fontWeight: '800' },
  timeInput: { height: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center' },
  timeText: { width: 30, textAlign: 'center', fontSize: 17, fontVariant: ['tabular-nums'] },
  colon: { fontSize: 17, fontWeight: '800' },
  saveButton: { height: 44, borderRadius: 12, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  message: { marginHorizontal: 20, marginTop: 16, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
