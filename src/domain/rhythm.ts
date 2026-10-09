/**
 * Rhythm (the flexible streak): ledger day type, "kept" days, weekly rings
 * (food / training / protein), the rhythm replay with grace tokens and pause mode.
 * Spec: docs/identity/05-experience-gamification.md §2 (term "Takt" is now "Rhythmus",
 * IDENTITY-PLAN D4). Pure; all dates are local `YYYY-MM-DD` strings, week maths via
 * UTC-based `shiftIsoDate` (DST-safe). No RN/Expo imports.
 *
 * Care rule (never negotiable): calories only ever appear as a floor-free signal here —
 * nothing in this file rewards eating less.
 */

import { daysBetween, shiftIsoDate } from './adaptive';
import type { TrainingExperience } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** A day counts as "food kept" with at least this many entries. */
export const MIN_FOOD_ENTRIES_FOR_DAY = 2;
/** Protein ring: day counts when protein reaches this share of the daily target. */
export const PROTEIN_RING_THRESHOLD = 0.85;
export const DEFAULT_FOOD_DAYS_GOAL = 5;
export const DEFAULT_PROTEIN_DAYS_GOAL = 4;
export const MAX_TRAINING_DAYS_GOAL = 6;
export const BEGINNER_TRAINING_CAP = 3;
export const BEGINNER_CAP_WEEKS = 4;
export const DEFAULT_TRAINING_DAYS_GOAL = 3;
/** Rings that must be closed for a rhythm week (with the training ring off both remaining rings = 2). */
export const RINGS_REQUIRED_FOR_RHYTHM = 2;
export const START_GRACE_TOKENS = 1;
export const MAX_GRACE_TOKENS = 2;
/** Every N consecutive rhythm weeks (without a break) a grace token is earned. */
export const WEEKS_PER_GRACE_TOKEN = 4;
export const MAX_PAUSE_LENGTH_DAYS = 21;
export const MAX_RETROACTIVE_PAUSE_DAYS = 7;
export const MAX_PAUSE_DAYS_PER_YEAR = 42;
/** Safety cap for expanding stored pause ranges (corrupt storage must not hang the app). */
const MAX_RANGE_EXPANSION_DAYS = 400;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LedgerMeals {
  breakfast: number;
  lunch: number;
  dinner: number;
  snack: number;
}

export interface LedgerSources {
  photo: number;
  voice: number;
  barcode: number;
  label: number;
}

/** Compact per-day record derived from food_logs / workouts / weight_logs (docs/05 §2.0). */
export interface LedgerDay {
  /** YYYY-MM-DD, local */
  date: string;
  foodLogCount: number;
  kcalEaten: number;
  proteinG: number;
  /** daily limit incl. workout bonus; null = no daily_targets row for the day */
  targetKcal: number | null;
  /** daily limit without workout bonus; null = unknown */
  baseKcal: number | null;
  targetProteinG: number | null;
  /** completed workouts only */
  workoutCount: number;
  workoutKcal: number;
  /** longest completed workout of the day in minutes (0 = none) */
  longestWorkoutMin: number;
  hadStrength: boolean;
  hadCardioOrSport: boolean;
  weightLogged: boolean;
  /** local "enjoy rest day" confirmation, overlaid at read time */
  restConfirmed: boolean;
  meals: LedgerMeals;
  /** local hour (0..23) of the first food entry of the day */
  firstLogHour: number | null;
  sources: LedgerSources;
  /** protein (g) logged within 3 h after the end of a workout that day (max over workouts) */
  bridgeProteinG: number;
}

export function emptyLedgerDay(date: string): LedgerDay {
  return {
    date,
    foodLogCount: 0,
    kcalEaten: 0,
    proteinG: 0,
    targetKcal: null,
    baseKcal: null,
    targetProteinG: null,
    workoutCount: 0,
    workoutKcal: 0,
    longestWorkoutMin: 0,
    hadStrength: false,
    hadCardioOrSport: false,
    weightLogged: false,
    restConfirmed: false,
    meals: { breakfast: 0, lunch: 0, dinner: 0, snack: 0 },
    firstLogHour: null,
    sources: { photo: 0, voice: 0, barcode: 0, label: 0 },
    bridgeProteinG: 0,
  };
}

/** UI words: kept = "gehalten", empty = "offen" (never "verpasst"). */
export type DayState = 'kept' | 'empty' | 'open' | 'future' | 'paused';

