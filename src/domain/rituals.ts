/**
 * Rituals (docs/05 §5): greeting slots, the one "day sentence", the single "next best step"
 * card and the welcome-back sheet kind. Pure — copy is chosen by key + variant (i18n elsewhere).
 */

import type { MealType } from './types';

export type GreetingSlot =
  'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

/** 05–10 morning, 10–14 midday, 14–18 afternoon, 18–22 evening, 22–05 night (local hour 0..23). */
export function greetingSlot(hour: number): GreetingSlot {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 14) return 'midday';
  if (h >= 14 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

export type DaySentenceKey =
  | 'welcomeBack'
  | 'night'
  | 'bridgeToFood'
  | 'trainingGrewLimit'
  | 'trainingDay'
  | 'restDay'
  | 'balanced'
  | 'rhythmReached'
  | 'monday'
  | 'friday'
  | 'sunday'
  | 'default';

export interface DaySentenceContext {
  slot: GreetingSlot;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** day of the year (1..366), drives the 3-way variant rotation */
  dayOfYear: number;
  isTrainingDay: boolean;
  workoutDone: boolean;
  eatenKcal: number;
  limitKcal: number;
  proteinEaten: number;
  proteinTarget: number;
  /** the second ring closed today -> rhythm week reached */
  rhythmJustReached: boolean;
  daysAway: number;
  /** care signal active */
  flagged: boolean;
}

export interface DaySentence {
  key: DaySentenceKey;
  variant: 0 | 1 | 2;
}

export const WELCOME_BACK_MIN_DAYS = 3;
export const BRIDGE_PROTEIN_RATIO = 0.6;
export const BALANCED_MIN_RATIO = 0.9;
export const BALANCED_MAX_RATIO = 1.15;

export function variantFor(dayOfYear: number): 0 | 1 | 2 {
  return (((Math.floor(dayOfYear) % 3) + 3) % 3) as 0 | 1 | 2;
}

/**
 * First matching rule wins (docs/05 §5.1). `null` = no sentence (care signal).
 * Deviations from the sketch, documented: the night slot has its own calm key without numbers;
 * "rest day" only applies before the evening, otherwise the balanced/rhythm/weekday rules can
 * still be reached on rest days.
 */
export function daySentence(ctx: DaySentenceContext): DaySentence | null {
  if (ctx.flagged) return null;
  const variant = variantFor(ctx.dayOfYear);
  const pick = (key: DaySentenceKey): DaySentence => ({ key, variant });

  if (ctx.daysAway >= WELCOME_BACK_MIN_DAYS) return pick('welcomeBack');
  if (ctx.slot === 'night') return pick('night');

  const proteinRatio =
    ctx.proteinTarget > 0 ? ctx.proteinEaten / ctx.proteinTarget : 1;
  if (ctx.workoutDone && proteinRatio < BRIDGE_PROTEIN_RATIO) {
    return pick('bridgeToFood');
  }
  if (ctx.workoutDone) return pick('trainingGrewLimit');
  if (ctx.isTrainingDay) return pick('trainingDay');
  if (ctx.slot !== 'evening') return pick('restDay');

  const ratio = ctx.limitKcal > 0 ? ctx.eatenKcal / ctx.limitKcal : 0;
  if (ratio >= BALANCED_MIN_RATIO && ratio < BALANCED_MAX_RATIO) {
    return pick('balanced');
  }
  if (ctx.rhythmJustReached) return pick('rhythmReached');
  if (ctx.weekday === 1) return pick('monday');
  if (ctx.weekday === 5) return pick('friday');
  if (ctx.weekday === 0) return pick('sunday');
  return pick('default');
}

// ---------------------------------------------------------------------------
// Next best step
// ---------------------------------------------------------------------------

export type NextStepKind =
  | 'logWeight'
  | 'proteinBridge'
  | 'startWorkout'
  | 'logMeal'
  | 'closeDay'
  | 'weeklyReview'
  | 'none';

export interface NextStepContext {
  flagged: boolean;
  /** any weight logged ever */
  hasWeight: boolean;
  /** days since the last weigh-in; null = never */
  daysSinceWeight: number | null;
  weighInReminderEnabled: boolean;
  /** local hour 0..23 */
  hour: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  isTrainingDay: boolean;
  workoutDoneToday: boolean;
  /** hours since the last workout ended today; null = none */
  hoursSinceWorkoutEnd: number | null;
  proteinEaten: number;
  proteinTarget: number;
  foodLogCount: number;
  meals: { breakfast: number; lunch: number };
  dayClosed: boolean;
  weeklyReviewUnseen: boolean;
}

export interface NextStep {
  kind: NextStepKind;
  mealType?: MealType;
}

/** docs/05 §5.3 priority list; the first match wins, `none` hides the card (no filler). */
export function nextBestStep(ctx: NextStepContext): NextStep {
  if (ctx.flagged) return { kind: 'none' };
  if (!ctx.hasWeight) return { kind: 'logWeight' };

  const proteinRatio =
    ctx.proteinTarget > 0 ? ctx.proteinEaten / ctx.proteinTarget : 1;
  if (
    ctx.workoutDoneToday &&
    proteinRatio < BRIDGE_PROTEIN_RATIO &&
    ctx.hoursSinceWorkoutEnd !== null &&
    ctx.hoursSinceWorkoutEnd <= 3
  ) {
    return { kind: 'proteinBridge' };
  }
  if (
    ctx.isTrainingDay &&
    !ctx.workoutDoneToday &&
    ctx.hour >= 7 &&
    ctx.hour < 20
  ) {
    return { kind: 'startWorkout' };
  }
  const slot = greetingSlot(ctx.hour);
  if (slot === 'morning' && ctx.meals.breakfast === 0) {
    return { kind: 'logMeal', mealType: 'breakfast' };
  }
  if (slot === 'midday' && ctx.meals.lunch === 0) {
    return { kind: 'logMeal', mealType: 'lunch' };
  }
  if (
    ctx.hour >= 20 &&
    ctx.hour < 22 &&
    ctx.foodLogCount >= 2 &&
    !ctx.dayClosed
  ) {
    return { kind: 'closeDay' };
  }
  if (ctx.weekday === 0 && ctx.hour >= 17 && ctx.weeklyReviewUnseen) {
    return { kind: 'weeklyReview' };
  }
  if (
    ctx.weekday === 1 &&
    ctx.weighInReminderEnabled &&
    (ctx.daysSinceWeight === null || ctx.daysSinceWeight >= 7)
  ) {
    return { kind: 'logWeight' };
  }
  return { kind: 'none' };
}

// ---------------------------------------------------------------------------
// Welcome back
// ---------------------------------------------------------------------------

export type WelcomeBackKind = 'none' | 'short' | 'medium' | 'long';

export const WELCOME_BACK_COOLDOWN_DAYS = 3;

/**
 * 3–6 days = short, 7–20 = medium, >= 21 = long. The sheet is never shown twice for the
 * same return: nothing within `WELCOME_BACK_COOLDOWN_DAYS` of the last time it was shown.
 */
export function welcomeBackKind(
  daysAway: number,
  lastShownDaysAgo: number | null,
): WelcomeBackKind {
  if (!Number.isFinite(daysAway) || daysAway < WELCOME_BACK_MIN_DAYS) {
    return 'none';
  }
  if (
    lastShownDaysAgo !== null &&
    lastShownDaysAgo < WELCOME_BACK_COOLDOWN_DAYS
  ) {
    return 'none';
  }
  if (daysAway >= 21) return 'long';
  if (daysAway >= 7) return 'medium';
  return 'short';
}

/** Whole days between the last app open and now (both `YYYY-MM-DD`); never negative. */
export function daysAwayFrom(
  lastOpenDate: string | null,
  today: string,
): number {
  if (!lastOpenDate) return 0;
  const [ay, am, ad] = lastOpenDate.split('-').map(Number);
  const [by, bm, bd] = today.split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
  return Math.max(0, diff);
}
