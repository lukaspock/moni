/**
 * Draft state of the training setup flow (`app/training-setup/*`, docs/identity/06 §2).
 * Plain (non-persisted) Zustand store shared by the flow's screens: answers
 * (setting, frequency) and the editable routine proposal built from
 * `src/domain/routineTemplates.ts`. Reset with `start()` when the flow opens.
 */
import { create } from 'zustand';

import {
  clampDaysPerWeek,
  indexCatalogByNameKey,
  pickTemplate,
  resolveTemplate,
  templateTargetReps,
  type RoutineTemplateNameKey,
  type TrainingSetting,
} from '@/domain/routineTemplates';
import type { TrackingType } from '../types';

export interface SetupExercise {
  /** Stable key inside the draft (an exercise id can appear twice after a swap). */
  key: string;
  exerciseId: string;
  sets: number;
  /** Stored target reps (top of the template range); null for timed exercises. */
  reps: number | null;
  repsMin: number | null;
  durationMin: number | null;
}

export interface SetupRoutine {
  key: string;
  /** Template name, translated at render/save time. */
  nameKey: RoutineTemplateNameKey | null;
  /** User-entered name; null = use the template name. */
  name: string | null;
  exercises: SetupExercise[];
}

/** Catalog entry fields the store needs. */
export interface SetupCatalogEntry {
  id: string;
  nameKey: string | null;
  trackingType: TrackingType;
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_TIMED_MINUTES = 20;

const isTimed = (trackingType: TrackingType) =>
  trackingType === 'duration' || trackingType === 'distance_duration';

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}-${++keySeq}`;

function exerciseFor(
  entry: SetupCatalogEntry,
  previous?: SetupExercise,
): SetupExercise {
  if (isTimed(entry.trackingType)) {
    return {
      key: nextKey('ex'),
      exerciseId: entry.id,
      sets: 1,
      reps: null,
      repsMin: null,
      durationMin: previous?.durationMin ?? DEFAULT_TIMED_MINUTES,
    };
  }
  const prevWasStrength = previous && previous.reps !== null;
  return {
    key: nextKey('ex'),
    exerciseId: entry.id,
    sets: prevWasStrength ? previous.sets : DEFAULT_SETS,
    reps: prevWasStrength ? previous.reps : DEFAULT_REPS,
    repsMin: prevWasStrength ? previous.repsMin : null,
    durationMin: null,
  };
}

interface TrainingSetupState {
  setting: TrainingSetting | null;
  daysPerWeek: number | null;
  routines: SetupRoutine[];
  /** `<setting>:<days>` the current proposal was built for (null = none yet). */
  proposalFor: string | null;

  start: () => void;
  setSetting: (setting: TrainingSetting) => void;
  setDaysPerWeek: (days: number) => void;
  /** (Re)builds the proposal from the templates unless it already matches the answers. */
  buildProposal: (catalog: readonly SetupCatalogEntry[]) => void;
  renameRoutine: (routineKey: string, name: string) => void;
  removeExercise: (routineKey: string, exerciseKey: string) => void;
  replaceExercise: (
    routineKey: string,
    exerciseKey: string,
    entry: SetupCatalogEntry,
  ) => void;
  addExercises: (routineKey: string, entries: SetupCatalogEntry[]) => void;
}

export const proposalKey = (setting: TrainingSetting, days: number) =>
  `${setting}:${clampDaysPerWeek(days)}`;

const initial = {
  setting: null,
  daysPerWeek: null,
  routines: [] as SetupRoutine[],
  proposalFor: null,
};

function mapRoutine(
  routines: SetupRoutine[],
  routineKey: string,
  fn: (r: SetupRoutine) => SetupRoutine,
): SetupRoutine[] {
  return routines.map((r) => (r.key === routineKey ? fn(r) : r));
}

export const useTrainingSetupStore = create<TrainingSetupState>((set, get) => ({
  ...initial,

  start: () => set({ ...initial }),
  setSetting: (setting) => set({ setting }),
  setDaysPerWeek: (days) => set({ daysPerWeek: clampDaysPerWeek(days) }),

  buildProposal: (catalog) => {
    const { setting, daysPerWeek, proposalFor } = get();
    // An empty catalog (first launch, still loading) would yield empty routines.
    if (!setting || catalog.length === 0) return;
    const days = clampDaysPerWeek(daysPerWeek);
    const key = proposalKey(setting, days);
    if (proposalFor === key) return;
    const byKey = indexCatalogByNameKey(catalog);
    const routines = pickTemplate(setting, days).routines.map(
      (template): SetupRoutine => {
        const resolved = resolveTemplate(template, byKey);
        return {
          key: nextKey('routine'),
          nameKey: resolved.nameKey,
          name: null,
          exercises: resolved.exercises.map((ex) => ({
            key: nextKey('ex'),
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: templateTargetReps(ex),
            repsMin: ex.repsMin,
            durationMin: ex.durationMin,
          })),
        };
      },
    );
    set({ routines, proposalFor: key });
  },

  renameRoutine: (routineKey, name) =>
    set((s) => ({
      routines: mapRoutine(s.routines, routineKey, (r) => ({ ...r, name })),
    })),

  removeExercise: (routineKey, exerciseKey) =>
    set((s) => ({
      routines: mapRoutine(s.routines, routineKey, (r) => ({
        ...r,
        exercises: r.exercises.filter((e) => e.key !== exerciseKey),
      })),
    })),

  replaceExercise: (routineKey, exerciseKey, entry) =>
    set((s) => ({
      routines: mapRoutine(s.routines, routineKey, (r) => ({
        ...r,
        exercises: r.exercises.map((e) =>
          e.key === exerciseKey ? exerciseFor(entry, e) : e,
        ),
      })),
    })),

  addExercises: (routineKey, entries) =>
    set((s) => ({
      routines: mapRoutine(s.routines, routineKey, (r) => {
        const present = new Set(r.exercises.map((e) => e.exerciseId));
        const added = entries
          .filter((entry) => !present.has(entry.id))
          .map((entry) => exerciseFor(entry));
        return { ...r, exercises: [...r.exercises, ...added] };
      }),
    })),
}));
