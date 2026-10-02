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
}

export interface NewActiveExercise {
  exerciseId: string;
  trackingType: TrackingType;
  targetSets?: number | null;
  targetReps?: number | null;
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
