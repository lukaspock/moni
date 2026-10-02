/**
 * Shared entry points to begin a workout (Training tab): start a fresh
 * persisted session (empty or pre-filled from a routine), then open the
 * workout modal. A session that is still running (e.g. after an app restart)
 * is never overwritten silently: an empty start resumes it, a routine start
 * asks whether to resume or discard it.
 */
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useExerciseCatalog } from './exercises';
import { useActiveWorkoutStore } from './session';
import type { Routine } from './types';

let lastOpenedAt = 0;

/** Opens the live-workout modal; swallows a double tap so it can't be pushed twice. */
function openActiveWorkout(): void {
  const now = Date.now();
  if (now - lastOpenedAt < 800) return;
  lastOpenedAt = now;
  router.push('/workout/active');
}

export function useStartWorkout(): {
  startEmpty: () => void;
  startFromRoutine: (routine: Routine) => void;
  /** Re-opens the running session (no-op when there is none). */
  resumeWorkout: () => void;
  hasActiveWorkout: boolean;
} {
  const { t } = useTranslation();
  const hasActiveWorkout = useActiveWorkoutStore((s) => s.workoutId !== null);
  const { exercises: catalog } = useExerciseCatalog();

  function begin(routine: Routine | null) {
    const byId = new Map(catalog.map((e) => [e.id, e]));
    useActiveWorkoutStore.getState().startWorkout({
      routineId: routine?.id ?? null,
      category: 'strength',
      exercises: (routine?.exercises ?? []).map((re) => ({
        exerciseId: re.exerciseId,
        trackingType: byId.get(re.exerciseId)?.trackingType ?? 'weight_reps',
        targetSets: re.targetSets,
        targetReps: re.targetReps,
      })),
    });
    openActiveWorkout();
  }

  function resumeWorkout() {
    if (useActiveWorkoutStore.getState().workoutId) openActiveWorkout();
  }

  return {
    hasActiveWorkout,
    resumeWorkout,
    startEmpty: () => {
      if (useActiveWorkoutStore.getState().workoutId) {
        resumeWorkout();
        return;
      }
      begin(null);
    },
    startFromRoutine: (routine) => {
      if (!useActiveWorkoutStore.getState().workoutId) {
        begin(routine);
        return;
      }
      Alert.alert(
        t('workout.start.runningTitle'),
        t('workout.start.runningMessage'),
        [
          { text: t('workout.active.cancel'), style: 'cancel' },
          { text: t('workout.start.resume'), onPress: resumeWorkout },
          {
            text: t('workout.start.discardAndStart'),
            style: 'destructive',
            onPress: () => begin(routine),
          },
        ],
      );
    },
  };
}
