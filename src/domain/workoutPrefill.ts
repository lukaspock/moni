/**
 * Pure logic for fast set tracking in the live session (docs/identity/06 §5):
 * pre-filling each set (last session -> routine target -> empty), the
 * progression hint ("+2.5 kg?"), stepper steps per input unit, picking the
 * last session's sets out of raw rows, and which exercise gets the focus next.
 * Everything is stored metric (hard rule #4); steps happen in the display unit.
 * No RN/Expo imports.
 */
import { kgToLb, lbToKg, roundTo } from './units';
import type { UnitSystem } from './types';
import {
  displayToStored,
  MAX_SET_INPUT,
  storedToDisplay,
  type SetInputUnit,
} from './workoutSession';

/** One set's values, metric (kg, whole reps, seconds, metres). */
export interface PrefillValues {
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
}

export type PrefillSource = 'last' | 'target' | 'none';

export interface SetPrefill {
  values: PrefillValues;
  source: PrefillSource;
}

export const EMPTY_PREFILL: PrefillValues = {
  weightKg: null,
  reps: null,
  durationS: null,
  distanceM: null,
};

/** Default rest when neither routine nor exercise specify one. */
export const DEFAULT_REST_SECONDS = 90;

/**
 * Pre-fill for the set at `setIndex` (0-based): the same set of the last
 * session, or that session's last set when this session has more sets, else
 * the routine's target reps, else nothing.
 */
export function prefillForSet(
  setIndex: number,
  lastSets: readonly PrefillValues[] | null | undefined,
  targetReps: number | null | undefined,
  /** Time-based exercises store minutes per round in `target_reps`. */
  targetKind: 'reps' | 'minutes' = 'reps',
): SetPrefill {
  if (lastSets && lastSets.length > 0) {
    const source = lastSets[Math.min(setIndex, lastSets.length - 1)]!;
    return { values: { ...source }, source: 'last' };
  }
  if (targetReps != null && targetReps > 0) {
    return {
      values:
        targetKind === 'minutes'
          ? { ...EMPTY_PREFILL, durationS: Math.round(targetReps * 60) }
          : { ...EMPTY_PREFILL, reps: targetReps },
      source: 'target',
    };
  }
  return { values: { ...EMPTY_PREFILL }, source: 'none' };
}

/** What a set shows: its own value per field, else the pre-fill. */
export function effectiveSetValues(
  set: Partial<PrefillValues>,
  prefill: PrefillValues,
): PrefillValues {
  return {
    weightKg: set.weightKg ?? prefill.weightKg,
    reps: set.reps ?? prefill.reps,
    durationS: set.durationS ?? prefill.durationS,
    distanceM: set.distanceM ?? prefill.distanceM,
  };
}

/** Weight step of the progression hint: 2.5 kg, or 5 lb for imperial users. */
export function progressionStep(unitSystem: UnitSystem): {
  display: number;
  unit: 'kg' | 'lb';
} {
  return unitSystem === 'imperial'
    ? { display: 5, unit: 'lb' }
    : { display: 2.5, unit: 'kg' };
}

export interface ProgressionHint {
  /** Weight to suggest for this session, metric. */
  suggestedWeightKg: number;
  /** The step in the user's unit (for the chip label: "+2.5 kg?"). */
  stepDisplay: number;
  stepUnit: 'kg' | 'lb';
}

/**
 * "+2.5 kg?" when every weighted set of the last session reached the upper
 * rep target. Base is the heaviest weight of that session; the result is
 * rounded in the user's unit so it shows as a clean number.
 */
export function progressionHint(
  lastSets: readonly PrefillValues[] | null | undefined,
  targetRepsUpper: number | null | undefined,
  unitSystem: UnitSystem,
): ProgressionHint | null {
  if (!lastSets || lastSets.length === 0) return null;
  if (targetRepsUpper == null || targetRepsUpper <= 0) return null;
  const weighted = lastSets.filter(
    (s) => s.weightKg !== null && s.weightKg > 0,
  );
  if (weighted.length === 0) return null;
  const allReached = weighted.every(
    (s) => s.reps !== null && s.reps >= targetRepsUpper,
  );
  if (!allReached) return null;
  const baseKg = Math.max(...weighted.map((s) => s.weightKg as number));
  const step = progressionStep(unitSystem);
  const suggestedWeightKg =
    step.unit === 'lb'
      ? roundTo(lbToKg(roundTo(kgToLb(baseKg), 1) + step.display), 3)
      : roundTo(baseKg + step.display, 3);
  return {
    suggestedWeightKg,
    stepDisplay: step.display,
    stepUnit: step.unit,
  };
}

// ---------------------------------------------------------------------------
// Steppers
// ---------------------------------------------------------------------------

/** Stepper increment per input unit (in that unit). */
export const STEP_BY_UNIT: Record<SetInputUnit, number> = {
  kg: 2.5,
  lb: 5,
  reps: 1,
  sec: 5,
  min: 1,
  km: 0.1,
  mi: 0.1,
};

/**
 * One stepper tap: moves the stored (metric) value by one step in the display
 * unit, snapping onto the step grid first (81 kg + 2.5 -> 82.5, not 83.5).
 * `null` starts from 0. Never below 0, never above MAX_SET_INPUT.
 */
