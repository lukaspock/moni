// Pure: where a tapped møni notification should lead (no Expo/RN imports, tested).
import type { NudgeKind } from '../../domain';

export interface NotificationRoute {
  pathname:
    | '/'
    | '/log-food'
    | '/training'
    | '/insights'
    | '/insights/week'
    | '/insights/weight-entry';
  params?: Record<string, string>;
}

const MEALS = new Set(['breakfast', 'lunch', 'dinner']);

/** Nudge kind → screen that lets the user act on it right away. */
export const NUDGE_ROUTE: Record<NudgeKind, NotificationRoute> = {
  eveningNote: { pathname: '/log-food' },
  proteinBridge: { pathname: '/log-food' },
  trainingMorning: { pathname: '/training' },
  sundayReview: { pathname: '/insights/week' },
  monthReview: { pathname: '/insights' },
  weighIn: { pathname: '/insights/weight-entry' },
  rhythmChance: { pathname: '/' },
  doorOpen: { pathname: '/' },
};

function isNudgeKind(v: unknown): v is NudgeKind {
  return (
    typeof v === 'string' &&
    Object.prototype.hasOwnProperty.call(NUDGE_ROUTE, v)
  );
}

/**
 * Route for a notification's `content.data` (`kind: 'meal-reminder' | 'nudge'`).
 * Derived from the kind rather than `data.url`, so notifications scheduled by
 * older builds (`url: '/'`) still land on the right screen. Unknown → null
 * (e.g. rest timers: tapping just opens the app where it was).
 */
export function routeForNotificationData(
  data: Record<string, unknown> | null | undefined,
): NotificationRoute | null {
  if (!data) return null;
  if (data.kind === 'meal-reminder') {
    return typeof data.meal === 'string' && MEALS.has(data.meal)
      ? { pathname: '/log-food', params: { meal: data.meal } }
      : { pathname: '/log-food' };
  }
  if (data.kind === 'nudge') {
    return isNudgeKind(data.nudge)
      ? NUDGE_ROUTE[data.nudge]
      : { pathname: '/' };
  }
  return null;
}
