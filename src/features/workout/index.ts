// CONTRACT (owner: `workout` agent). Signatures are fixed, implementation is replaced.
import { useSession } from '@/features/auth';
import { useWorkoutsForDateImpl } from './history';
import { useLegacyWeeklyPlan } from './plan';
import { useRoutines } from './routines';
import { usePlanForDate, useTrainingCycle } from './trainingCycle';
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
 * Training-day entry for that date, or null = rest day. With a training cycle
 * this is the effective (shifted) cycle plan: `routineId`/`routineName` are the
 * slot's routine (both null when the slot uses the rotation or its routine was
 * deleted). Without a cycle the legacy `training_plan_days` row for the date's
 * weekday is the flag (rows from the old weekday toggles have neither a
 * routine nor expected kcal and still count). `expectedKcal` only comes from
 * legacy rows (0 otherwise) — the bonus is real data only.
 */
export function usePlannedDay(date: string): {
  plannedDay: PlannedDay | null;
  isLoading: boolean;
} {
  const { cycle, isLoading: cycleLoading } = useTrainingCycle();
  const { day } = usePlanForDate(date);
  const { routines } = useRoutines();
  const legacy = useLegacyWeeklyPlan(!cycleLoading && !cycle);
  if (cycleLoading) return { plannedDay: null, isLoading: true };
  if (cycle) {
    if (!day || day.kind !== 'training') {
      return { plannedDay: null, isLoading: false };
    }
    const routine = day.routineId
      ? (routines.find((r) => r.id === day.routineId) ?? null)
      : null;
    return {
      plannedDay: {
        routineId: routine?.id ?? null,
        routineName: routine?.name ?? null,
        expectedKcal: 0,
      },
      isLoading: false,
    };
  }
  const row = legacy.planByWeekday.get(weekdayOf(date));
  if (!row) return { plannedDay: null, isLoading: legacy.isLoading };
  return {
    plannedDay: {
      routineId: row.routine_id,
      routineName: null,
      expectedKcal: row.expected_kcal ?? 0,
    },
    isLoading: legacy.isLoading,
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
export * from './trainingCycle';
export { PlanStrip } from './cycle/PlanStrip';
export * from './cycle/usePlanShiftActions';
export * from './session';
export * from './start';
export * from './finish';
export * from './restTimer';
export * from './history';
export * from './progress';
export * from './weight';
export * from './recentExercises';
// Training setup flow (T1): draft store + per-user "shown once" flag. The
// flow's hooks live in `./setup` (imported directly — they depend on the
// targets feature, which imports this barrel).
export * from './setup/setupStore';
export * from './setup/prompted';
export type { ExercisePickerViewProps } from './ExercisePickerView';
export {
  getRoutineRepMins,
  setRoutineRepMins,
  getRoutineRepRange,
} from './editor/repRangeStore';
export { useLastSessionSets } from './live/useLastSessionSets';
