/**
 * Pure logic for the live workout (`app/workout/active.tsx`): parsing and
 * unit-converting set inputs (the DB always stores metric — hard rule #4),
 * resolving when a session really ended, deriving its category and kcal.
 * No RN/Expo imports.
 */
import { kgToLb, lbToKg, kmToMiles, milesToKm, roundTo } from './units';
import type { UnitSystem } from './types';
import {
  calculateKcalBurned,
  calculateSessionDensity,
  estimateStrengthMET,
} from './met';

export type SetField = 'weightKg' | 'reps' | 'durationS' | 'distanceM';
export type SetTrackingType =
  'weight_reps' | 'reps' | 'duration' | 'distance_duration';
export type SetInputUnit = 'kg' | 'lb' | 'reps' | 'sec' | 'min' | 'km' | 'mi';

/** Upper bound for any typed number (keeps `smallint` reps and absurd paste values safe). */
export const MAX_SET_INPUT = 9999;

/**
 * Parses what the user typed. Accepts `,` or `.` as decimal separator and a
 * trailing separator while typing ("8." -> 8). Empty/invalid/negative -> null.
 */
export function parseNumericInput(
  text: string,
  integerOnly: boolean = false,
): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  const value = integerOnly ? Math.floor(n) : n;
  return Math.min(value, MAX_SET_INPUT);
}

/** Which unit a column is entered in, for a tracking type and unit system. */
export function setInputUnit(
  field: SetField,
  trackingType: SetTrackingType,
  unitSystem: UnitSystem,
): SetInputUnit {
  switch (field) {
    case 'weightKg':
      return unitSystem === 'imperial' ? 'lb' : 'kg';
    case 'reps':
      return 'reps';
    case 'durationS':
      // Cardio durations are minutes, holds (planks) are seconds.
      return trackingType === 'distance_duration' ? 'min' : 'sec';
    case 'distanceM':
      return unitSystem === 'imperial' ? 'mi' : 'km';
  }
}

/** Reps and durations in seconds are integer columns in the DB. */
export function isIntegerUnit(unit: SetInputUnit): boolean {
  return unit === 'reps' || unit === 'sec';
}

/** Stored (metric) value -> number shown in the input. */
export function storedToDisplay(stored: number, unit: SetInputUnit): number {
  switch (unit) {
    case 'lb':
      return roundTo(kgToLb(stored), 1);
    case 'kg':
      return roundTo(stored, 2);
    case 'min':
      return roundTo(stored / 60, 1);
    case 'km':
      return roundTo(stored / 1000, 2);
    case 'mi':
      return roundTo(kmToMiles(stored / 1000), 2);
    default:
      return stored;
  }
}

/** Typed number -> value for the DB (kg, whole reps/seconds, metres). */
export function displayToStored(display: number, unit: SetInputUnit): number {
  switch (unit) {
    case 'lb':
      return roundTo(lbToKg(display), 3);
    case 'kg':
      return roundTo(display, 3);
    case 'min':
      return Math.round(display * 60);
    case 'km':
      return roundTo(display * 1000, 1);
    case 'mi':
      return roundTo(milesToKm(display) * 1000, 1);
    case 'sec':
    case 'reps':
      return Math.round(display);
  }
}

/** Compares two stored values the way the user sees them (so a re-render doesn't fight the text being typed). */
export function sameDisplayValue(
  a: number | null,
  b: number | null,
  unit: SetInputUnit,
): boolean {
  if (a === null || b === null) return a === b;
  return storedToDisplay(a, unit) === storedToDisplay(b, unit);
}

// ---------------------------------------------------------------------------
// Session end / category / kcal
// ---------------------------------------------------------------------------

/** If nothing was checked off for this long, the session is treated as abandoned (forgot to finish). */
export const IDLE_CUTOFF_MINUTES = 90;
/** Time added after the last checked set when an abandoned session is closed. */
export const IDLE_END_BUFFER_MINUTES = 5;

/**
 * When the session really ended. Normally `now`; but if the user forgot to
 * tap "Finish" and the last checked set is older than the idle cutoff, the
 * end is the last set + a small buffer (otherwise a workout left open
 * overnight would burn thousands of kcal). Never earlier than the start.
 */
export function resolveSessionEnd(
  startedAtMs: number,
  lastCompletedAtMs: number | null,
  nowMs: number,
): number {
  let end = nowMs;
  if (
    lastCompletedAtMs !== null &&
    nowMs - lastCompletedAtMs > IDLE_CUTOFF_MINUTES * 60_000
  ) {
    end = lastCompletedAtMs + IDLE_END_BUFFER_MINUTES * 60_000;
  }
  return Math.max(end, startedAtMs);
}

export type SessionCategory = 'strength' | 'cardio' | 'sport' | 'other';

/**
 * Category of a finished session from the categories of its exercises:
 * any strength exercise -> strength; otherwise the most common of the rest;
 * no exercises -> the fallback (the category it was started with).
 */
export function deriveSessionCategory(
  exerciseCategories: SessionCategory[],
  fallback: SessionCategory = 'strength',
): SessionCategory {
  if (exerciseCategories.length === 0) return fallback;
  if (exerciseCategories.includes('strength')) return 'strength';
  const counts = new Map<SessionCategory, number>();
  for (const c of exerciseCategories) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best: SessionCategory = exerciseCategories[0];
  for (const [c, n] of counts) if (n > (counts.get(best) ?? 0)) best = c;
  return best;
}

export const FALLBACK_BODY_WEIGHT_KG = 75;

/** kcal for a finished session: density-based MET for strength, catalog MET otherwise (MET x kg x h). */
export function calculateSessionKcal(opts: {
  category: SessionCategory;
  completedSets: number;
  durationMinutes: number;
  bodyWeightKg: number | null;
  /** MET to use for non-strength sessions. */
  nonStrengthMet: number;
}): number {
  const weight = opts.bodyWeightKg ?? FALLBACK_BODY_WEIGHT_KG;
  const met =
    opts.category === 'strength'
      ? estimateStrengthMET(
          calculateSessionDensity(opts.completedSets, opts.durationMinutes),
        )
      : opts.nonStrengthMet;
  return Math.max(
    0,
    Math.round(calculateKcalBurned(met, weight, opts.durationMinutes / 60)),
  );
}

/** Values a just-checked set should adopt from the previous workout: only fields the user left empty. */
export function fillFromPrevious(
  current: Partial<Record<SetField, number | null>>,
  previous: Partial<Record<SetField, number | null>> | undefined,
  fields: SetField[],
): Partial<Record<SetField, number>> {
  const patch: Partial<Record<SetField, number>> = {};
  if (!previous) return patch;
  for (const f of fields) {
    const prev = previous[f];
    if ((current[f] === null || current[f] === undefined) && prev != null) {
      patch[f] = prev;
    }
  }
  return patch;
}

/** m:ss (or h:mm:ss) for clocks and rest timers. */
export function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
