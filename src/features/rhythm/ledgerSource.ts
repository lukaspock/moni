/**
 * Supabase reads for the ledger: paginated + incremental food/workout/weight/target rows,
 * lifetime counters (head counts), weekly exercise progress and the weight history.
 * All reads are RLS-scoped to the signed-in user; errors throw (callers keep the cache).
 */
import {
  buildLedgerDays,
  ledgerFetchFrom,
  mergeLedger,
  type ExerciseProgressRow,
  type LedgerCache,
  type LedgerFoodRow,
  type LedgerTargetRow,
  type LedgerWeightRow,
  type AchievementCounts,
  type WeightPoint,
} from '@/domain';
import { localDayBoundsUtc } from '@/lib/date';
import { pendingDeleteIdsForTable, pendingUpsertsForTable } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';

import {
  fetchAllPages,
  overlayWorkoutRows,
  type WorkoutLedgerRow,
} from './overlay';

const FOOD_COLUMNS = 'id,date,logged_at,meal_type,source,kcal,protein_g';
const WORKOUT_COLUMNS = 'id,started_at,ended_at,category,kcal_burned';

async function fetchFood(
  userId: string,
  from: string | null,
): Promise<LedgerFoodRow[]> {
  return fetchAllPages<LedgerFoodRow>(async (a, b) => {
    let q = supabase
      .from('food_logs')
      .select(FOOD_COLUMNS)
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(a, b);
    if (from) q = q.gte('date', from);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

async function fetchWorkouts(
  userId: string,
  from: string | null,
): Promise<WorkoutLedgerRow[]> {
  const server = await fetchAllPages<WorkoutLedgerRow>(async (a, b) => {
    let q = supabase
      .from('workouts')
      .select(WORKOUT_COLUMNS)
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: true })
      .order('id', { ascending: true })
      .range(a, b);
    if (from) q = q.gte('started_at', localDayBoundsUtc(from).start);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
  return overlayWorkoutRows(
    server,
    pendingUpsertsForTable('workouts'),
    pendingDeleteIdsForTable('workouts'),
    userId,
  );
}

async function fetchWeights(
  userId: string,
  from: string | null,
): Promise<LedgerWeightRow[]> {
  return fetchAllPages<LedgerWeightRow>(async (a, b) => {
    let q = supabase
      .from('weight_logs')
      .select('date,id')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(a, b);
    if (from) q = q.gte('date', from);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

async function fetchTargets(
  userId: string,
  from: string | null,
): Promise<LedgerTargetRow[]> {
  return fetchAllPages<LedgerTargetRow>(async (a, b) => {
    let q = supabase
      .from('daily_targets')
      .select('date,base_kcal,workout_bonus_kcal,protein_g')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .range(a, b);
    if (from) q = q.gte('date', from);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

/**
 * One incremental sync: fetches everything from `lastSyncedDate - 7 days` (or all history the
 * first time), rebuilds those ledger days and merges them into `cache`. Returns the new cache;
 * throws on any read error so the previous cache stays untouched.
 */
export async function syncLedgerCache(
  userId: string,
  cache: LedgerCache,
  today: string,
): Promise<LedgerCache> {
  const from = ledgerFetchFrom(cache);
  const [food, workouts, weights, targets] = await Promise.all([
    fetchFood(userId, from),
    fetchWorkouts(userId, from),
    fetchWeights(userId, from),
    fetchTargets(userId, from),
  ]);
  const days = buildLedgerDays({ food, workouts, weights, targets });
  return mergeLedger(cache, days, { from, to: today });
}

async function countOf(
  query: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<number> {
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const HEAD = { count: 'exact', head: true } as const;

/** Lifetime counters for the stamps (head requests, no data volume). */
export async function fetchLifetimeCounts(userId: string): Promise<{
  counts: AchievementCounts;
  healthWorkoutImported: boolean;
}> {
  const food = () =>
    supabase.from('food_logs').select('id', HEAD).eq('user_id', userId);
  const workouts = () =>
    supabase.from('workouts').select('id', HEAD).eq('user_id', userId);
  const [
    workoutCount,
    foodLogs,
    photoLogs,
    barcodeLogs,
    voiceLogs,
    labelLogs,
    favorites,
    customExercises,
    routines,
    weightLogs,
    healthWorkouts,
  ] = await Promise.all([
    countOf(workouts().not('ended_at', 'is', null)),
    countOf(food()),
    countOf(food().eq('source', 'photo')),
    countOf(food().eq('source', 'barcode')),
    countOf(food().eq('source', 'voice')),
    countOf(food().eq('source', 'label')),
    countOf(
      supabase.from('favorite_meals').select('id', HEAD).eq('user_id', userId),
    ),
    countOf(
      supabase.from('exercises').select('id', HEAD).eq('owner_id', userId),
    ),
    countOf(supabase.from('routines').select('id', HEAD).eq('user_id', userId)),
    countOf(
      supabase.from('weight_logs').select('id', HEAD).eq('user_id', userId),
    ),
    countOf(workouts().eq('kcal_source', 'healthkit')),
  ]);
  return {
    counts: {
      workouts: workoutCount,
      foodLogs,
      photoLogs,
      barcodeLogs,
      voiceLogs,
      labelLogs,
      favorites,
      customExercises,
      routines,
      weightLogs,
    },
    healthWorkoutImported: healthWorkouts > 0,
  };
}

/** Weekly exercise progress rows (`v_exercise_progress`), all history. */
export async function fetchExerciseProgress(
  userId: string,
): Promise<ExerciseProgressRow[]> {
  return fetchAllPages<ExerciseProgressRow>(async (a, b) => {
    const { data, error } = await supabase
      .from('v_exercise_progress')
      .select('exercise_id,week_start,estimated_1rm_kg,volume_kg')
      .eq('user_id', userId)
      .order('week_start', { ascending: true })
      .range(a, b);
    if (error) throw error;
    return data ?? [];
  });
}

/** All weigh-ins (date + kg), oldest first. */
export async function fetchWeightPoints(
  userId: string,
): Promise<WeightPoint[]> {
  const rows = await fetchAllPages<{ date: string; weight_kg: number }>(
    async (a, b) => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('date,weight_kg,id')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .order('id', { ascending: true })
        .range(a, b);
      if (error) throw error;
      return data ?? [];
    },
  );
  return rows.map((r) => ({ date: r.date, weightKg: r.weight_kg }));
}