export interface DayContext {
  today: string;
  /** training_plan_days weekdays (0 = Sunday … 6 = Saturday). Empty = no plan known (no rest-day concession). */
  plannedWeekdays: ReadonlySet<number>;
  pausedDates: ReadonlySet<string>;
  /** used when a ledger day has no targetProteinG (current target as fallback) */
  fallbackProteinTargetG?: number | null;
}

export interface WeekGoals {
  foodDays: number;
  /** 0 = training ring switched off */
  trainingDays: number;
  proteinDays: number;
}

export interface RingProgress {
  done: number;
  goal: number;
  closed: boolean;
}

export interface WeekRings {
  weekStart: string;
  food: RingProgress;
  /** null = ring off (workouts_per_week = 0) */
  training: RingProgress | null;
  protein: RingProgress;
  /** 0..3 */
  closedCount: number;
  /** rhythm week: >= 2 rings closed (both, when the training ring is off) */
  isRhythmWeek: boolean;
  /** every visible ring closed */
  isFull: boolean;
  /** the week (Mon..Sun) is over: its last day < today */
  isComplete: boolean;
  /** all 7 days paused */
  isPaused: boolean;
}

export interface PauseRange {
  from: string;
  to: string;
}

export type WeekOutcome = 'rhythm' | 'grace' | 'broken' | 'paused' | 'idle';

export interface RhythmWeek {
  weekStart: string;
  rings: WeekRings;
  outcome: WeekOutcome;
}

export interface RhythmState {
  /** consecutive completed rhythm weeks */
  current: number;
  best: number;
  /** sum of all rhythm weeks (drives the stage) */
  lifetimeWeeks: number;
  /** 0..2 */
  graceTokens: number;
  /** 'none' also covers an "idle" week at rhythm 0 (nothing to lose) */
  lastWeekOutcome: 'rhythm' | 'grace' | 'broken' | 'paused' | 'none';
  /** in-rhythm: >= 2 rings closed; in-reach: one ring short and still closable; else open */
  thisWeek: 'in-rhythm' | 'in-reach' | 'open';
  /** weekStarts that consumed a grace token */
  weeksWithGrace: string[];
  /** every replayed (completed) week, oldest first */
  weeks: RhythmWeek[];
  thisWeekRings: WeekRings;
}

// ---------------------------------------------------------------------------
// Date helpers (pure)
// ---------------------------------------------------------------------------

/** 0 = Sunday … 6 = Saturday */
export function weekdayOfIso(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** First day of the week containing `isoDate` (Monday by default, Sunday with 0). */
export function weekStartFor(isoDate: string, weekStartsOn: 0 | 1 = 1): string {
  const dow = weekdayOfIso(isoDate);
  const back = weekStartsOn === 1 ? (dow + 6) % 7 : dow;
  return shiftIsoDate(isoDate, -back);
}

/** The seven dates of the week starting at `weekStart`. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftIsoDate(weekStart, i));
}

/** ISO-8601 week number (Monday-based, week 1 contains the first Thursday). */
export function isoWeekNumber(isoDate: string): number {
  const thursday = shiftIsoDate(isoDate, 3 - ((weekdayOfIso(isoDate) + 6) % 7));
  const jan1 = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(jan1, thursday) / 7) + 1;
}

/** True on days outside the training plan. An empty plan means "no plan known" -> never a rest day. */
export function isPlannedRestDay(
  date: string,
  plannedWeekdays: ReadonlySet<number>,
): boolean {
  return plannedWeekdays.size > 0 && !plannedWeekdays.has(weekdayOfIso(date));
}

// ---------------------------------------------------------------------------
// Day classification
// ---------------------------------------------------------------------------

/** docs/05 §2.1 "Tag gehalten": workout, >= 2 entries, or (planned rest day) >= 1 entry / confirmed rest. */
export function isDayKept(
  day: LedgerDay | undefined,
  isRestDay: boolean,
): boolean {
  if (!day) return false;
  if (day.workoutCount >= 1) return true;
  if (day.foodLogCount >= MIN_FOOD_ENTRIES_FOR_DAY) return true;
  if (isRestDay && (day.foodLogCount >= 1 || day.restConfirmed)) return true;
  return false;
}

