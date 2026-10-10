/**
 * Device-local lower rep bounds per routine exercise (MMKV) — **legacy
 * fallback**. Since migration 20261010130000 the lower bound lives in
 * `routine_exercises.target_reps_min` (`target_reps` = upper end). This store
 * is only read for routines saved before that (or by flows that still write
 * here); the routine editor writes the DB column and clears this entry.
 */
import { storage } from '@/lib/storage';

const key = (routineId: string) => `workout:routineRepMin:${routineId}`;

export function getRoutineRepMins(routineId: string): Record<string, number> {
  try {
    const raw = storage.getString(key(routineId));
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>))
      if (typeof v === 'number' && v > 0) out[id] = v;
    return out;
  } catch {
    return {};
  }
}

/** Replaces the remembered lower bounds of a routine (`{}` clears them). */
export function setRoutineRepMins(
  routineId: string,
  mins: Record<string, number>,
): void {
  try {
    if (Object.keys(mins).length === 0) storage.remove(key(routineId));
    else storage.set(key(routineId), JSON.stringify(mins));
  } catch {
    // device-local nicety, never block a save
  }
}

/**
 * Rep range of one routine exercise: `{ min, max }` (min === max when no range
 * is stored). `storedMin` = the DB's `target_reps_min`; when null/absent the
 * device-local legacy value is used.
 */
export function getRoutineRepRange(
  routineId: string,
  exerciseId: string,
  targetReps: number | null,
  storedMin?: number | null,
): { min: number; max: number } | null {
  if (targetReps === null || targetReps <= 0) return null;
  const min =
    storedMin != null && storedMin > 0
      ? storedMin
      : getRoutineRepMins(routineId)[exerciseId];
  return {
    min: min !== undefined && min < targetReps ? min : targetReps,
    max: targetReps,
  };
}
