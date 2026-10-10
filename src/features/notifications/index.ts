// CONTRACT (owner: `onboarding` agent). Local notifications via expo-notifications:
// opt-in meal reminders (below) + smart nudges (`useNudgeScheduler`, `useNudgeSettings`, `useQuieterPrompt`).
// No push/server involvement — everything is scheduled on-device.
import * as Notifications from 'expo-notifications';
import { useCallback } from 'react';

import i18n from '../../i18n';
import type { MealType } from '../../domain';
import { ensureNudgeMigration, handleNudgeResponse } from './nudgeEvents';
import {
  getReminderPermission,
  requestReminderPermission,
} from './permissions';
import { useReminderStore } from './reminderStore';

export {
  getReminderPermission,
  requestReminderPermission,
  type ReminderPermission,
} from './permissions';
export {
  useNudgeScheduler,
  useNudgeSettings,
  useQuieterPrompt,
  type NudgeSettingsApi,
} from './useNudges';
export type { QuieterChoice } from './nudgeLogic';

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

function reminderContent(
  meal: MealReminder['meal'],
): Notifications.NotificationContentInput {
  const t = i18n.t.bind(i18n);
  switch (meal) {
    case 'breakfast':
      return {
        title: t('notifications.meal.breakfast.title'),
        body: t('notifications.meal.breakfast.body'),
      };
    case 'lunch':
      return {
        title: t('notifications.meal.lunch.title'),
        body: t('notifications.meal.lunch.body'),
      };
    case 'dinner':
      return {
        title: t('notifications.meal.dinner.title'),
        body: t('notifications.meal.dinner.body'),
      };
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
export async function scheduleMealReminders(
  reminders: MealReminder[] = DEFAULT_MEAL_REMINDERS,
): Promise<void> {
  await cancelMealReminders();
  await Promise.all(
    reminders.map((r) =>
      Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${r.meal}`,
        content: {
          ...reminderContent(r.meal),
          data: { url: '/', kind: 'meal-reminder', meal: r.meal },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: r.hour,
          minute: r.minute,
        },
      }),
    ),
  );
}

/**
 * Device-local on/off switch (MMKV). `setEnabled(true)` asks for permission if
 * needed and schedules the defaults; resolves to the resulting state (false
 * if permission was denied). `setEnabled(false)` cancels them.
 */
export function useMealReminders(): {
  enabled: boolean;
  setEnabled: (value: boolean) => Promise<boolean>;
} {
  const enabled = useReminderStore((s) => s.enabled);
  const setEnabled = useCallback(async (value: boolean) => {
    const { setEnabledFlag } = useReminderStore.getState();
    if (!value) {
      setEnabledFlag(false);
      await cancelMealReminders();
      return false;
    }
    let permission = await getReminderPermission();
    if (permission !== 'granted')
      permission = await requestReminderPermission();
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

let initialized = false;

/**
 * App-wide notification setup — call once from the root layout. Idempotent.
 * - Foreground handler: without it iOS drops local notifications while møni is open.
 * - Re-localizes scheduled meal reminders whenever the app language changes.
 */
export function initNotifications(): void {
  if (initialized) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // D12: smart nudges (opt-in) + one-time migration of the old meal-reminder flag.
  ensureNudgeMigration();
  Notifications.addNotificationResponseReceivedListener(handleNudgeResponse);
  const last = Notifications.getLastNotificationResponse();
  if (last) handleNudgeResponse(last);

  i18n.on('languageChanged', () => {
    if (!useReminderStore.getState().enabled) return;
    void (async () => {
      try {
        if ((await getReminderPermission()) === 'granted')
          await scheduleMealReminders();
      } catch (e) {
        console.warn('[notifications] failed to re-localize meal reminders', e);
      }
    })();
  });
}
