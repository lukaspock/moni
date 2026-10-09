/**
 * Ledger building + incremental cache merge (docs/05 §2.0, IDENTITY-PLAN D10). Pure:
 * raw rows from `food_logs` / `workouts` / `weight_logs` / `daily_targets` become compact
 * `LedgerDay`s; a persisted cache is refreshed incrementally. No RN/Expo imports.
 */

import { daysBetween, shiftIsoDate } from './adaptive';
import { emptyLedgerDay, type LedgerDay } from './rhythm';

export interface LedgerFoodRow {
  /** local YYYY-MM-DD (the `date` column) */
  date: string;
  /** ISO instant */
  logged_at: string;
  meal_type: string;
  source: string;
  kcal: number;
  protein_g: number;
}

export interface LedgerWorkoutRow {
  started_at: string;
  ended_at: string | null;
  category: string;
  kcal_burned: number | null;
}

export interface LedgerWeightRow {
  date: string;
}

export interface LedgerTargetRow {
  date: string;
  base_kcal: number;
  workout_bonus_kcal: number;
  protein_g: number;
}

export interface BuildLedgerInput {
  food: readonly LedgerFoodRow[];
  workouts: readonly LedgerWorkoutRow[];
  weights: readonly LedgerWeightRow[];
  targets: readonly LedgerTargetRow[];
}

export const BRIDGE_WINDOW_MS = 3 * 60 * 60 * 1000;

