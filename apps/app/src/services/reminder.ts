import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_KEY = 'momentry.dailyReminder.v1';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 21,
  minute: 0,
  notificationId: null,
};

function isValidTime(hour: number, minute: number) {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23
    && Number.isInteger(minute) && minute >= 0 && minute <= 59;
}

function parseSettings(value: unknown): ReminderSettings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const candidate = value as Partial<ReminderSettings>;
  const hour = Number(candidate.hour);
  const minute = Number(candidate.minute);
  return {
    enabled: candidate.enabled === true,
    hour: isValidTime(hour, minute) ? hour : DEFAULT_SETTINGS.hour,
    minute: isValidTime(hour, minute) ? minute : DEFAULT_SETTINGS.minute,
    notificationId: typeof candidate.notificationId === 'string' ? candidate.notificationId : null,
  };
}

export async function loadReminderSettings() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return parseSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveReminderSettings(settings: ReminderSettings) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export async function loadReconciledReminderSettings() {
  const settings = await loadReminderSettings();
  if (!settings.enabled) return settings;
  if (settings.notificationId) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.some((notification) => notification.identifier === settings.notificationId)) {
      return settings;
    }
  }
  const disabled = { ...settings, enabled: false, notificationId: null };
  await saveReminderSettings(disabled);
  return disabled;
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  if (!isValidTime(hour, minute)) throw new Error('알림 시간을 확인해주세요.');
  const current = await loadReminderSettings();
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: '모멘트리 알림',
      body: '오늘의 순간을 한 줄 남겨볼까요?',
      data: { url: '/entry/new?kind=diary' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'momentry',
    },
  });
  try {
    await saveReminderSettings({ enabled: true, hour, minute, notificationId });
  } catch (error) {
    await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
    throw error;
  }
  if (current.notificationId && current.notificationId !== notificationId) {
    await Notifications.cancelScheduledNotificationAsync(current.notificationId).catch(() => undefined);
  }
  return notificationId;
}

export async function disableDailyReminder() {
  const current = await loadReminderSettings();
  if (current.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(current.notificationId);
  }
  await saveReminderSettings({ ...current, enabled: false, notificationId: null });
}
