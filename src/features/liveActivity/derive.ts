/**
 * Pure derivation for the workout Live Activity: active session -> activity
 * state -> serializable activity props. No RN/Expo imports (tested in Jest).
 */
import { kgToLb, roundTo } from '@/domain/units';

import type {
  WorkoutActivityLabels,
  WorkoutActivityProps,
  WorkoutActivityState,
} from './types';

/** Structural subset of the session store's `ActiveSet` this file reads. */
export interface SessionSetLike {
  reps: number | null;
  weightKg: number | null;
  completedAt: string | null;
}

/** Structural subset of `ActiveExercise`. */
export interface SessionExerciseLike {
  exerciseId: string;
  sets: SessionSetLike[];
}

/** Structural subset of `ActiveWorkoutState` (`src/features/workout/session.ts`). */
export interface SessionLike {
  workoutId: string | null;
  startedAt: string | null;
  exercises: SessionExerciseLike[];
  /** epoch ms */
  restEndsAt: number | null;
  restTotalSeconds?: number | null;
}

export interface DeriveContext {
  /** Already localized routine title (or a generic fallback like "Einheit"). */
  routineName: string;
  /** Exercise the screen currently focuses; falls back to the first open one. */
  focusedExerciseId?: string | null;
  exerciseName: (exerciseId: string) => string;
  unit: 'kg' | 'lb';
  labels: WorkoutActivityLabels;
  /** Only used to drop a rest timer that already ran out. */
  nowMs: number;
}

/**
 * Picks the exercise to show: the focused one if it exists, else the first
 * exercise with an unchecked set, else the last one (everything done).
 */
export function pickCurrentExercise<E extends SessionExerciseLike>(
  exercises: E[],
  focusedExerciseId?: string | null,
): E | null {
  if (exercises.length === 0) return null;
  if (focusedExerciseId) {
    const focused = exercises.find((e) => e.exerciseId === focusedExerciseId);
    if (focused) return focused;
  }
  const open = exercises.find((e) =>
    e.sets.some((s) => s.completedAt === null),
  );
  return open ?? exercises[exercises.length - 1];
}

/**
 * Current set of an exercise: the first unchecked one (0-based), or the last
 * set when all are done. Weight/reps come from that set, falling back to the
 * most recent completed set before it (the next set usually repeats it).
 */
export function pickCurrentSet(exercise: SessionExerciseLike): {
  setIndex: number;
  setCount: number;
  weightKg: number | null;
  reps: number | null;
} {
  const sets = exercise.sets;
  const setCount = sets.length;
  if (setCount === 0)
    return { setIndex: 0, setCount: 0, weightKg: null, reps: null };
  const openIndex = sets.findIndex((s) => s.completedAt === null);
  const setIndex = openIndex === -1 ? setCount - 1 : openIndex;
  const current = sets[setIndex];
  let weightKg = current.weightKg;
  let reps = current.reps;
  for (
    let i = setIndex - 1;
    i >= 0 && (weightKg === null || reps === null);
    i--
  ) {
    if (sets[i].completedAt === null) continue;
    weightKg ??= sets[i].weightKg;
    reps ??= sets[i].reps;
  }
  return { setIndex, setCount, weightKg, reps };
}

/** Session -> activity state, or null when there is nothing to show. */
export function deriveActivityState(
  session: SessionLike,
  ctx: DeriveContext,
): WorkoutActivityState | null {
  if (!session.workoutId || !session.startedAt) return null;
  const exercise = pickCurrentExercise(
    session.exercises,
    ctx.focusedExerciseId,
  );
  const set = exercise
    ? pickCurrentSet(exercise)
    : { setIndex: 0, setCount: 0, weightKg: null, reps: null };

  const restRunning =
    session.restEndsAt !== null && session.restEndsAt > ctx.nowMs;
  const restEndsAt = restRunning ? new Date(session.restEndsAt!) : null;
  const restStartedAt =
    restEndsAt && session.restTotalSeconds
      ? new Date(restEndsAt.getTime() - session.restTotalSeconds * 1000)
      : null;

  return {
    routineName: ctx.routineName,
    exerciseName: exercise ? ctx.exerciseName(exercise.exerciseId) : '',
    setIndex: set.setIndex,
    setCount: set.setCount,
    weightKg: set.weightKg,
    reps: set.reps,
    unit: ctx.unit,
    startedAt: session.startedAt,
    restEndsAt: restEndsAt?.toISOString() ?? null,
    restStartedAt: restStartedAt?.toISOString() ?? null,
    labels: ctx.labels,
  };
}

/** Metric kg -> display number in `unit`, 1 decimal max, locale-formatted. */
export function formatWeight(
  weightKg: number,
  unit: 'kg' | 'lb',
  locale: string,
): string {
  const value = roundTo(unit === 'lb' ? kgToLb(weightKg) : weightKg, 1);
  try {
    return value.toLocaleString(locale, { maximumFractionDigits: 1 });
  } catch {
    return String(value);
  }
}

/**
 * Short tag for the compact Dynamic Island: initials for multi-word names
 * ("Bench Press" -> "BP"), else the first 4 letters ("Kniebeuge" -> "Knie").
 */
export function exerciseShortName(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-/]+/)
    .filter((w) => /\p{L}/u.test(w));
  if (words.length === 0) return '';
  if (words.length === 1) return Array.from(words[0]).slice(0, 4).join('');
  return words
    .slice(0, 3)
    .map((w) => Array.from(w)[0].toUpperCase())
    .join('');
}

function isoToMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** "80 kg × 8" / "80 kg" / "8 Wdh." / null. */
function loadText(state: WorkoutActivityState): string | null {
  const { labels, unit } = state;
  const weight =
    state.weightKg != null && state.weightKg > 0
      ? formatWeight(state.weightKg, unit, labels.locale)
      : null;
  const reps = state.reps != null && state.reps > 0 ? state.reps : null;
  if (weight && reps) return labels.weightReps(weight, unit, reps);
  if (weight) return labels.weight(weight, unit);
  if (reps) return labels.reps(reps);
  return null;
}

/** Activity state -> serializable props for ActivityKit. */
export function buildActivityProps(
  state: WorkoutActivityState,
): WorkoutActivityProps {
  const { labels } = state;
  const hasSets = state.setCount > 0;
  const current = Math.min(state.setIndex + 1, state.setCount);
  const parts = [
    hasSets ? labels.setOf(current, state.setCount) : null,
    loadText(state),
  ].filter((p): p is string => !!p);

  const restEndsAtMs = isoToMs(state.restEndsAt);
  const restStartRaw =
    restEndsAtMs !== null ? isoToMs(state.restStartedAt) : null;
  const restStartMs =
    restStartRaw !== null &&
    restEndsAtMs !== null &&
    restStartRaw < restEndsAtMs
      ? restStartRaw
      : null;

  return {
    routine: state.routineName,
    exercise: state.exerciseName,
    exerciseShort: exerciseShortName(state.exerciseName),
    setLine: parts.join(' · '),
    setShort: hasSets ? `${current}/${state.setCount}` : '',
    startedAtMs: isoToMs(state.startedAt) ?? 0,
    restStartMs,
    restEndsAtMs,
    restLabel: labels.rest,
    elapsedLabel: labels.elapsed,
  };
}

/** Stable comparison key — updates are only sent when this changes. */
export function activityPropsKey(props: WorkoutActivityProps): string {
  return JSON.stringify(props);
}
