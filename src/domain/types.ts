/**
 * Shared enums/types for src/domain.
 * Mirrors the Postgres enums / columns described in PLAN.md §5.
 * Pure types only — no runtime dependencies.
 */

export type Sex = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';

export type Goal = 'lose' | 'maintain' | 'gain';

export type UnitSystem = 'metric' | 'imperial';

export type WorkoutCategory = 'strength' | 'cardio' | 'sport' | 'other';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodSource =
  'photo' | 'text' | 'voice' | 'barcode' | 'favorite' | 'manual';

export type WorkoutKcalSource = 'met' | 'healthkit' | 'manual';

export type TrackingType =
  'weight_reps' | 'reps' | 'duration' | 'distance_duration';

/** Onboarding v2 personalization — mirrors the `profiles` CHECK constraints (migration 20260929100000). */
export type Motivation =
  'health' | 'look' | 'performance' | 'energy' | 'confidence';

export type Diet =
  'omnivore' | 'flexitarian' | 'pescetarian' | 'vegetarian' | 'vegan';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
