/**
 * Active workout session (`app/workout/active.tsx`), PLAN §7.4/§7.7: fully
 * offline, Zustand + MMKV persistence so a killed app doesn't lose an
 * in-progress workout.
 */
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { storage } from '@/lib/storage';
import type { ActiveExercise, ActiveSet, TrackingType, WorkoutCategory } from './types';

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

  startWorkout: (opts: { routineId?: string | null; category?: WorkoutCategory }) => void;
  addExercise: (exerciseId: string, trackingType: TrackingType, targetSets?: number) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<Omit<ActiveSet, 'id' | 'setIndex'>>) => void;
  toggleSetCompleted: (exerciseId: string, setId: string, restSeconds?: number) => void;
  startRestTimer: (seconds: number) => void;
  clearRestTimer: () => void;
  reset: () => void;
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

      startWorkout: ({ routineId = null, category = 'strength' }) => {
        set({
          workoutId: Crypto.randomUUID(),
          routineId,
          category,
          startedAt: new Date().toISOString(),
          exercises: [],
          restEndsAt: null,
        });
      },

      addExercise: (exerciseId, trackingType, targetSets = 3) => {
        const exists = get().exercises.some((e) => e.exerciseId === exerciseId);
        if (exists) return;
        const sets: ActiveSet[] = Array.from({ length: Math.max(1, targetSets) }, (_, i) => ({
          id: Crypto.randomUUID(),
          setIndex: i,
          reps: null,
          weightKg: null,
          rpe: null,
          durationS: null,
          distanceM: null,
          completedAt: null,
        }));
        set((s) => ({ exercises: [...s.exercises, { exerciseId, trackingType, sets }] }));
      },

      removeExercise: (exerciseId) => {
        set((s) => ({ exercises: s.exercises.filter((e) => e.exerciseId !== exerciseId) }));
      },

      addSet: (exerciseId) => {
        set((s) => ({
          exercises: s.exercises.map((e) => {
            if (e.exerciseId !== exerciseId) return e;
            const newSet: ActiveSet = {
              id: Crypto.randomUUID(),
              setIndex: e.sets.length,
              reps: null,
              weightKg: null,
              rpe: null,
              durationS: null,
              distanceM: null,
              completedAt: null,
            };
            return { ...e, sets: [...e.sets, newSet] };
          }),
        }));
      },

      removeSet: (exerciseId, setId) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : { ...e, sets: e.sets.filter((st) => st.id !== setId).map((st, i) => ({ ...st, setIndex: i })) },
          ),
        }));
      },

      updateSet: (exerciseId, setId, patch) => {
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : { ...e, sets: e.sets.map((st) => (st.id === setId ? { ...st, ...patch } : st)) },
          ),
        }));
      },

      toggleSetCompleted: (exerciseId, setId, restSeconds) => {
        let didComplete = false;
        set((s) => ({
          exercises: s.exercises.map((e) =>
            e.exerciseId !== exerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((st) => {
                    if (st.id !== setId) return st;
                    const nowCompleted = st.completedAt === null;
                    didComplete = nowCompleted;
                    return { ...st, completedAt: nowCompleted ? new Date().toISOString() : null };
                  }),
                },
          ),
        }));
        if (didComplete && restSeconds) {
          get().startRestTimer(restSeconds);
        }
      },

      startRestTimer: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000 }),
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

export function elapsedSeconds(startedAtIso: string | null, nowMs: number): number {
  if (!startedAtIso) return 0;
  const started = new Date(startedAtIso).getTime();
  return Math.max(0, Math.floor((nowMs - started) / 1000));
}
