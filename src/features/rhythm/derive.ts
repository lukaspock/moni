/**
 * Pure glue between raw feature data and the domain (no React / native imports, unit-tested).
 */

import { daysBetween, shiftIsoDate } from '../../domain/adaptive';
import type { ExerciseProgressRow } from '../../domain/ledger';
import {
  defaultWeekGoals,
  type LedgerDay,
  type WeekGoals,
} from '../../domain/rhythm';
import type { TrainingExperience } from '../../domain/types';
import {
  compareTrainingDays,
  dailyAverages,
  smoothTrend,
  type DaySummary,
  type TrainingComparison,
  type WeightPoint,
} from '../../domain/weightTrend';
import type { WeeklyPr } from '../../domain/weeklyReview';

/** Local, user-chosen overrides of the weekly goals (`rhythm:goals`). */
export type GoalOverrides = Partial<WeekGoals>;

export function clampGoals(goals: WeekGoals): WeekGoals {
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, Math.round(v)));
  return {
    foodDays: clamp(goals.foodDays, 1, 7),
    trainingDays: goals.trainingDays <= 0 ? 0 : clamp(goals.trainingDays, 1, 7),
    proteinDays: clamp(goals.proteinDays, 1, 7),
  };
}

/**
 * `(weekStart) => WeekGoals` from the profile (+ optional local overrides). Weeks since the
 * account was created drive the beginner cap. Overrides win over the defaults.
 */
export function makeGoalsForWeek(args: {
  workoutsPerWeek: number | null;
  experience: TrainingExperience | null;
  /** `YYYY-MM-DD` (or ISO timestamp) of account creation; null = long ago */
  accountCreatedAt: string | null;
  overrides?: GoalOverrides | null;
}): (weekStart: string) => WeekGoals {
  const created = args.accountCreatedAt?.slice(0, 10) ?? null;
  const valid = created !== null && /^\d{4}-\d{2}-\d{2}$/.test(created);
  return (weekStart) => {
    const weeksSinceStart = valid
      ? Math.max(0, Math.floor(daysBetween(created as string, weekStart) / 7))
      : 99;
    const base = defaultWeekGoals({
      workoutsPerWeek: args.workoutsPerWeek,
      experience: args.experience,
      weeksSinceStart,
    });
    return clampGoals({ ...base, ...(args.overrides ?? {}) });
  };
}

export interface BodyFacts {
  startWeightKg: number | null;
  trendWeightKg: number | null;
}

/** First weigh-in as the start, smoothed trend (EMA) as the current value. */
export function bodyFactsFromWeights(
  points: readonly WeightPoint[],
): BodyFacts {
  const daily = dailyAverages(points);
  if (daily.length === 0) return { startWeightKg: null, trendWeightKg: null };
  const trend = smoothTrend(points);
  return {
    startWeightKg: daily[0].weightKg,
    trendWeightKg: trend[trend.length - 1].weightKg,
  };
}

/** Change of the smoothed trend between the last point before `from` (or the first) and `to`. */
export function trendDeltaInRange(
  points: readonly WeightPoint[],
  from: string,
  to: string,
): { entries: number; trendDeltaKg: number } | null {
  const inRange = points.filter((p) => p.date >= from && p.date <= to);
  if (inRange.length === 0) return null;
  const trend = smoothTrend(points);
  const at = (date: string, fallbackFirst: boolean) => {
    let v: number | null = null;
    for (const p of trend) {
      if (p.date <= date) v = p.weightKg;
      else break;
    }
    return v ?? (fallbackFirst ? (trend[0]?.weightKg ?? null) : null);
  };
  const before = at(shiftIsoDate(from, -1), true);
  const after = at(to, false);
  if (before === null || after === null) return null;
  return { entries: inRange.length, trendDeltaKg: after - before };
}

/** Ledger days in the shape the Insights helpers use. */
export function ledgerToDaySummaries(days: readonly LedgerDay[]): DaySummary[] {
  return days.map((d) => ({
    date: d.date,
    kcalEaten: d.kcalEaten,
    targetKcal: d.targetKcal,
    proteinEatenG: d.proteinG,
    targetProteinG: d.targetProteinG,
    logged: d.foodLogCount > 0,
    hadWorkout: d.workoutCount > 0,
  }));
}

/** First correlation hint available (enough logged training and rest days). */
export function hasTrainingPattern(days: readonly LedgerDay[]): boolean {
  return compareTrainingDays(ledgerToDaySummaries(days)) !== null;
}

/** Training vs. rest day comparison over the 28 days ending at `to`. */
export function trainingComparisonUntil(
  days: readonly LedgerDay[],
  to: string,
): TrainingComparison | null {
  const from = shiftIsoDate(to, -27);
  return compareTrainingDays(
    ledgerToDaySummaries(days.filter((d) => d.date >= from && d.date <= to)),
  );
}

/** Exercises whose weekly est. 1RM in `weekStart` beat all earlier weeks (needs history). */
export function weeklyPrs(
  rows: readonly ExerciseProgressRow[],
  weekStart: string,
): WeeklyPr[] {
  const byExercise = new Map<string, { week: string; rm: number }[]>();
  for (const r of rows) {
    if (!r.exercise_id || !r.week_start || r.estimated_1rm_kg === null)
      continue;
    const list = byExercise.get(r.exercise_id) ?? [];
    list.push({ week: r.week_start, rm: r.estimated_1rm_kg });
    byExercise.set(r.exercise_id, list);
  }
  const out: WeeklyPr[] = [];
  for (const [exerciseId, list] of byExercise) {
    const current = list.find((p) => p.week === weekStart);
    const earlier = list.filter((p) => p.week < weekStart);
    if (!current || earlier.length === 0) continue;
    const previousBest = Math.max(...earlier.map((p) => p.rm));
    if (current.rm > previousBest) {
      out.push({
        exerciseId,
        gainKg: Math.round((current.rm - previousBest) * 10) / 10,
      });
    }
  }
  return out;
}
