import { suggestMealType } from './mealType';
import type { MealType } from './types';

/** Minimal shape of a logged meal needed for ranking quick-log suggestions. */
export interface QuickLogSource {
  id: string;
  title: string | null;
  mealType: MealType;
  /** ISO timestamp the meal was logged at. */
  loggedAt: string;
  kcal: number;
}

export interface QuickLogCandidate<T extends QuickLogSource> {
  /** Most recent log of this meal (used as the template to re-log). */
  log: T;
  /** How often this meal was logged within the history window. */
  count: number;
}

const DAY_MS = 86_400_000;

/** Stable identity of "the same meal": same title and roughly the same energy. */
export function quickLogKey(log: QuickLogSource): string {
  const title = (log.title ?? '').trim().toLowerCase();
  if (!title) return `id:${log.id}`;
  return `${title}|${Math.round(log.kcal / 25)}`;
}

/**
 * Ranks previously logged meals for one-tap re-logging. Identical meals are merged;
 * score = frequency + a bonus when it was usually eaten at this time of day (meal type
 * from `suggestMealType`) + a recency bonus that decays over ~a week. Returns the top
 * `limit` candidates, best first.
 */
export function rankQuickLogCandidates<T extends QuickLogSource>(
  logs: T[],
  now: Date,
  limit = 8,
): QuickLogCandidate<T>[] {
  const current = suggestMealType(now);
  const groups = new Map<
    string,
    { log: T; count: number; mealMatches: number }
  >();

  for (const log of logs) {
    const key = quickLogKey(log);
    const group = groups.get(key);
    const matches = log.mealType === current ? 1 : 0;
    if (!group) {
      groups.set(key, { log, count: 1, mealMatches: matches });
    } else {
      group.count += 1;
      group.mealMatches += matches;
      if (
        new Date(log.loggedAt).getTime() >
        new Date(group.log.loggedAt).getTime()
      ) {
        group.log = log;
      }
    }
  }

  const scored = [...groups.values()].map((group) => {
    const ageDays = Math.max(
      0,
      (now.getTime() - new Date(group.log.loggedAt).getTime()) / DAY_MS,
    );
    const recency = 1 / (1 + ageDays / 7);
    const mealBonus =
      group.mealMatches > 0 ? 1.5 + 0.25 * Math.min(group.mealMatches, 4) : 0;
    return { group, score: group.count + mealBonus + recency };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      new Date(b.group.log.loggedAt).getTime() -
        new Date(a.group.log.loggedAt).getTime(),
  );

  return scored
    .slice(0, limit)
    .map(({ group }) => ({ log: group.log, count: group.count }));
}
