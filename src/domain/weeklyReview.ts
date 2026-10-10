/**
 * Weekly review ("Gezeitentafel", docs/05 §4.4): card selection + week title. Pure; the result is
 * data + i18n keys only. Weeks with a pause or without data produce a single quiet line.
 */

import {
  dayGlyph,
  isoWeekNumber,
  isPlannedRestDay,
  weekDates,
  type DayGlyph,
  type LedgerDay,
  type RhythmState,
  type RhythmWeek,
  type WeekGoals,
  type WeekRings,
} from './rhythm';
import { stageForWeeks, type StageKey } from './stage';
import type { TrainingComparison } from './weightTrend';

export type WeekTitleKey =
  'full' | 'strength' | 'recovery' | 'restart' | 'quiet';

export const STRENGTH_WEEK_MIN_DAYS = 3;
export const BODY_CARD_MIN_ENTRIES = 4;

function inWeek(days: readonly LedgerDay[], weekStart: string): LedgerDay[] {
  const set = new Set(weekDates(weekStart));
  return days.filter((d) => set.has(d.date));
}

/** Deterministic week title; a calm week is never called bad. */
export function weekTitle(args: {
  rings: WeekRings;
  days: readonly LedgerDay[];
  /** outcome of the previous replayed week (for "restart") */
  previousOutcome: RhythmWeek['outcome'] | null;
}): WeekTitleKey {
  const week = inWeek(args.days, args.rings.weekStart);
  const strengthDays = week.filter((d) => d.hadStrength).length;
  const trainingDays = week.filter((d) => d.workoutCount > 0).length;
  if (args.rings.isFull) return 'full';
  if (strengthDays >= STRENGTH_WEEK_MIN_DAYS) return 'strength';
  if (trainingDays <= 1 && args.rings.food.closed) return 'recovery';
  if (args.previousOutcome === 'paused' && args.rings.isRhythmWeek) {
    return 'restart';
  }
  return 'quiet';
}

export type Highlight =
  | { kind: 'pr'; exerciseId: string; gainKg: number }
  | { kind: 'longestWorkout'; date: string; minutes: number }
  | { kind: 'bestProteinDay'; date: string; proteinG: number }
  | { kind: 'earliestEntry'; date: string; hour: number };

export interface WeeklyPr {
  exerciseId: string;
  gainKg: number;
}

/** PR -> longest workout -> best protein day -> earliest entry; null when the week has none. */
export function pickHighlight(
  week: readonly LedgerDay[],
  prs: readonly WeeklyPr[],
): Highlight | null {
  const pr = [...prs].sort((a, b) => b.gainKg - a.gainKg)[0];
  if (pr) return { kind: 'pr', exerciseId: pr.exerciseId, gainKg: pr.gainKg };

  const longest = [...week]
    .filter((d) => d.longestWorkoutMin > 0)
    .sort(
      (a, b) =>
        b.longestWorkoutMin - a.longestWorkoutMin ||
        a.date.localeCompare(b.date),
    )[0];
  if (longest) {
    return {
      kind: 'longestWorkout',
      date: longest.date,
      minutes: longest.longestWorkoutMin,
    };
  }
  const protein = [...week]
    .filter((d) => d.proteinG > 0)
    .sort((a, b) => b.proteinG - a.proteinG || a.date.localeCompare(b.date))[0];
  if (protein) {
    return {
      kind: 'bestProteinDay',
      date: protein.date,
      proteinG: Math.round(protein.proteinG),
    };
  }
  const early = [...week]
    .filter((d) => d.firstLogHour !== null)
    .sort(
      (a, b) =>
        (a.firstLogHour as number) - (b.firstLogHour as number) ||
        a.date.localeCompare(b.date),
    )[0];
  if (early) {
    return {
      kind: 'earliestEntry',
      date: early.date,
      hour: early.firstLogHour as number,
    };
  }
  return null;
}

export type GoalSuggestion = 'keep' | 'lower' | 'raise';

/**
 * One-time goal offers (docs/05 §2.2): lower the training goal after two completed weeks without a
 * closed training ring; raise it after four weeks with the ring closed and more training days than
 * the goal. The caller shows an offer at most once.
 */
export function trainingGoalSuggestion(
  weeks: readonly RhythmWeek[],
): GoalSuggestion {
  const rel = weeks.filter(
    (w) => w.outcome !== 'paused' && w.rings.training !== null,
  );
  const last2 = rel.slice(-2);
  if (last2.length === 2 && last2.every((w) => !w.rings.training?.closed)) {
    return 'lower';
  }
  const last4 = rel.slice(-4);
  if (
    last4.length === 4 &&
    last4.every(
      (w) => w.rings.training && w.rings.training.done > w.rings.training.goal,
    )
  ) {
    return 'raise';
  }
  return 'keep';
}

