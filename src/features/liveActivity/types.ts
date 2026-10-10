/**
 * Types of the workout Live Activity (lock screen + Dynamic Island).
 * Pure, no RN/Expo imports — shared by the pure derivation (`derive.ts`),
 * the JS API (`index.ts`) and the native layout (`WorkoutActivity.tsx`).
 */

/**
 * Localized strings/formatters for the activity. The app passes them in (the
 * widget extension has no i18n), e.g. built from `workoutLive.*` keys.
 * Functions run in the app's JS only; the activity receives finished strings.
 */
export interface WorkoutActivityLabels {
  /** BCP-47 locale for number formatting (`82,5` vs `82.5`). */
  locale: string;
  /** "Satz 2 von 3" */
  setOf: (current: number, total: number) => string;
  /** "80 kg × 8" — `weight` is already formatted for `locale`. */
  weightReps: (weight: string, unit: 'kg' | 'lb', reps: number) => string;
  /** "80 kg" */
  weight: (weight: string, unit: 'kg' | 'lb') => string;
  /** "8 Wdh." */
  reps: (reps: number) => string;
  /** "Pause" */
  rest: string;
  /** "Laufzeit" */
  elapsed: string;
}

/** What the app knows about the running workout (input of the JS API). */
export interface WorkoutActivityState {
  routineName: string;
  exerciseName: string;
  /** 0-based index of the current set. */
  setIndex: number;
  setCount: number;
  /** Always metric; converted for display according to `unit`. */
  weightKg?: number | null;
  reps?: number | null;
  unit: 'kg' | 'lb';
  /** ISO timestamp the workout started at (drives the elapsed timer). */
  startedAt: string;
  /** ISO timestamp the running rest ends at, or null/undefined without rest. */
  restEndsAt?: string | null;
  /** ISO timestamp the running rest started at (progress bar); optional. */
  restStartedAt?: string | null;
  labels: WorkoutActivityLabels;
}

/**
 * Serializable content state sent to ActivityKit (JSON). Only finished strings
 * and epoch-ms timestamps — the native layout does no formatting/i18n.
 * Contains no "now"-dependent values, so equal inputs give equal props
 * (updates only on real state changes; timers tick natively).
 */
export interface WorkoutActivityProps {
  routine: string;
  exercise: string;
  /** Short exercise tag for the compact Dynamic Island ("BP", "Knie"). */
  exerciseShort: string;
  /** "Satz 2 von 3 · 80 kg × 8" */
  setLine: string;
  /** "2/3" */
  setShort: string;
  startedAtMs: number;
  restStartMs: number | null;
  restEndsAtMs: number | null;
  restLabel: string;
  elapsedLabel: string;
}
