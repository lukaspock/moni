/**
 * Rest-timer local notification. The countdown itself is derived from the
 * persisted `restEndsAt` timestamp (so it stays correct after the app was in
 * the background); this only makes iOS ring when the rest is over while the
 * app is not visible.
 *
 * The root notification handler shows banners in the foreground too, so the
 * notification is scheduled only when the app leaves the foreground and
 * cancelled as soon as it comes back — in the foreground the in-app timer
 * (+ haptic) is the signal.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';

import i18n from '@/i18n';
import {
  getReminderPermission,
  requestReminderPermission,
} from '@/features/notifications';
import { useActiveWorkoutStore } from './session';

const REST_NOTIFICATION_ID = 'moeni-rest-timer';

export async function cancelRestNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID);
  } catch {
    // nothing scheduled / module unavailable — nothing to cancel
  }
}

async function scheduleRestNotification(endsAtMs: number): Promise<void> {
  const seconds = Math.ceil((endsAtMs - Date.now()) / 1000);
  if (seconds < 1) return;
  try {
    if ((await getReminderPermission()) !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      identifier: REST_NOTIFICATION_ID,
      content: {
        title: i18n.t('workout.rest.notificationTitle'),
        body: i18n.t('workout.rest.notificationBody'),
        sound: true,
        data: { kind: 'rest-timer' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  } catch (e) {
    console.warn('[workout] could not schedule rest notification', e);
  }
}

/** Asks for notification permission the first time a rest timer starts (iOS only shows the sheet once). */
export async function ensureRestNotificationPermission(): Promise<void> {
  try {
    if ((await getReminderPermission()) === 'undetermined') {
      await requestReminderPermission();
    }
  } catch {
    // ignore: the timer still works in-app
  }
}

/**
 * Mount once in the active-workout screen: keeps the scheduled notification
 * in sync with the rest timer and the app state.
 */
export function useRestTimerNotification(): void {
  const restEndsAt = useActiveWorkoutStore((s) => s.restEndsAt);

  useEffect(() => {
    // Timer changed (started / adjusted / skipped): drop any stale schedule.
    void cancelRestNotification();
    if (restEndsAt === null) return;
    if (AppState.currentState !== 'active') {
      void scheduleRestNotification(restEndsAt);
    }
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void cancelRestNotification();
      } else if (restEndsAt > Date.now()) {
        void scheduleRestNotification(restEndsAt);
      }
    });
    return () => sub.remove();
  }, [restEndsAt]);

  useEffect(() => () => void cancelRestNotification(), []);
}
