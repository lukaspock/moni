// CONTRACT (owner: `onboarding` agent). Local meal-logging reminders via expo-notifications.
// No push/server involvement — everything is scheduled on-device.
import * as Notifications from 'expo-notifications';
import { useCallback } from 'react';

import i18n from '../../i18n';
import type { MealType } from '../../domain';
import { useReminderStore } from './reminderStore';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

export type MealReminder = {
  meal: Extract<MealType, 'breakfast' | 'lunch' | 'dinner'>;
  hour: number;
  minute: number;
};

/** Gentle defaults: one nudge per main meal, never late at night. */
export const DEFAULT_MEAL_REMINDERS: MealReminder[] = [
  { meal: 'breakfast', hour: 9, minute: 0 },
  { meal: 'lunch', hour: 13, minute: 0 },
  { meal: 'dinner', hour: 19, minute: 30 },
];

const ID_PREFIX = 'moeni-meal-';

function toPermission(status: Notifications.NotificationPermissionsStatus): ReminderPermission {
  if (status.granted) return 'granted';
  const ios = status.ios?.status;
  if (ios === Notifications.IosAuthorizationStatus.PROVISIONAL || ios === Notifications.IosAuthorizationStatus.EPHEMERAL) {
    return 'granted';
  }
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Shows the system permission prompt (only the first time; afterwards returns the stored answer). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  const status = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return toPermission(status);
}

function reminderContent(meal: MealReminder['meal']): Notifications.NotificationContentInput {
  const t = i18n.t.bind(i18n);
  switch (meal) {
    case 'breakfast':
      return { title: t('notifications.meal.breakfast.title'), body: t('notifications.meal.breakfast.body') };
    case 'lunch':
      return { title: t('notifications.meal.lunch.title'), body: t('notifications.meal.lunch.body') };
    case 'dinner':
      return { title: t('notifications.meal.dinner.title'), body: t('notifications.meal.dinner.body') };
  }
}

/** Removes all møni meal reminders (other scheduled notifications, e.g. rest timers, stay). */
export async function cancelMealReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * (Re-)schedules daily meal reminders in the *current* app language. Idempotent
 * (cancels ours first). Call again after a language change to re-localize.
 * Requires permission — call `requestReminderPermission()` first.
 */
export async function scheduleMealReminders(reminders: MealReminder[] = DEFAULT_MEAL_REMINDERS): Promise<void> {
  await cancelMealReminders();
  await Promise.all(
    reminders.map((r) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${r.meal}`,
        content: { ...reminderContent(r.meal), data: { url: '/', kind: 'meal-reminder', meal: r.meal } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: r.hour, minute: r.minute },
      }),
    ),
  );
}

/**
 * Device-local on/off switch (MMKV). `setEnabled(true)` asks for permission if
 * needed and schedules the defaults; resolves to the resulting state (false
 * if permission was denied). `setEnabled(false)` cancels them.
 */
export function useMealReminders(): { enabled: boolean; setEnabled: (value: boolean) => Promise<boolean> } {
  const enabled = useReminderStore((s) => s.enabled);
  const setEnabled = useCallback(async (value: boolean) => {
    const { setEnabledFlag } = useReminderStore.getState();
    if (!value) {
      setEnabledFlag(false);
      await cancelMealReminders();
      return false;
    }
    let permission = await getReminderPermission();
    if (permission !== 'granted') permission = await requestReminderPermission();
    if (permission !== 'granted') {
      setEnabledFlag(false);
      return false;
    }
    await scheduleMealReminders();
    setEnabledFlag(true);
    return true;
  }, []);
  return { enabled, setEnabled };
}
