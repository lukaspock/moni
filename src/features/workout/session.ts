/**
 * Active workout session (`app/workout/active.tsx`), PLAN §7.4/§7.7: fully
 * offline, Zustand + MMKV persistence so a killed app doesn't lose an
 * in-progress workout.
 */
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

import { storage } from '@/lib/storage';
import type {
  ActiveExercise,
  ActiveSet,
  TrackingType,
  WorkoutCategory,
} from './types';

const mmkvStateStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.remove(name),
};

export interface ActiveWorkoutState {
  workoutId: string | null;
  routineId: string | null;
  category: WorkoutCategory;
  startedAt: string | null;
  exercises: ActiveExercise[];
  /** epoch ms the rest timer ends at, or null when no rest timer is running. */
  restEndsAt: number | null;

  /** Starts a fresh session (replacing any persisted one), optionally pre-filled from a routine in one atomic write. */
  startWorkout: (opts: {
    routineId?: string | null;
    category?: WorkoutCategory;
    exercises?: NewActiveExercise[];
  }) => void;
  addExercise: (
    exerciseId: string,
    trackingType: TrackingType,
    targetSets?: number,
    targetReps?: number | null,
  ) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (
    exerciseId: string,
    setId: string,
    patch: Partial<Omit<ActiveSet, 'id' | 'setIndex'>>,
  ) => void;
  /**
   * Checks/unchecks a set. When it becomes completed, `prefill` (values taken
   * from the previous workout for fields the user left empty) is applied in
   * the same write, and the rest timer starts if `restSeconds` is given.
   */
  toggleSetCompleted: (
    exerciseId: string,
    setId: string,
    opts?: {
      restSeconds?: number;
      prefill?: Partial<Omit<ActiveSet, 'id' | 'setIndex'>>;
    },
  ) => void;
  startRestTimer: (seconds: number) => void;
  /** Shortens/extends the running rest timer (never below 0; no-op without a running timer). */
  adjustRestTimer: (deltaSeconds: number) => void;
  clearRestTimer: () => void;
  reset: () => void;

  // ---- additive (live session revamp, docs/identity/06 §5) ----
  /** Length of the running rest incl. adjustments (for the progress bar); null = unknown. */
  restTotalSeconds: number | null;
  /** Starts a rest timer and remembers its length (`startRestTimer` + total). */
  startRest: (seconds: number) => void;
  /** Like `adjustRestTimer`, also moving the remembered total. */
  adjustRest: (deltaSeconds: number) => void;
  /** Appends an unchecked set carrying `values` ("+ Satz" duplicates the last one). */
  addSetWithValues: (
    exerciseId: string,
    values: Partial<
      Pick<ActiveSet, 'reps' | 'weightKg' | 'durationS' | 'distanceM'>
    >,
  ) => void;
  /** Writes `weightKg` into every unchecked set of the exercise (progression hint). */
  applyWeightToOpenSets: (exerciseId: string, weightKg: number) => void;
  /**
   * Swaps an exercise in place (same position, same number of sets and
   * target reps, values cleared). No-op when `toId` is already in the session.
   */
  replaceExercise: (
    fromId: string,
    toId: string,
    trackingType: TrackingType,
  ) => void;
}

export interface NewActiveExercise {
  exerciseId: string;
  trackingType: TrackingType;
  targetSets?: number | null;
  targetReps?: number | null;
  /** Additive: rep range lower bound + superset group from the routine. */
  targetRepsMin?: number | null;
  supersetGroup?: number | null;
}

function blankSet(index: number): ActiveSet {
  return {
    id: Crypto.randomUUID(),
    setIndex: index,
    reps: null,
    weightKg: null,
    rpe: null,
    durationS: null,
    distanceM: null,
    completedAt: null,
  };
}

/** Sensible number of empty rows for a freshly added exercise. */
function defaultSetCount(trackingType: TrackingType): number {
  return trackingType === 'distance_duration' ? 1 : 3;
}

function buildExercise(e: NewActiveExercise): ActiveExercise {
  const count = Math.max(1, e.targetSets ?? defaultSetCount(e.trackingType));
  return {
    exerciseId: e.exerciseId,
    trackingType: e.trackingType,
    targetReps: e.targetReps ?? null,
    targetRepsMin: e.targetRepsMin ?? null,
    supersetGroup: e.supersetGroup ?? null,
    sets: Array.from({ length: count }, (_, i) => blankSet(i)),
  };
}

const emptyState = {
  workoutId: null as string | null,
  routineId: null as string | null,
  category: 'strength' as WorkoutCategory,
  startedAt: null as string | null,
  exercises: [] as ActiveExercise[],
  restEndsAt: null as number | null,
  restTotalSeconds: null as number | null,
};

