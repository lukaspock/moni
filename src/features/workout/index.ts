// CONTRACT (owner: `workout` agent). Signatures are fixed, implementation is replaced.
import { useSession } from '@/features/auth';
import { useWorkoutsForDateImpl } from './history';
import { usePlannedDaysWithRoutineNames } from './plan';
import { weekdayOf } from '@/lib/date';

export type WorkoutSummary = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  category: 'strength' | 'cardio' | 'sport' | 'other';
  kcalBurned: number | null;
  routineName: string | null;
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

/** Weekly plan entry for that date's weekday, or null = rest day. */
export function usePlannedDay(date: string): {
  plannedDay: PlannedDay | null;
  isLoading: boolean;
} {
  const { days, isLoading } = usePlannedDaysWithRoutineNames();
  const weekday = weekdayOf(date);
  const day = days.find((d) => d.weekday === weekday);
  if (!day || (day.routineId === null && day.expectedKcal === null)) {
    return { plannedDay: null, isLoading };
  }
  return {
    plannedDay: {
      routineId: day.routineId,
      routineName: day.routineName,
      expectedKcal: day.expectedKcal ?? 0,
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
export * from './routines';
export * from './plan';
export * from './session';
export * from './history';
export * from './progress';
export * from './cardio';
export * from './weight';
