/**
 * Training-tab planning logic (docs/identity/06 §1): which routine is up next
 * and roughly how long a routine takes. Pure, no RN imports.
 */

export interface PlanRoutine {
  id: string;
  name: string;
}

export interface PlanWorkout {
  startedAt: string;
  routineId?: string | null;
  routineName?: string | null;
}

function matchesRoutine(workout: PlanWorkout, routine: PlanRoutine): boolean {
  if (workout.routineId) return workout.routineId === routine.id;
  return !!workout.routineName && workout.routineName === routine.name;
}

function newestFirst(workouts: readonly PlanWorkout[]): PlanWorkout[] {
  return [...workouts].sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0,
  );
}

/**
 * Next routine in the rotation: the one after the most recently completed
 * routine (by id, falling back to the name for summaries without an id). No
 * routine workout yet, or the last one's routine no longer exists → the first
 * routine. Workouts without a routine (free sessions, Health imports) are
 * ignored. `routines` keeps the user's order.
 */
export function nextRoutine<R extends PlanRoutine>(
  routines: readonly R[],
  recentWorkouts: readonly PlanWorkout[],
): R | null {
  if (routines.length === 0) return null;
  for (const workout of newestFirst(recentWorkouts)) {
    if (!workout.routineId && !workout.routineName) continue;
    const index = routines.findIndex((r) => matchesRoutine(workout, r));
    if (index === -1) continue;
    return routines[(index + 1) % routines.length]!;
  }
  return routines[0]!;
}

/** Start time of the routine's most recent workout, or null. */
export function lastPerformedAt(
  routine: PlanRoutine,
  recentWorkouts: readonly PlanWorkout[],
): string | null {
  for (const workout of newestFirst(recentWorkouts)) {
    if (matchesRoutine(workout, routine)) return workout.startedAt;
  }
  return null;
}

export interface DurationExercise {
  targetSets: number | null;
  /** Time-based exercise (cardio/mobility): counted by its duration, not by sets. */
  timed?: boolean;
  durationMin?: number | null;
}

/** Work + rest per strength set (≈ 40 s work, 90 s rest). */
export const MINUTES_PER_SET = 2.25;
/** Setting up / switching to the next exercise. */
export const MINUTES_PER_EXERCISE = 1;
export const WARMUP_MINUTES = 5;
/** Assumed length of a timed exercise without a stored duration. */
export const DEFAULT_TIMED_MINUTES = 20;
const DEFAULT_SETS = 3;

/**
 * Rough session length in minutes, rounded to 5 (min 5). Strength:
 * sets × work+rest + a minute per exercise + warm-up. Timed exercises count
 * with their duration. Empty routine → 0.
 */
export function estimateDurationMin(routine: {
  exercises: readonly DurationExercise[];
}): number {
  if (routine.exercises.length === 0) return 0;
  let minutes = 0;
  let hasStrength = false;
  for (const ex of routine.exercises) {
    if (ex.timed) {
      minutes += ex.durationMin ?? DEFAULT_TIMED_MINUTES;
    } else {
      hasStrength = true;
      minutes +=
        Math.max(1, ex.targetSets ?? DEFAULT_SETS) * MINUTES_PER_SET +
        MINUTES_PER_EXERCISE;
    }
  }
  if (hasStrength) minutes += WARMUP_MINUTES;
  return Math.max(5, Math.round(minutes / 5) * 5);
}

export type LastDoneLabel =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  /** Within the last 6 days: show the weekday ("zuletzt Mo"). */
  | { kind: 'weekday' }
  | { kind: 'date' };

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** How to phrase "last done" for a past start time, by local calendar days. */
export function lastDoneLabel(startedAtIso: string, now: Date): LastDoneLabel {
  const days = Math.round(
    (startOfLocalDay(now) - startOfLocalDay(new Date(startedAtIso))) /
      86_400_000,
  );
  if (days <= 0) return { kind: 'today' };
  if (days === 1) return { kind: 'yesterday' };
  if (days <= 6) return { kind: 'weekday' };
  return { kind: 'date' };
}

/** Running-session clock: `23:41`, `1:02:03`. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