export const useActiveWorkoutStore = create<ActiveWorkoutState>()(
  persist(
    (set, get) => ({
      ...emptyState,

      startWorkout: ({
        routineId = null,
        category = 'strength',
        exercises = [],
      }) => {
        const seen = new Set<string>();
        const built = exercises
          .filter((e) => !seen.has(e.exerciseId) && seen.add(e.exerciseId))
          .map(buildExercise);
        set({
          workoutId: Crypto.randomUUID(),
          routineId,
          category,
          startedAt: new Date().toISOString(),
          exercises: built,
          restEndsAt: null,
        });
      },

      addExercise: (exerciseId, trackingType, targetSets, targetReps) => {
        const exists = get().exercises.some((e) => e.exerciseId === exerciseId);
        if (exists) return;
        const exercise = buildExercise({
          exerciseId,
          trackingType,
          targetSets,
          targetReps,
        });
        set((s) => ({ exercises: [...s.exercises, exercise] }));
      },

      removeExercise: (exerciseId) => {
        set((s) => ({
          exercises: s.exercises.filter((e) => e.exerciseId !== exerciseId),
        }));
      },

      addSet: (exerciseId) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : { ...e, sets: [...e.sets, blankSet(e.sets.length)] },
          ),
        }));
      },

      removeSet: (exerciseId, setId) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets
                    .filter((st) => st.id !== setId)
                    .map((st, i) => ({ ...st, setIndex: i })),
                },
          ),
        }));
      },

      updateSet: (exerciseId, setId, patch) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((st) =>
                    st.id === setId ? { ...st, ...patch } : st,
                  ),
                },
          ),
        }));
      },

      toggleSetCompleted: (exerciseId, setId, opts) => {
        let didComplete = false;
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((st) => {
                    if (st.id !== setId) return st;
                    didComplete = st.completedAt === null;
                    return didComplete
                      ? {
                          ...st,
                          ...opts?.prefill,
                          completedAt: new Date().toISOString(),
                        }
                      : { ...st, completedAt: null };
                  }),
                },
          ),
        }));
        if (didComplete && opts?.restSeconds) {
          get().startRestTimer(opts.restSeconds);
        }
      },

      startRestTimer: (seconds) =>
        set({ restEndsAt: Date.now() + seconds * 1000 }),
      adjustRestTimer: (deltaSeconds) => {
        const { restEndsAt } = get();
        if (restEndsAt === null) return;
        const next = restEndsAt + deltaSeconds * 1000;
        set({ restEndsAt: next <= Date.now() ? null : next });
      },
      clearRestTimer: () => set({ restEndsAt: null }),

      reset: () => set({ ...emptyState }),

      startRest: (seconds) =>
        set({
          restEndsAt: Date.now() + seconds * 1000,
          restTotalSeconds: seconds,
        }),

      adjustRest: (deltaSeconds) => {
        const { restEndsAt, restTotalSeconds } = get();
        if (restEndsAt === null) return;
        get().adjustRestTimer(deltaSeconds);
        if (get().restEndsAt === null) return;
        set({
          restTotalSeconds:
            restTotalSeconds === null
              ? null
              : Math.max(1, restTotalSeconds + deltaSeconds),
        });
      },

      addSetWithValues: (exerciseId, values) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : {
                  ...e,
                  sets: [
                    ...e.sets,
                    {
                      ...blankSet(e.sets.length),
                      reps: values.reps ?? null,
                      weightKg: values.weightKg ?? null,
                      durationS: values.durationS ?? null,
                      distanceM: values.distanceM ?? null,
                    },
                  ],
                },
          ),
        }));
      },

      applyWeightToOpenSets: (exerciseId, weightKg) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((st) =>
                    st.completedAt === null ? { ...st, weightKg } : st,
                  ),
                },
          ),
        }));
      },

      replaceExercise: (fromId, toId, trackingType) => {
        const { exercises } = get();
        if (fromId === toId || exercises.some((e) => e.exerciseId === toId))
          return;
        set({
          exercises: exercises.map((e) =>
            e.exerciseId !== fromId
              ? e
              : buildExercise({
                  exerciseId: toId,
                  trackingType,
                  // Different kind (e.g. squat -> running): its own defaults.
                  targetSets:
                    e.trackingType === trackingType ? e.sets.length : undefined,
                  targetReps:
                    e.trackingType === trackingType
                      ? (e.targetReps ?? null)
                      : null,
                  targetRepsMin:
                    e.trackingType === trackingType
                      ? (e.targetRepsMin ?? null)
                      : null,
                  // The swapped-in exercise keeps its place in a superset.
                  supersetGroup: e.supersetGroup ?? null,
                }),
          ),
        });
      },
    }),
    {
      name: 'workout:activeSession',
      storage: createJSONStorage(() => mmkvStateStorage),
    },
  ),
);

export function useIsWorkoutActive(): boolean {
  return useActiveWorkoutStore((s) => s.workoutId !== null);
}

export function elapsedSeconds(
  startedAtIso: string | null,
  nowMs: number,
): number {
  if (!startedAtIso) return 0;
  const started = new Date(startedAtIso).getTime();
  return Math.max(0, Math.floor((nowMs - started) / 1000));
}
