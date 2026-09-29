/**
 * Cardio/sport quick entry (PLAN §7.4): duration, optional distance,
 * intensity -> kcal via MET. Writes straight to the outbox like the active
 * workout does, so it also works offline.
 */
import * as Crypto from 'expo-crypto';

import { enqueueUpsert } from '@/lib/outbox';
import { exportWorkoutToHealth } from '@/features/health';
import { calculateKcalBurned, metForIntensity, type CardioIntensity } from '@/domain/met';
import type { Exercise, WorkoutCategory } from './types';

export interface LogCardioInput {
  userId: string;
  exercise: Exercise | null;
  category: Exclude<WorkoutCategory, 'strength'>;
  intensity: CardioIntensity;
  durationMinutes: number;
  distanceM?: number | null;
  weightKg: number;
  notes?: string | null;
}

export interface LogCardioResult {
  workoutId: string;
  kcalBurned: number;
}

/** Logs a completed cardio/sport session (already finished, unlike the active-workout flow). */
export function logCardioWorkout(input: LogCardioInput): LogCardioResult {
  const metValue = input.exercise?.metValue ?? metForIntensity(input.intensity);
  const kcalBurned = Math.round(calculateKcalBurned(metValue, input.weightKg, input.durationMinutes / 60));

  const workoutId = Crypto.randomUUID();
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - input.durationMinutes * 60000);

  enqueueUpsert('workouts', workoutId, {
    user_id: input.userId,
    routine_id: null,
    started_at: startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    category: input.category,
    kcal_burned: kcalBurned,
    kcal_source: 'met',
    notes: input.notes ?? null,
  });
  // Apple Health write-back (fire-and-forget; no-op unless enabled in settings, never blocks this offline flow).
  void exportWorkoutToHealth({ workoutId, category: input.category, startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(), kcalBurned });

  if (input.exercise) {
    const setId = Crypto.randomUUID();
    enqueueUpsert('workout_sets', setId, {
      workout_id: workoutId,
      exercise_id: input.exercise.id,
      set_index: 0,
      duration_s: Math.round(input.durationMinutes * 60),
      distance_m: input.distanceM ?? null,
      completed_at: endedAt.toISOString(),
    });
  }

  return { workoutId, kcalBurned };
}
