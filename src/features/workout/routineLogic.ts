/**
 * Pure routine helpers (no RN/Expo imports, unit-tested in routineLogic.test.ts).
 */
import type { Routine, RoutineExercise } from './types';

export const MAX_TARGET = 99;

/** Free-text sets/reps input → positive integer (<= 99) or null when empty/invalid. */
export function parseTargetInput(text: string): number | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return null;
  const n = Number(digits.slice(0, 3));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, MAX_TARGET);
}

export interface PendingRoutineRow {
  id: string;
  user_id?: string;
  name?: string;
}
export interface PendingRoutineExerciseRow {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: number | null;
}

/**
 * Overlays not-yet-synced outbox writes onto the server's routines so a freshly
 * saved / edited / deleted routine shows up (or disappears) immediately instead
 * of flickering back to the stale server state after the query refetches.
 */
export function mergeRoutinesWithPending(
  server: Routine[],
  pending: {
    routines: PendingRoutineRow[];
    routineExercises: PendingRoutineExerciseRow[];
    deletedRoutineIds: Set<string>;
    deletedExerciseRowIds: Set<string>;
  },
  userId: string,
): Routine[] {
  const byId = new Map<string, Routine>();
  for (const r of server) {
    if (pending.deletedRoutineIds.has(r.id)) continue;
    byId.set(r.id, {
      ...r,
      exercises: r.exercises.filter(
        (e) => !pending.deletedExerciseRowIds.has(e.id),
      ),
    });
  }
  for (const p of pending.routines) {
    if (pending.deletedRoutineIds.has(p.id)) continue;
    const base = byId.get(p.id);
    byId.set(p.id, {
      id: p.id,
      userId: p.user_id ?? base?.userId ?? userId,
      name: p.name ?? base?.name ?? '',
      exercises: base?.exercises ?? [],
    });
  }
  for (const pe of pending.routineExercises) {
    if (pending.deletedExerciseRowIds.has(pe.id)) continue;
    const routine = byId.get(pe.routine_id);
    if (!routine) continue;
    const row: RoutineExercise = {
      id: pe.id,
      routineId: pe.routine_id,
      exerciseId: pe.exercise_id,
      orderIndex: pe.order_index,
      targetSets: pe.target_sets,
      targetReps: pe.target_reps,
    };
    routine.exercises = [
      ...routine.exercises.filter((e) => e.id !== pe.id),
      row,
    ];
  }
  const result = Array.from(byId.values());
  for (const r of result) {
    r.exercises = [...r.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
  }
  return result;
}
