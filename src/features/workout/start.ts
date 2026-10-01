/**
 * Shared entry points to begin a workout (Today card, Training tab): reset the
 * persisted active-workout store, optionally pre-fill it from a routine, then
 * open the workout modal.
 */
import { router } from 'expo-router';

import { useExerciseCatalog } from './exercises';
import { useActiveWorkoutStore } from './session';
import type { Routine } from './types';

export function useStartWorkout(): {
  startEmpty: () => void;
  startFromRoutine: (routine: Routine) => void;
} {
  const startWorkout = useActiveWorkoutStore((s) => s.startWorkout);
  const addExercise = useActiveWorkoutStore((s) => s.addExercise);
  const { exercises: catalog } = useExerciseCatalog();

  return {
    startEmpty: () => {
      startWorkout({ routineId: null, category: 'strength' });
      router.push('/workout/active');
    },
    startFromRoutine: (routine) => {
      startWorkout({ routineId: routine.id, category: 'strength' });
      for (const re of routine.exercises) {
        const exercise = catalog.find((e) => e.id === re.exerciseId);
        addExercise(
          re.exerciseId,
          exercise?.trackingType ?? 'weight_reps',
          re.targetSets ?? 3,
        );
      }
      router.push('/workout/active');
    },
  };
}