export function classifyDay(
  day: LedgerDay | undefined,
  date: string,
  ctx: DayContext,
): DayState {
  if (date > ctx.today) return 'future';
  const rest = isPlannedRestDay(date, ctx.plannedWeekdays);
  // Reality wins: a day with real activity is kept even inside a pause range.
  if (isDayKept(day, rest)) return 'kept';
  if (ctx.pausedDates.has(date)) return 'paused';
  return date === ctx.today ? 'open' : 'empty';
}

export interface DayGlyph {
  /** ring filled: food kept */
  ring: boolean;
  /** training slash drawn */
  slash: boolean;
  /** confirmed rest day without workout (dot instead of slash) */
  rest: boolean;
}

export function dayGlyph(
  day: LedgerDay | undefined,
  opts: { isRestDay?: boolean } = {},
): DayGlyph {
  if (!day) return { ring: false, slash: false, rest: false };
  const slash = day.workoutCount >= 1;
  const rest = day.restConfirmed && !slash;
  const needed = opts.isRestDay ? 1 : MIN_FOOD_ENTRIES_FOR_DAY;
  const ring = day.foodLogCount >= needed || rest;
  return { ring, slash, rest };
}

// ---------------------------------------------------------------------------
// Pause handling
// ---------------------------------------------------------------------------

function rangeDates(range: PauseRange): string[] {
  if (range.to < range.from) return [];
  const len = Math.min(
    daysBetween(range.from, range.to) + 1,
    MAX_RANGE_EXPANSION_DAYS,
  );
  return Array.from({ length: len }, (_, i) => shiftIsoDate(range.from, i));
}

export function pauseDateSet(pauses: readonly PauseRange[]): Set<string> {
  const set = new Set<string>();
  for (const r of pauses) for (const d of rangeDates(r)) set.add(d);
  return set;
}

function datesToRanges(sortedDates: readonly string[]): PauseRange[] {
  const out: PauseRange[] = [];
  for (const d of sortedDates) {
    const last = out[out.length - 1];
    if (last && shiftIsoDate(last.to, 1) === d) last.to = d;
    else out.push({ from: d, to: d });
  }
  return out;
}

export interface AddPauseResult {
  pauses: PauseRange[];
  /** the part that was actually added (null when nothing could be added) */
  added: PauseRange | null;
  /** true when the request was shortened (21-day cap, 7-day retroactive limit or 42 days/year) */
  limited: boolean;
}

/**
 * docs/05 §2.3: 1..21 days, retroactive up to 7 days, max 42 paused days within the
 * rolling year; overlapping/adjacent ranges are merged. Never throws; clamps instead.
 */
export function addPauseDetailed(
  pauses: readonly PauseRange[],
  range: PauseRange,
  today: string,
): AddPauseResult {
  const existing = pauseDateSet(pauses);
  let from = range.from;
  let to = range.to;
  if (to < from) [from, to] = [to, from];
  let limited = false;

  const earliest = shiftIsoDate(today, -MAX_RETROACTIVE_PAUSE_DAYS);
  if (from < earliest) {
    from = earliest;
    limited = true;
  }
  if (to < from) {
    return {
      pauses: datesToRanges([...existing].sort()),
      added: null,
      limited: true,
    };
  }
  const maxTo = shiftIsoDate(from, MAX_PAUSE_LENGTH_DAYS - 1);
  if (to > maxTo) {
    to = maxTo;
    limited = true;
  }

  // Budget: paused days within the rolling year ending at max(today, to).
  const windowEnd = to > today ? to : today;
  const windowStart = shiftIsoDate(windowEnd, -364);
  let used = 0;
  for (const d of existing) if (d >= windowStart && d <= windowEnd) used += 1;
  let budget = Math.max(0, MAX_PAUSE_DAYS_PER_YEAR - used);

  const merged = new Set(existing);
  let lastAdded: string | null = null;
  let firstAdded: string | null = null;
  for (const d of rangeDates({ from, to })) {
    if (merged.has(d)) continue;
    if (budget <= 0) {
      limited = true;
      break;
    }
    merged.add(d);
    budget -= 1;
    firstAdded ??= d;
    lastAdded = d;
  }
  return {
    pauses: datesToRanges([...merged].sort()),
    added: firstAdded && lastAdded ? { from: firstAdded, to: lastAdded } : null,
    limited,
  };
}

export function addPause(
  pauses: readonly PauseRange[],
  range: PauseRange,
  today: string,
): PauseRange[] {
  return addPauseDetailed(pauses, range, today).pauses;
}

