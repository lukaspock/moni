import type { Database } from '@/types/database';

export type ExerciseCategory = 'strength' | 'cardio' | 'sport' | 'other';
export type TrackingType =
  'weight_reps' | 'reps' | 'duration' | 'distance_duration';
export type WorkoutCategory = ExerciseCategory;
export type KcalSource = 'met' | 'healthkit' | 'manual';

export type ExerciseRow = Database['public']['Tables']['exercises']['Row'];
export type RoutineRow = Database['public']['Tables']['routines']['Row'];
export type RoutineExerciseRow =
  Database['public']['Tables']['routine_exercises']['Row'];
export type TrainingPlanDayRow =
  Database['public']['Tables']['training_plan_days']['Row'];
export type WorkoutRow = Database['public']['Tables']['workouts']['Row'];
export type WorkoutSetRow = Database['public']['Tables']['workout_sets']['Row'];

/** Exercise, normalized for display: `displayKey` is either an i18n key (`exercise.<key>`) or a literal custom name. */
export interface Exercise {
  id: string;
  ownerId: string | null;
  nameKey: string | null;
  customName: string | null;
  category: ExerciseCategory;
  muscleGroups: string[];
  equipment: string | null;
  metValue: number | null;
  trackingType: TrackingType;
}

export function exerciseFromRow(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    ownerId: row.owner_id,
    nameKey: row.name_key,
    customName: row.custom_name,
    category: row.category as ExerciseCategory,
    muscleGroups: row.muscle_groups ?? [],
    equipment: row.equipment,
    metValue: row.met_value,
    trackingType: row.tracking_type as TrackingType,
  };
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  orderIndex: number;
  targetSets: number | null;
  targetReps: number | null;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  exercises: RoutineExercise[];
}

export interface ActiveSet {
  id: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  durationS: number | null;
  distanceM: number | null;
  completedAt: string | null;
}

export interface ActiveExercise {
  exerciseId: string;
  trackingType: TrackingType;
  /** Routine's target reps, shown as a placeholder when there is no previous value. */
  targetReps?: number | null;
  sets: ActiveSet[];
}
