// CONTRACT (owner: `workout` agent). Signatures are fixed, implementation is replaced.
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
  void date;
  return { workouts: [], isLoading: false };
}

/** Weekly plan entry for that date's weekday, or null = rest day. */
export function usePlannedDay(date: string): {
  plannedDay: PlannedDay | null;
  isLoading: boolean;
} {
  void date;
  return { plannedDay: null, isLoading: false };
}
