/**
 * Exercise catalog: global (owner_id null) + the user's own, cached in MMKV
 * so the picker and active workout work offline (PLAN §7.4 / §7.7).
 */
import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { enqueueUpsert, pendingUpsertsForTable } from '@/lib/outbox';
import { useSession } from '@/features/auth';
import {
  exerciseFromRow,
  type Exercise,
  type ExerciseCategory,
  type TrackingType,
} from './types';

const CATALOG_CACHE_KEY = 'workout:exerciseCatalog';

/** Sensible default MET for a custom exercise when the user doesn't set one; strength MET is computed dynamically from session density (see src/domain/met.ts) so it stays null. */
export function defaultMetForCategory(
  category: ExerciseCategory,
): number | null {
  switch (category) {
    case 'strength':
      return null;
    case 'cardio':
      return 7;
    case 'sport':
      return 6;
    case 'other':
      return 3;
  }
}

function readCache(): Exercise[] {
  const raw = storage.getString(CATALOG_CACHE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Exercise[];
  } catch {
    return [];
  }
}

function writeCache(exercises: Exercise[]): void {
  storage.set(CATALOG_CACHE_KEY, JSON.stringify(exercises));
}

/** Overlays any not-yet-synced custom exercises from the outbox onto a list. */
function withPendingExercises(
  base: Exercise[],
  userId: string | null,
): Exercise[] {
  const pending = pendingUpsertsForTable('exercises')
    .filter((p) => p.owner_id === userId)
    .map((p) =>
      exerciseFromRow({
        id: p.id as string,
        owner_id: (p.owner_id as string) ?? null,
        name_key: (p.name_key as string) ?? null,
        custom_name: (p.custom_name as string) ?? null,
        category: p.category as string,
        muscle_groups: (p.muscle_groups as string[]) ?? [],
        equipment: (p.equipment as string) ?? null,
        met_value: (p.met_value as number) ?? null,
        tracking_type: p.tracking_type as string,
        created_at: new Date().toISOString(),
      }),
    );
  const byId = new Map(base.map((e) => [e.id, e]));
  for (const p of pending) byId.set(p.id, p);
  return Array.from(byId.values());
}

const catalogQueryKey = ['workout', 'exerciseCatalog'] as const;

async function fetchCatalog(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name_key', { ascending: true, nullsFirst: false });
  if (error) throw error;
  const mapped = (data ?? []).map(exerciseFromRow);
  writeCache(mapped); // side effect inside queryFn, not component state -> safe to do here
  return mapped;
}

/** Loads the full catalog (global + own), caching to MMKV for offline use. Refetches in the background. */
export function useExerciseCatalog(): {
  exercises: Exercise[];
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: catalogQueryKey,
    queryFn: fetchCatalog,
    initialData: readCache,
  });

  const exercises = useMemo(
    () => withPendingExercises(query.data ?? [], userId),
    [query.data, userId],
  );

  return {
    exercises,
    isLoading: query.isLoading,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogQueryKey });
    },
  };
}

export interface CreateCustomExerciseInput {
  name: string;
  category: ExerciseCategory;
  trackingType: TrackingType;
  muscleGroups?: string[];
  equipment?: string | null;
  metValue?: number | null;
}

/** Creates a user-owned exercise. Client-generated UUID -> works offline via the outbox. */
export function createCustomExercise(
  userId: string,
  input: CreateCustomExerciseInput,
): Exercise {
  const id = Crypto.randomUUID();
  const metValue = input.metValue ?? defaultMetForCategory(input.category);
  const payload = {
    id,
    owner_id: userId,
    name_key: null,
    custom_name: input.name,
    category: input.category,
    muscle_groups: input.muscleGroups ?? [],
    equipment: input.equipment ?? null,
    met_value: metValue,
    tracking_type: input.trackingType,
  };
  enqueueUpsert('exercises', id, payload);

  const cache = readCache();
  const exercise = exerciseFromRow({
    ...payload,
    created_at: new Date().toISOString(),
  } as never);
  writeCache([...cache, exercise]);
  return exercise;
}

/**
 * `t`'s key parameter is typed as `any` here on purpose: exercise `name_key`s
 * are dynamic runtime data (from the DB / seed), not statically known i18next
 * key literals, so they can't be checked against the generated key union.
 */
type TranslateFn = (key: any) => string;

export function exerciseDisplayName(
  exercise: Exercise,
  t: TranslateFn,
): string {
  if (exercise.nameKey) return t(exercise.nameKey);
  return exercise.customName ?? '?';
}

export function filterExercises(
  exercises: Exercise[],
  query: string,
  category: ExerciseCategory | 'all',
  muscleGroup: string | null,
  t: TranslateFn,
): Exercise[] {
  const q = query.trim().toLowerCase();
  return exercises.filter((e) => {
    if (category !== 'all' && e.category !== category) return false;
    if (muscleGroup && !e.muscleGroups.includes(muscleGroup)) return false;
    if (!q) return true;
    const name = exerciseDisplayName(e, t).toLowerCase();
    return name.includes(q);
  });
}

export function allMuscleGroups(exercises: Exercise[]): string[] {
  const set = new Set<string>();
  for (const e of exercises) for (const mg of e.muscleGroups) set.add(mg);
  return Array.from(set).sort();
}
