// Expo adapter for the nudge scheduler (the only file here that talks to iOS for nudges).
import * as Notifications from 'expo-notifications';

import i18n from '../../i18n';
import {
  ACTION_LESS_OF_THIS,
  ACTION_NOT_TODAY,
  NUDGE_CATEGORY_ID,
  NUDGE_ID_PREFIX,
} from './nudgeLogic';
import type { NudgeNotifier } from './nudgeScheduler';

/** (Re-)registers the action buttons in the current language. */
export async function registerNudgeCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NUDGE_CATEGORY_ID, [
    {
      identifier: ACTION_NOT_TODAY,
      buttonTitle: i18n.t('nudges.actions.notToday'),
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_LESS_OF_THIS,
      buttonTitle: i18n.t('nudges.actions.lessOfThis'),
      options: { opensAppToForeground: false },
    },
  ]);
}

export const expoNudgeNotifier: NudgeNotifier = {
  async cancelAllNudges() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(NUDGE_ID_PREFIX))
        .map((n) =>
          Notifications.cancelScheduledNotificationAsync(n.identifier),
        ),
    );
  },
  async schedule({ id, kind, title, body, date }) {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        categoryIdentifier: NUDGE_CATEGORY_ID,
        interruptionLevel: 'passive',
        data: { url: '/', kind: 'nudge', nudge: kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  },
};
