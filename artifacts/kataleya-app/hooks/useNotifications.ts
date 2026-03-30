/**
 * useNotifications — iOS-only in Expo Go.
 *
 * expo-notifications crashes on Android in Expo Go from SDK 53+.
 * The static import itself throws before any Platform guard can run,
 * which breaks every screen that imports this hook.
 *
 * Fix: remove the static import entirely. Load the module dynamically
 * inside each function, guarded by Platform.OS === 'ios'. The dynamic
 * import pattern is identical to how backup.ts handles react-native-quick-crypto.
 *
 * For EAS native builds: restore static import + Platform.OS !== 'web' guards.
 * The native build includes the Android notification module; Expo Go does not.
 */

import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Sanctuary, Surface } from '@/utils/storage';

// Milestones (days) that earn a bloom notification
const MILESTONE_DAYS = [1, 7, 14, 30, 60, 90, 180, 365, 500, 730, 1000];

const MILESTONE_MESSAGES: Record<number, string> = {
  1: 'One full day. The orchid has opened its first bud.',
  7: 'Seven days. A week of growth in the sanctuary.',
  14: 'Two weeks. Your roots are deepening.',
  30: 'Thirty days. The orchid has bloomed.',
  60: 'Two months of quiet strength.',
  90: 'Ninety days. The season has changed.',
  180: 'Half a year. You have grown through every phase.',
  365: 'One year. The orchid has completed its first full cycle.',
  500: 'Five hundred days. Something rare is growing here.',
  730: 'Two years. The sanctuary stands.',
  1000: 'One thousand days. An extraordinary bloom.',
};

// ── Lazy loader ───────────────────────────────────────────────────────────────
// Returns the expo-notifications module on iOS only.
// On Android/web: returns null — callers must guard against null.
async function loadNotifications() {
  if (Platform.OS !== 'ios') return null;
  return import('expo-notifications');
}

// ── One-time handler init ─────────────────────────────────────────────────────
// setNotificationHandler must be called before any notifications fire.
// Called lazily on first use rather than at module load time.
let _handlerSet = false;
async function ensureHandler() {
  if (_handlerSet) return;
  const N = await loadNotifications();
  if (!N) return;
  _handlerSet = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ── Schedule a daily reminder notification ────────────────────────────────────
async function scheduleDailyReminder(hhmm: string) {
  const N = await loadNotifications();
  if (!N) return;
  await ensureHandler();

  const [hourStr, minStr] = hhmm.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minStr, 10);
  if (isNaN(hour) || isNaN(minute)) return;

  // Cancel before scheduling — prevents stacked triggers.
  await N.cancelAllScheduledNotificationsAsync();

  await N.scheduleNotificationAsync({
    content: {
      title: 'How are you feeling?',
      body: 'A moment of honesty is waiting in your sanctuary.',
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

// ── Cancel all scheduled notifications ───────────────────────────────────────
async function cancelDailyReminder() {
  const N = await loadNotifications();
  if (!N) return;
  await N.cancelAllScheduledNotificationsAsync();
}

// ── Exported: suppress today's reminder after mood log ────────────────────────
export async function suppressReminderForToday(): Promise<void> {
  await cancelDailyReminder();
}

// ── Send a milestone bloom notification immediately ───────────────────────────
async function fireMilestoneNotification(days: number) {
  const N = await loadNotifications();
  if (!N) return;
  await ensureHandler();

  const body = MILESTONE_MESSAGES[days] ?? `Day ${days}. Your orchid keeps growing.`;
  await N.scheduleNotificationAsync({
    content: {
      title: `Day ${days}`,
      body,
      data: { type: 'milestone', days },
    },
    trigger: null,
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useNotifications(daysSober: number) {
  // On mount: setup daily reminder if notifications are enabled.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;

    const setup = async () => {
      const enabled = await Surface.getNotifEnabled();
      if (!enabled || cancelled) return;

      const recentLogs = await Sanctuary.getMoodLogs(1);
      const alreadyLoggedToday =
        recentLogs.length > 0 &&
        new Date(recentLogs[0].ts).toDateString() === new Date().toDateString();

      if (alreadyLoggedToday) {
        await cancelDailyReminder();
        return;
      }

      const time = await Surface.getNotifReminderTime();
      await scheduleDailyReminder(time);
    };

    setup();
    return () => { cancelled = true; };
  }, []);

  // Check for milestone notifications whenever daysSober changes
  useEffect(() => {
    if (Platform.OS !== 'ios' || daysSober <= 0) return;
    let cancelled = false;

    const checkMilestone = async () => {
      if (cancelled) return;
      const enabled = await Surface.getNotifEnabled();
      if (!enabled) return;

      const lastNotified = await Surface.getLastNotifiedMilestone();
      if (!MILESTONE_DAYS.includes(daysSober)) return;
      if (daysSober <= lastNotified) return;

      await fireMilestoneNotification(daysSober);
      await Surface.setLastNotifiedMilestone(daysSober);
    };

    checkMilestone();
    return () => { cancelled = true; };
  }, [daysSober]);

  const setReminderTime = useCallback(async (hhmm: string) => {
    if (Platform.OS !== 'ios') return;
    await Surface.setNotifReminderTime(hhmm);
    const enabled = await Surface.getNotifEnabled();
    if (enabled) await scheduleDailyReminder(hhmm);
  }, []);

  const setEnabled = useCallback(async (v: boolean) => {
    await Surface.setNotifEnabled(v);
    if (!v) {
      await cancelDailyReminder();
    } else {
      const time = await Surface.getNotifReminderTime();
      await scheduleDailyReminder(time);
    }
  }, []);

  const suppressTodaysReminder = useCallback(async () => {
    await cancelDailyReminder();
  }, []);

  return { setReminderTime, setEnabled, suppressTodaysReminder };
}