export function stepStoredValue(
  stored: number | null,
  direction: 1 | -1,
  unit: SetInputUnit,
  multiplier: number = 1,
): number {
  const step = STEP_BY_UNIT[unit] * multiplier;
  const display = stored === null ? 0 : storedToDisplay(stored, unit);
  const grid = STEP_BY_UNIT[unit];
  const decimals = grid < 1 ? 2 : grid % 1 === 0 ? 0 : 2;
  const units = display / grid;
  const onGrid = Math.abs(units - Math.round(units)) < 1e-6;
  let next: number;
  if (onGrid) {
    next = display + direction * step;
  } else if (direction === 1) {
    next = Math.ceil(units) * grid + (step - grid);
  } else {
    next = Math.floor(units) * grid - (step - grid);
  }
  next = Math.min(MAX_SET_INPUT, Math.max(0, roundTo(next, decimals)));
  return displayToStored(next, unit);
}

/** Step multiplier while a stepper button is held: 1x, then 2x after 8 repeats, 4x after 20. */
export function holdStepMultiplier(repeats: number): number {
  if (repeats >= 20) return 4;
  if (repeats >= 8) return 2;
  return 1;
}

/** Repeat interval (ms) while held: speeds up from 180 ms to 60 ms. */
export function holdRepeatInterval(repeats: number): number {
  return Math.max(60, 180 - repeats * 12);
}

// ---------------------------------------------------------------------------
// Last session from raw rows
// ---------------------------------------------------------------------------

export interface LastSetRow {
  id: string;
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  completedAt: string | null;
  reps: number | null;
  weightKg: number | null;
  durationS: number | null;
  distanceM: number | null;
}

/**
 * Sets of the most recent session that contains `exerciseId` (by the latest
 * `completedAt`), ordered by set index. Rows of `excludeWorkoutId` (the
 * running session), of deleted workouts or deleted sets, and unchecked rows
 * are ignored. Later rows with the same id win (outbox overlay after server).
 */
export function pickLastSessionSets(
  rows: readonly LastSetRow[],
  exerciseId: string,
  opts: {
    excludeWorkoutId?: string | null;
    deletedWorkoutIds?: ReadonlySet<string>;
    deletedSetIds?: ReadonlySet<string>;
  } = {},
): PrefillValues[] {
  const byId = new Map<string, LastSetRow>();
  for (const r of rows) {
    if (r.exerciseId !== exerciseId || r.completedAt === null) continue;
    if (opts.excludeWorkoutId && r.workoutId === opts.excludeWorkoutId)
      continue;
    if (opts.deletedWorkoutIds?.has(r.workoutId)) continue;
    if (opts.deletedSetIds?.has(r.id)) continue;
    byId.set(r.id, r);
  }
  const valid = [...byId.values()];
  if (valid.length === 0) return [];
  let latest = valid[0]!;
  for (const r of valid) {
    if (Date.parse(r.completedAt!) > Date.parse(latest.completedAt!))
      latest = r;
  }
  return valid
    .filter((r) => r.workoutId === latest.workoutId)
    .sort((a, b) => a.setIndex - b.setIndex)
    .map((r) => ({
      weightKg: r.weightKg,
      reps: r.reps,
      durationS: r.durationS,
      distanceM: r.distanceM,
    }));
}

/** The set shown as "last time": heaviest weight, then most reps; else the longest/farthest. */
export function topSet(
  sets: readonly PrefillValues[] | null | undefined,
): PrefillValues | null {
  if (!sets || sets.length === 0) return null;
  let best = sets[0]!;
  for (const s of sets) {
    const sw = s.weightKg ?? -1;
    const bw = best.weightKg ?? -1;
    if (sw > bw) best = s;
    else if (sw === bw) {
      if ((s.reps ?? -1) > (best.reps ?? -1)) best = s;
      else if (
        (s.reps ?? -1) === (best.reps ?? -1) &&
        ((s.distanceM ?? -1) > (best.distanceM ?? -1) ||
          ((s.distanceM ?? -1) === (best.distanceM ?? -1) &&
            (s.durationS ?? -1) > (best.durationS ?? -1)))
      )
        best = s;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Focus mode
// ---------------------------------------------------------------------------

export interface ExerciseProgress {
  done: number;
  total: number;
}

export function isExerciseComplete(p: ExerciseProgress): boolean {
  return p.total > 0 && p.done >= p.total;
}

/**
 * Exercise to focus after `fromIndex`: the next one with open sets, wrapping
 * around to earlier unfinished ones. null when everything is done.
 */
export function nextFocusIndex(
  progress: readonly ExerciseProgress[],
  fromIndex: number,
): number | null {
  const n = progress.length;
  for (let k = 1; k <= n; k++) {
    const i = (fromIndex + k) % n;
    if (!isExerciseComplete(progress[i]!)) return i;
  }
  return null;
}

/** Focus when the user hasn't picked one: the first exercise with open sets, else the last one. */
export function initialFocusIndex(
  progress: readonly ExerciseProgress[],
): number | null {
  if (progress.length === 0) return null;
  const i = progress.findIndex((p) => !isExerciseComplete(p));
  return i === -1 ? progress.length - 1 : i;
}