/** Remove a date range from the stored pauses (e.g. the user ends a pause early). */
export function removePause(
  pauses: readonly PauseRange[],
  range: PauseRange,
): PauseRange[] {
  const remove = pauseDateSet([range]);
  const keep = [...pauseDateSet(pauses)].filter((d) => !remove.has(d)).sort();
  return datesToRanges(keep);
}

/** Pause covers `date` (inclusive). */
export function isPausedOn(
  pauses: readonly PauseRange[],
  date: string,
): boolean {
  return pauses.some((p) => date >= p.from && date <= p.to);
}

// ---------------------------------------------------------------------------
// Weekly rings
// ---------------------------------------------------------------------------

export function defaultWeekGoals(p: {
  workoutsPerWeek: number | null;
  experience: TrainingExperience | null;
  weeksSinceStart: number;
}): WeekGoals {
  let training: number;
  if (p.workoutsPerWeek === null || !Number.isFinite(p.workoutsPerWeek)) {
    training = DEFAULT_TRAINING_DAYS_GOAL;
  } else if (p.workoutsPerWeek <= 0) {
    training = 0;
  } else {
    training = Math.min(
      MAX_TRAINING_DAYS_GOAL,
      Math.max(1, Math.round(p.workoutsPerWeek)),
    );
  }
  if (
    training > 0 &&
    p.experience === 'beginner' &&
    p.weeksSinceStart < BEGINNER_CAP_WEEKS
  ) {
    training = Math.min(training, BEGINNER_TRAINING_CAP);
  }
  return {
    foodDays: DEFAULT_FOOD_DAYS_GOAL,
    trainingDays: training,
    proteinDays: DEFAULT_PROTEIN_DAYS_GOAL,
  };
}

/** `ceil(goal * (7 - paused) / 7)`, at least 1; 0 when the goal is off or the whole week is paused. */
export function proratedGoal(goal: number, pausedDays: number): number {
  if (goal <= 0 || pausedDays >= 7) return 0;
  const clean = Math.min(7, Math.max(1, Math.round(goal)));
  return Math.max(1, Math.ceil((clean * (7 - Math.max(0, pausedDays))) / 7));
}

function ring(done: number, goal: number): RingProgress {
  return { done, goal, closed: goal > 0 && done >= goal };
}

export function computeWeekRings(
  days: readonly LedgerDay[],
  weekStart: string,
  goals: WeekGoals,
  ctx: DayContext,
): WeekRings {
  const dates = weekDates(weekStart);
  const inWeek = new Set(dates);
  const byDate = new Map<string, LedgerDay>();
  for (const d of days) if (inWeek.has(d.date)) byDate.set(d.date, d);

  let foodDone = 0;
  let trainingDone = 0;
  let proteinDone = 0;
  let paused = 0;
  for (const date of dates) {
    if (ctx.pausedDates.has(date)) paused += 1;
    const d = byDate.get(date);
    if (!d) continue;
    const food = d.foodLogCount >= MIN_FOOD_ENTRIES_FOR_DAY;
    if (food) foodDone += 1;
    if (d.workoutCount >= 1) trainingDone += 1;
    const target = d.targetProteinG ?? ctx.fallbackProteinTargetG ?? 0;
    if (food && target > 0 && d.proteinG >= PROTEIN_RING_THRESHOLD * target) {
      proteinDone += 1;
    }
  }

  const food = ring(foodDone, proratedGoal(goals.foodDays, paused));
  const training =
    goals.trainingDays > 0
      ? ring(trainingDone, proratedGoal(goals.trainingDays, paused))
      : null;
  const protein = ring(proteinDone, proratedGoal(goals.proteinDays, paused));
  const visible = [food, training, protein].filter(
    (r): r is RingProgress => r !== null,
  );
  const closedCount = visible.filter((r) => r.closed).length;
  const isPaused = paused >= 7;
  return {
    weekStart,
    food,
    training,
    protein,
    closedCount,
    isRhythmWeek: !isPaused && closedCount >= RINGS_REQUIRED_FOR_RHYTHM,
    isFull: !isPaused && closedCount === visible.length,
    isComplete: shiftIsoDate(weekStart, 6) < ctx.today,
    isPaused,
  };
}

// ---------------------------------------------------------------------------
// Rhythm replay
// ---------------------------------------------------------------------------

