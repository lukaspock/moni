/**
 * Pure overlay of not-yet-synced outbox mutations onto the routines read from
 * Supabase (no React / native imports, unit-tested). Without it a deleted
 * routine reappears until its queued delete has synced, and a routine created
 * or edited offline is invisible.
 */
import type { Routine, RoutineExercise } from './types';

type Payload = Record<string, unknown>;

export function overlayRoutines(params: {
  server: readonly Routine[];
  userId: string;
  routineUpserts: readonly Payload[];
  routineDeleteIds: ReadonlySet<string>;
  exerciseUpserts: readonly Payload[];
  exerciseDeleteIds: ReadonlySet<string>;
}): Routine[] {
  const { userId } = params;

  const routines = new Map<string, Routine>();
  for (const r of params.server) {
    if (params.routineDeleteIds.has(r.id)) continue;
    routines.set(r.id, { ...r, exercises: [...r.exercises] });
  }
  for (const p of params.routineUpserts) {
    const id = p.id as string;
    if (params.routineDeleteIds.has(id)) continue;
    if (p.user_id !== undefined && p.user_id !== userId) continue;
    const existing = routines.get(id);
    if (existing) {
      if (typeof p.name === 'string') existing.name = p.name;
    } else if (typeof p.name === 'string') {
      routines.set(id, { id, userId, name: p.name, exercises: [] });
    }
  }

  // Exercises: drop queued deletes, then apply queued upserts (new rows or edits).
  for (const routine of routines.values()) {
    routine.exercises = routine.exercises.filter(
      (e) => !params.exerciseDeleteIds.has(e.id),
    );
  }
  for (const p of params.exerciseUpserts) {
    const id = p.id as string;
    if (params.exerciseDeleteIds.has(id)) continue;
    const routineId = p.routine_id as string | undefined;
    if (!routineId) continue; // partial patch without parent: can't place it
    const routine = routines.get(routineId);
    if (!routine) continue;
    const idx = routine.exercises.findIndex((e) => e.id === id);
    const prev: RoutineExercise | undefined = routine.exercises[idx];
    const next: RoutineExercise = {
      id,
      routineId,
      exerciseId:
        (p.exercise_id as string | undefined) ?? prev?.exerciseId ?? '',
      orderIndex:
        (p.order_index as number | undefined) ?? prev?.orderIndex ?? 0,
      targetSets:
        p.target_sets !== undefined
          ? (p.target_sets as number | null)
          : (prev?.targetSets ?? null),
      targetReps:
        p.target_reps !== undefined
          ? (p.target_reps as number | null)
          : (prev?.targetReps ?? null),
    };
    if (!next.exerciseId) continue;
    if (idx === -1) routine.exercises.push(next);
    else routine.exercises[idx] = next;
  }
  for (const routine of routines.values()) {
    routine.exercises.sort((a, b) => a.orderIndex - b.orderIndex);
  }
  return [...routines.values()];
}
