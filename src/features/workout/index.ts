// CONTRACT (owner: `workout` agent). Signatures are fixed, implementation is replaced.
import { useSession } from '@/features/auth';
import { useWorkoutsForDateImpl } from './history';
import { useWeeklyPlan } from './plan';
import { weekdayOf } from '@/lib/date';

export type WorkoutSummary = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  category: 'strength' | 'cardio' | 'sport' | 'other';
  kcalBurned: number | null;
  routineName: string | null;
  /** Linked to an Apple Health workout (imported, or its kcal measured by Health). Optional, additive. */
  isFromHealth?: boolean;
};

export type PlannedDay = {
  routineId: string | null;
  routineName: string | null;
  expectedKcal: number;
};

/** Workouts that started on the given local date (YYYY-MM-DD), incl. unsynced offline ones. */
export function useWorkoutsForDate(date: string): {
  workouts: WorkoutSummary[];
  isLoading: boolean;
} {
  const { userId } = useSession();
  return useWorkoutsForDateImpl(userId, date);
}

/**
 * Training-day entry for that date's weekday, or null = rest day. A
 * `training_plan_days` row *is* the flag: rows written by the profile's weekday
 * toggles have neither a routine nor expected kcal, and must still count
 * (previously such rows were treated as rest days). `routineName` is always
 * null now — the plan no longer links routines in the UI.
 */
export function usePlannedDay(date: string): {
  plannedDay: PlannedDay | null;
  isLoading: boolean;
} {
  const { planByWeekday, isLoading } = useWeeklyPlan();
  const row = planByWeekday.get(weekdayOf(date));
  if (!row) return { plannedDay: null, isLoading };
  return {
    plannedDay: {
      routineId: row.routine_id,
      routineName: null,
      expectedKcal: row.expected_kcal ?? 0,
    },
    isLoading,
  };
}

// -- Everything below this line is internal-but-exported so other files in
// -- this feature (and workout/training screens elsewhere in the app) can
// -- import from the single feature entrypoint. Other FEATURES must only use
// -- the contract above.
export * from './types';
export * from './exercises';
export * from './pickerStore';
export { ExercisePickerView } from './ExercisePickerView';
export * from './routines';
export * from './plan';
export * from './session';
export * from './start';
export * from './finish';
export * from './restTimer';
export * from './history';
export * from './progress';
export * from './weight';
export * from './recentExercises';