function thisWeekStatus(
  rings: WeekRings,
  today: string,
): RhythmState['thisWeek'] {
  if (rings.isRhythmWeek) return 'in-rhythm';
  if (rings.isPaused) return 'open';
  const required = rings.training ? 2 : 2; // visible rings are 3 or 2; both cases need 2 closed
  if (rings.closedCount !== required - 1) return 'open';
  const remaining = Math.max(
    0,
    daysBetween(today, shiftIsoDate(rings.weekStart, 6)) + 1,
  );
  const closable = [rings.food, rings.training, rings.protein].some(
    (r) => r !== null && !r.closed && r.done + remaining >= r.goal,
  );
  return closable ? 'in-reach' : 'open';
}

export interface ComputeRhythmArgs {
  days: readonly LedgerDay[];
  today: string;
  plannedWeekdays: ReadonlySet<number>;
  goalsForWeek: (weekStart: string) => WeekGoals;
  pauses: readonly PauseRange[];
  weekStartsOn?: 0 | 1;
  fallbackProteinTargetG?: number | null;
}

/**
 * Deterministic replay (docs/05 §2.3) over all completed weeks from the first ledger day.
 * Deviation from the sketch: a non-rhythm week at rhythm 0 does not burn a grace token
 * (nothing to protect) and is reported as 'idle'.
 */
export function computeRhythm(args: ComputeRhythmArgs): RhythmState {
  const { today, goalsForWeek } = args;
  const weekStartsOn = args.weekStartsOn ?? 1;
  const ctx: DayContext = {
    today,
    plannedWeekdays: args.plannedWeekdays,
    pausedDates: pauseDateSet(args.pauses),
    fallbackProteinTargetG: args.fallbackProteinTargetG,
  };

  const currentWeekStart = weekStartFor(today, weekStartsOn);
  const thisWeekRings = computeWeekRings(
    args.days,
    currentWeekStart,
    goalsForWeek(currentWeekStart),
    ctx,
  );

  // Group by week once.
  let firstDate: string | null = null;
  const byWeek = new Map<string, LedgerDay[]>();
  for (const d of args.days) {
    const active = d.foodLogCount > 0 || d.workoutCount > 0 || d.weightLogged;
    if (!active) continue;
    if (d.date > today) continue;
    if (firstDate === null || d.date < firstDate) firstDate = d.date;
    const ws = weekStartFor(d.date, weekStartsOn);
    const list = byWeek.get(ws);
    if (list) list.push(d);
    else byWeek.set(ws, [d]);
  }

  const weeks: RhythmWeek[] = [];
  let current = 0;
  let best = 0;
  let lifetime = 0;
  let tokens = START_GRACE_TOKENS;
  let sinceToken = 0;
  const graceWeeks: string[] = [];

  if (firstDate !== null) {
    for (
      let ws = weekStartFor(firstDate, weekStartsOn);
      ws < currentWeekStart;
      ws = shiftIsoDate(ws, 7)
    ) {
      const rings = computeWeekRings(
        byWeek.get(ws) ?? [],
        ws,
        goalsForWeek(ws),
        ctx,
      );
      let outcome: WeekOutcome;
      if (rings.isPaused) {
        outcome = 'paused';
      } else if (rings.isRhythmWeek) {
        outcome = 'rhythm';
        current += 1;
        lifetime += 1;
        sinceToken += 1;
        if (sinceToken >= WEEKS_PER_GRACE_TOKEN) {
          sinceToken = 0;
          tokens = Math.min(MAX_GRACE_TOKENS, tokens + 1);
        }
        best = Math.max(best, current);
      } else if (current === 0) {
        outcome = 'idle';
      } else if (tokens > 0) {
        outcome = 'grace';
        tokens -= 1;
        graceWeeks.push(ws);
      } else {
        outcome = 'broken';
        best = Math.max(best, current);
        current = 0;
        sinceToken = 0;
      }
      weeks.push({ weekStart: ws, rings, outcome });
    }
  }
  best = Math.max(best, current);

  const last = weeks[weeks.length - 1];
  const lastWeekOutcome: RhythmState['lastWeekOutcome'] =
    !last || last.outcome === 'idle' ? 'none' : last.outcome;

  return {
    current,
    best,
    lifetimeWeeks: lifetime,
    graceTokens: tokens,
    lastWeekOutcome,
    thisWeek: thisWeekStatus(thisWeekRings, today),
    weeksWithGrace: graceWeeks,
    weeks,
    thisWeekRings,
  };
}
