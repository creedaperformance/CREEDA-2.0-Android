import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY = 'creeda:onboarding-v2:notification-ids';
const CHANNEL_ID = 'onboarding-v2';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ReminderResult =
  | { scheduled: true; ids: string[] }
  | { scheduled: false; ids: string[]; reason: 'permission_denied' | 'platform_unavailable' };

async function readNotificationIds() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function storeNotificationIds(ids: string[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
}

async function ensureNotificationPermissions() {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Creeda onboarding',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function scheduledDate(daysFromNow: number, hour: number, minute: number) {
  const next = new Date();
  next.setDate(next.getDate() + daysFromNow);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

async function scheduleAndStore(
  requests: Notifications.NotificationRequestInput[]
): Promise<ReminderResult> {
  const allowed = await ensureNotificationPermissions();
  const existingIds = await readNotificationIds();
  if (!allowed) return { scheduled: false, ids: existingIds, reason: 'permission_denied' };

  const newIds: string[] = [];
  for (const request of requests) {
    const id = await Notifications.scheduleNotificationAsync(request);
    newIds.push(id);
  }

  const ids = [...existingIds, ...newIds];
  await storeNotificationIds(ids);
  return { scheduled: true, ids };
}

export async function cancelOnboardingV2Reminders() {
  const ids = await readNotificationIds();
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await storeNotificationIds([]);
  return ids.length;
}

export async function scheduleOnboardingV2DailyRitualReminder(hour = 7, minute = 0) {
  return scheduleAndStore([
    {
      content: {
        title: 'Creeda daily ritual',
        body: 'Log energy, body feel, and mental load before training.',
        data: { route: '/daily-ritual', reminderType: 'onboarding_v2_daily_ritual' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: CHANNEL_ID,
        hour,
        minute,
      },
    },
  ]);
}

export async function scheduleOnboardingV2Phase2Reminders(hour = 19, minute = 0) {
  const requests = Array.from({ length: 7 }, (_, index) => ({
    content: {
      title: `Creeda Phase 2 Day ${index + 1}`,
      body: 'Capture one diagnostic baseline when you are ready.',
      data: {
        route: '/onboarding-phase-2',
        reminderType: 'onboarding_v2_phase2',
        dayIndex: index + 1,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      channelId: CHANNEL_ID,
      date: scheduledDate(index, hour, minute),
    },
  }));

  return scheduleAndStore(requests);
}

export async function scheduleOnboardingV2RetestReminders(hour = 19, minute = 0) {
  const requests = [28, 56].map((daysFromNow) => ({
    content: {
      title: 'Creeda baseline retest',
      body: 'Repeat key diagnostics so the engine can lock confidence with fresh data.',
      data: {
        route: '/onboarding-phase-2',
        reminderType: 'onboarding_v2_retest',
        daysFromNow,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      channelId: CHANNEL_ID,
      date: scheduledDate(daysFromNow, hour, minute),
    },
  }));

  return scheduleAndStore(requests);
}
