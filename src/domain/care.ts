/**
 * Care signal (docs/05 §2.7): a silent rule that notices repeatedly very low intake.
 * It never diagnoses; it only switches off celebration/body achievements/sharing and
 * allows one calm hint card (wording + links: Brand/Legal). Pure.
 */

import { shiftIsoDate } from './adaptive';
import type { LedgerDay } from './rhythm';

export const CARE_WINDOW_DAYS = 7;
/** a logged day is "low" below this share of the base limit */
export const CARE_LOW_RATIO = 0.6;
/** number of low days in the window that raises the signal */
export const CARE_MIN_LOW_DAYS = 5;
/** days need at least this many entries to be considered (no-entry/fasting days never count) */
export const CARE_MIN_ENTRIES = 2;

export interface LowIntakeResult {
  flagged: boolean;
  /** days in the window with >= 2 entries */
  daysConsidered: number;
  /** of those, days below 60 % of the base limit */
  lowDays: number;
}

/**
 * Looks at the 7 completed days before `today` (today is still being logged, so a low
 * running total says nothing). Flagged when >= 5 considered days are below 60 % of `baseKcal`.
 */
export function detectLowIntakePattern(
  days: readonly LedgerDay[],
  baseKcal: number,
  today: string,
): LowIntakeResult {
  if (!Number.isFinite(baseKcal) || baseKcal <= 0) {
    return { flagged: false, daysConsidered: 0, lowDays: 0 };
  }
  const from = shiftIsoDate(today, -CARE_WINDOW_DAYS);
  const to = shiftIsoDate(today, -1);
  const seen = new Set<string>();
  let considered = 0;
  let low = 0;
  for (const d of days) {
    if (d.date < from || d.date > to || seen.has(d.date)) continue;
    seen.add(d.date);
    if (d.foodLogCount < CARE_MIN_ENTRIES) continue;
    considered += 1;
    if (d.kcalEaten < CARE_LOW_RATIO * baseKcal) low += 1;
  }
  return {
    flagged: low >= CARE_MIN_LOW_DAYS,
    daysConsidered: considered,
    lowDays: low,
  };
}