export type ReviewCard =
  | {
      kind: 'intro';
      weekNumber: number;
      weekStart: string;
      titleKey: WeekTitleKey;
    }
  | {
      kind: 'week';
      dates: string[];
      glyphs: DayGlyph[];
      foodDays: number;
      trainingDays: number;
      avgMealsPerLoggedDay: number;
    }
  | { kind: 'highlight'; highlight: Highlight }
  | {
      kind: 'connection';
      trainingDays: number;
      restDays: number;
      avgProteinTrainingG: number;
      avgProteinRestG: number;
    }
  | { kind: 'body'; entries: number; trendDeltaKg: number }
  | {
      kind: 'rhythm';
      current: number;
      best: number;
      lifetimeWeeks: number;
      stageKey: StageKey;
      graceUsed: boolean;
    }
  | { kind: 'outlook'; goals: WeekGoals; suggestion: GoalSuggestion };

export type ReviewQuietReason = 'paused' | 'noData';

export interface WeeklyReview {
  weekStart: string;
  /** set -> no stories, only one calm line */
  quiet: ReviewQuietReason | null;
  cards: ReviewCard[];
}

export interface WeeklyReviewInput {
  weekStart: string;
  days: readonly LedgerDay[];
  rings: WeekRings;
  rhythm: RhythmState;
  plannedWeekdays: ReadonlySet<number>;
  prs: readonly WeeklyPr[];
  /** compareTrainingDays(...) result over the review window, null when too little data */
  comparison: TrainingComparison | null;
  /** weigh-ins in the window and the change of the smoothed trend; null = none */
  weight: { entries: number; trendDeltaKg: number } | null;
  nextGoals: WeekGoals;
  careFlagged: boolean;
}

export function buildWeeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const { weekStart, rings } = input;
  if (rings.isPaused) return { weekStart, quiet: 'paused', cards: [] };
  const week = inWeek(input.days, weekStart);
  const hasData = week.some((d) => d.foodLogCount > 0 || d.workoutCount > 0);
  if (!hasData) return { weekStart, quiet: 'noData', cards: [] };

  const idx = input.rhythm.weeks.findIndex((w) => w.weekStart === weekStart);
  const previousOutcome = idx > 0 ? input.rhythm.weeks[idx - 1].outcome : null;
  const titleKey = weekTitle({ rings, days: week, previousOutcome });

  const dates = weekDates(weekStart);
  const byDate = new Map(week.map((d) => [d.date, d]));
  const loggedDays = week.filter((d) => d.foodLogCount > 0);
  const cards: ReviewCard[] = [
    {
      kind: 'intro',
      weekNumber: isoWeekNumber(weekStart),
      weekStart,
      titleKey,
    },
    {
      kind: 'week',
      dates,
      glyphs: dates.map((dt) =>
        dayGlyph(byDate.get(dt), {
          isRestDay: isPlannedRestDay(dt, input.plannedWeekdays),
        }),
      ),
      foodDays: rings.food.done,
      trainingDays: week.filter((d) => d.workoutCount > 0).length,
      avgMealsPerLoggedDay:
        loggedDays.length === 0
          ? 0
          : Math.round(
              (loggedDays.reduce((s, d) => s + d.foodLogCount, 0) /
                loggedDays.length) *
                10,
            ) / 10,
    },
  ];

  const highlight = pickHighlight(week, input.prs);
  if (highlight) cards.push({ kind: 'highlight', highlight });

  if (input.comparison) {
    cards.push({
      kind: 'connection',
      trainingDays: input.comparison.trainingDays,
      restDays: input.comparison.restDays,
      avgProteinTrainingG: Math.round(input.comparison.avgProteinTrainingG),
      avgProteinRestG: Math.round(input.comparison.avgProteinRestG),
    });
  }
  if (
    !input.careFlagged &&
    input.weight &&
    input.weight.entries >= BODY_CARD_MIN_ENTRIES
  ) {
    cards.push({
      kind: 'body',
      entries: input.weight.entries,
      trendDeltaKg: Math.round(input.weight.trendDeltaKg * 10) / 10,
    });
  }
  cards.push({
    kind: 'rhythm',
    current: input.rhythm.current,
    best: input.rhythm.best,
    lifetimeWeeks: input.rhythm.lifetimeWeeks,
    stageKey: stageForWeeks(input.rhythm.lifetimeWeeks).stage.key,
    graceUsed: input.rhythm.weeksWithGrace.includes(weekStart),
  });
  cards.push({
    kind: 'outlook',
    goals: input.nextGoals,
    suggestion: trainingGoalSuggestion(input.rhythm.weeks),
  });
  return { weekStart, quiet: null, cards };
}
