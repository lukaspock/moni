import * as Notifications from 'expo-notifications';

import { NUDGE_CATEGORY } from '../../domain';
import { toISODate } from '../../lib/date';
import {
  ACTION_LESS_OF_THIS,
  ACTION_NOT_TODAY,
  migrateNudgeSettings,
  muteCategory,
  parseNudgeId,
  type NudgeSettings,
} from './nudgeLogic';
import { useNudgeStore } from './nudgeStore';
import { useReminderStore } from './reminderStore';

export function snapshot(): NudgeSettings {
  const s = useNudgeStore.getState();
  return {
    masterEnabled: s.masterEnabled,
    prefs: s.prefs,
    state: s.state,
    scheduled: s.scheduled,
    openedIds: s.openedIds,
    lastOpenDate: s.lastOpenDate,
    suppressedDate: s.suppressedDate,
    migrated: s.migrated,
  };
}

/** One-time D12 migration; safe to call repeatedly. */
export function ensureNudgeMigration(): void {
  const current = snapshot();
  if (current.migrated) return;
  const next = migrateNudgeSettings(
    current,
    useReminderStore.getState().enabled,
  );
  useNudgeStore.getState().patch({
    migrated: next.migrated,
    masterEnabled: next.masterEnabled,
  });
}

/**
 * Tap on a nudge (default action = opened) or one of its action buttons.
 * Called from the response listener in `initNotifications()`.
 */
export function handleNudgeResponse(
  response: Notifications.NotificationResponse,
): void {
  const id = response.notification.request.identifier;
  const parsed = parseNudgeId(id);
  if (!parsed) return;
  const store = useNudgeStore.getState();
  const today = toISODate();
  if (response.actionIdentifier === ACTION_NOT_TODAY) {
    store.patch({ suppressedDate: today });
  } else if (response.actionIdentifier === ACTION_LESS_OF_THIS) {
    // Settled right away: no sent/ignored bookkeeping for this one.
    store.patch({
      state: muteCategory(store.state, NUDGE_CATEGORY[parsed.kind], today),
      scheduled: store.scheduled.filter((s) => s.id !== id),
    });
  } else if (
    response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
  ) {
    store.markOpened(id);
  }
}