/** Local calendar date of an ISO instant (device timezone). */
export function localDateFromInstant(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Builds ledger days for every date that has any activity (food, completed workout or weigh-in).
 * Days that only have a daily_targets row are not emitted (no information value).
 */
export function buildLedgerDays(input: BuildLedgerInput): LedgerDay[] {
  const days = new Map<string, LedgerDay>();
  const get = (date: string): LedgerDay => {
    let d = days.get(date);
    if (!d) {
      d = emptyLedgerDay(date);
      days.set(date, d);
    }
    return d;
  };

  for (const f of input.food) {
    const d = get(f.date);
    d.foodLogCount += 1;
    d.kcalEaten += f.kcal;
    d.proteinG += f.protein_g;
    if (f.meal_type === 'breakfast') d.meals.breakfast += 1;
    else if (f.meal_type === 'lunch') d.meals.lunch += 1;
    else if (f.meal_type === 'dinner') d.meals.dinner += 1;
    else d.meals.snack += 1;
    if (f.source === 'photo') d.sources.photo += 1;
    else if (f.source === 'voice') d.sources.voice += 1;
    else if (f.source === 'barcode') d.sources.barcode += 1;
    else if (f.source === 'label') d.sources.label += 1;
    const hour = new Date(f.logged_at).getHours();
    if (
      Number.isFinite(hour) &&
      (d.firstLogHour === null || hour < d.firstLogHour)
    ) {
      d.firstLogHour = hour;
    }
  }

  const foodTimes = input.food
    .map((f) => ({ t: Date.parse(f.logged_at), protein: f.protein_g }))
    .filter((f) => Number.isFinite(f.t));

  for (const w of input.workouts) {
    if (!w.ended_at) continue;
    const start = Date.parse(w.started_at);
    const end = Date.parse(w.ended_at);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    const d = get(localDateFromInstant(w.started_at));
    d.workoutCount += 1;
    d.workoutKcal += w.kcal_burned ?? 0;
    d.longestWorkoutMin = Math.max(
      d.longestWorkoutMin,
      Math.max(0, Math.round((end - start) / 60_000)),
    );
    if (w.category === 'strength') d.hadStrength = true;
    if (w.category === 'cardio' || w.category === 'sport') {
      d.hadCardioOrSport = true;
    }
    let bridge = 0;
    for (const f of foodTimes) {
      if (f.t > end && f.t <= end + BRIDGE_WINDOW_MS) bridge += f.protein;
    }
    d.bridgeProteinG = Math.max(d.bridgeProteinG, bridge);
  }

  for (const w of input.weights) get(w.date).weightLogged = true;

  for (const t of input.targets) {
    const d = days.get(t.date);
    if (!d) continue;
    d.baseKcal = t.base_kcal;
    d.targetKcal = t.base_kcal + t.workout_bonus_kcal;
    d.targetProteinG = t.protein_g;
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Cache (persisted in MMKV by the feature layer)
// ---------------------------------------------------------------------------

export const LEDGER_CACHE_VERSION = 1;
/** Re-fetch this many days before the last sync (late entries, Health import, edits). */
export const LEDGER_OVERLAP_DAYS = 7;

export interface LedgerCache {
  version: typeof LEDGER_CACHE_VERSION;
  /** newest day the cache is complete up to (inclusive); null = never synced */
  lastSyncedDate: string | null;
  days: Record<string, LedgerDay>;
}

export function emptyLedgerCache(): LedgerCache {
  return { version: LEDGER_CACHE_VERSION, lastSyncedDate: null, days: {} };
}

/** Where the next incremental fetch starts: null = full history, else `lastSyncedDate - 7`. */
export function ledgerFetchFrom(
  cache: LedgerCache,
  overlapDays: number = LEDGER_OVERLAP_DAYS,
): string | null {
  return cache.lastSyncedDate === null
    ? null
    : shiftIsoDate(cache.lastSyncedDate, -overlapDays);
}

/**
 * Replaces the cache content for `[from, to]` with `fresh` (days in that range that are
 * absent from `fresh` were deleted/changed on the server and are dropped); everything outside
 * stays. `from = null` = full rebuild. Returns a new cache; the input is not mutated.
 */
export function mergeLedger(
  cache: LedgerCache,
  fresh: readonly LedgerDay[],
  range: { from: string | null; to: string },
): LedgerCache {
  const days: Record<string, LedgerDay> = {};
  for (const [date, day] of Object.entries(cache.days)) {
    const inside =
      (range.from === null || date >= range.from) && date <= range.to;
    if (!inside) days[date] = day;
  }
  for (const d of fresh) days[d.date] = d;
  const prev = cache.lastSyncedDate;
  return {
    version: LEDGER_CACHE_VERSION,
    lastSyncedDate: prev !== null && prev > range.to ? prev : range.to,
    days,
  };
}

export function ledgerDaysSorted(cache: LedgerCache): LedgerDay[] {
  return Object.values(cache.days).sort((a, b) => a.date.localeCompare(b.date));
}

/** Tolerant parse of a persisted cache; anything unexpected yields null (rebuild from server). */
export function parseLedgerCache(
  raw: string | null | undefined,
): LedgerCache | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<LedgerCache> | null;
    if (
      !v ||
      v.version !== LEDGER_CACHE_VERSION ||
      typeof v.days !== 'object' ||
      v.days === null
    ) {
      return null;
    }
    if (v.lastSyncedDate !== null && typeof v.lastSyncedDate !== 'string') {
      return null;
    }
    const days: Record<string, LedgerDay> = {};
    for (const [date, d] of Object.entries(v.days)) {
      if (!d || typeof d !== 'object') continue;
      // fill fields added later so old caches stay readable
      days[date] = { ...emptyLedgerDay(date), ...(d as LedgerDay), date };
    }
    return {
      version: LEDGER_CACHE_VERSION,
      lastSyncedDate: v.lastSyncedDate ?? null,
      days,
    };
  } catch {
    return null;
  }
}

/** Overlay local "rest day enjoyed" confirmations (not part of the server data). */
export function applyRestConfirmations(
  days: readonly LedgerDay[],
  restDates: ReadonlySet<string>,
): LedgerDay[] {
  const out = days.map((d) =>
    restDates.has(d.date) ? { ...d, restConfirmed: true } : d,
  );
  const have = new Set(days.map((d) => d.date));
  for (const date of restDates) {
    if (!have.has(date))
      out.push({ ...emptyLedgerDay(date), restConfirmed: true });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Strength facts from v_exercise_progress (weekly rows)
// ---------------------------------------------------------------------------

export interface ExerciseProgressRow {
  exercise_id: string | null;
  week_start: string | null;
  estimated_1rm_kg: number | null;
  volume_kg: number | null;
}

export interface StrengthFacts {
  totalVolumeKg: number;
  /** best est. 1RM gain (percent) of an exercise over >= 4 weeks of history; null when none */
  bestOneRmGainPct: number | null;
  /** first week in which an exercise beat its own earlier est. 1RM */
  firstPrDate: string | null;
  bodyweightLiftDone: boolean;
}

export const PLUS_TEN_MIN_SPAN_DAYS = 28;

export function deriveStrengthFacts(
  rows: readonly ExerciseProgressRow[],
  bodyweightKg: number | null,
  eligibleForBodyweight?: ReadonlySet<string>,
): StrengthFacts {
  const byExercise = new Map<string, { week: string; rm: number }[]>();
  let totalVolume = 0;
  for (const r of rows) {
    totalVolume += r.volume_kg ?? 0;
    if (!r.exercise_id || !r.week_start || r.estimated_1rm_kg === null)
      continue;
    const list = byExercise.get(r.exercise_id) ?? [];
    list.push({ week: r.week_start, rm: r.estimated_1rm_kg });
    byExercise.set(r.exercise_id, list);
  }

  let firstPr: string | null = null;
  let bestGain: number | null = null;
  let bwLift = false;
  for (const [id, list] of byExercise) {
    list.sort((a, b) => a.week.localeCompare(b.week));
    let runningMax = list[0].rm;
    for (let i = 1; i < list.length; i += 1) {
      if (list[i].rm > runningMax) {
        if (firstPr === null || list[i].week < firstPr) firstPr = list[i].week;
        runningMax = list[i].rm;
      }
    }
    const first = list[0];
    if (first.rm > 0) {
      for (const p of list) {
        if (daysBetween(first.week, p.week) >= PLUS_TEN_MIN_SPAN_DAYS) {
          const gain = ((p.rm - first.rm) / first.rm) * 100;
          if (bestGain === null || gain > bestGain) bestGain = gain;
        }
      }
    }
    if (
      bodyweightKg !== null &&
      bodyweightKg > 0 &&
      (!eligibleForBodyweight || eligibleForBodyweight.has(id)) &&
      list.some((p) => p.rm >= bodyweightKg)
    ) {
      bwLift = true;
    }
  }
  return {
    totalVolumeKg: totalVolume,
    bestOneRmGainPct: bestGain,
    firstPrDate: firstPr,
    bodyweightLiftDone: bwLift,
  };
}
