/** Test fixtures for ledger-based domain tests (not exported through the barrel). */

import { shiftIsoDate } from './adaptive';
import {
  emptyLedgerDay,
  type DayContext,
  type LedgerDay,
  type WeekGoals,
} from './rhythm';

/** A Monday. */
export const WEEK0 = '2026-01-05';

/** Monday of week n (0-based) counted from WEEK0. */
export function ws(n: number): string {
  return shiftIsoDate(WEEK0, 7 * n);
}

export function day(date: string, patch: Partial<LedgerDay> = {}): LedgerDay {
  return { ...emptyLedgerDay(date), ...patch };
}

export const GOALS: WeekGoals = {
  foodDays: 5,
  trainingDays: 3,
  proteinDays: 4,
};

export function ctx(today: string, over: Partial<DayContext> = {}): DayContext {
  return {
    today,
    plannedWeekdays: new Set<number>(),
    pausedDates: new Set<string>(),
    ...over,
  };
}

/**
 * One week of ledger days: `food` days with 2 entries (Mon first), `protein` of them reaching the
 * 150 g protein target, `train` training days counted from Sunday backwards.
 */
export function makeWeek(
  weekStart: string,
  o: {
    food?: number;
    protein?: number;
    train?: number;
    strength?: boolean;
  } = {},
): LedgerDay[] {
  const food = o.food ?? 0;
  const protein = o.protein ?? 0;
  const train = o.train ?? 0;
  const days: LedgerDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = shiftIsoDate(weekStart, i);
    const patch: Partial<LedgerDay> = {};
    if (i < food) {
      patch.foodLogCount = 2;
      patch.kcalEaten = 2000;
      patch.proteinG = i < protein ? 150 : 40;
      patch.targetProteinG = 150;
      patch.meals = { breakfast: 1, lunch: 0, dinner: 1, snack: 0 };
    }
    if (i >= 7 - train) {
      patch.workoutCount = 1;
      patch.longestWorkoutMin = 50;
      patch.hadStrength = o.strength ?? true;
    }
    if (Object.keys(patch).length > 0) days.push(day(date, patch));
  }
  return days;
}

/** A week that is a rhythm week under GOALS (food 5, training 3). */
export function rhythmWeek(weekStart: string): LedgerDay[] {
  return makeWeek(weekStart, { food: 5, protein: 4, train: 3 });
}

/** A week with too little for a rhythm week (1 food day). */
export function weakWeek(weekStart: string): LedgerDay[] {
  return makeWeek(weekStart, { food: 1 });
}
