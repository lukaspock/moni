/**
 * Apple Health → møni import (PLAN §6.5, §7.5). Side-effecting wrapper around
 * the pure planning in `mappers.ts`.
 *
 * Strategy
 * - Anchored queries (`HKAnchoredObjectQuery`) per user and type; the anchor
 *   is persisted in MMKV (`health:anchor:<userId>:<kind>`) and only advanced
 *   after every write for that batch was queued/succeeded, so a failed run is
 *   simply retried next time. First sync (no anchor): last 30 days.
 * - Workouts → `workouts` via the offline outbox (upsert on `id`). Imported
 *   rows get a deterministic id (SHA-1 of user + HealthKit uuid) plus
 *   `healthkit_uuid`, so re-imports are idempotent and the unique
 *   `healthkit_uuid` never conflicts. Workouts written by møni itself are
 *   skipped (loop prevention). A Health workout overlapping a møni-recorded
 *   workout is merged into it (Health's energy wins, `kcal_source =
 *   'healthkit'`) instead of creating a second row — no double counting of
 *   the workout bonus.
 * - Body mass → `weight_logs` (source 'healthkit'), upserted directly with
 *   `onConflict: 'healthkit_uuid', ignoreDuplicates` (HealthKit samples are
 *   immutable, so insert-or-skip is enough).
 * - Deletions from the anchor: imported workouts (deterministic id) and
 *   imported weights are deleted. A deleted Health workout that had been
 *   *merged* into a møni workout keeps the møni workout, but the link is
 *   dropped (`healthkit_uuid` null) and the Health-measured kcal is replaced
 *   by a MET estimate (`kcal_source 'met'`).
 */
import * as Crypto from 'expo-crypto';
import { create } from 'zustand';

import {
  calculateKcalBurned,
  metForIntensity,
  STRENGTH_MET_MIN,
} from '@/domain/met';
import { toISODate } from '@/lib/date';
import {
  enqueueDelete,
  enqueueUpsert,
  pendingDeleteIdsForTable,
  pendingUpsertsForTable,
} from '@/lib/outbox';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { getHealthKit, healthKitAvailable, ownBundleId } from './healthkit';
import {
  anchorStorageKey,
  categoryForActivityType,
  importedWorkoutIdName,
  initialImportStart,
  mapBodyMassSamples,
  planWorkoutImport,
  uuidFromSha1Hex,
  type ExistingWorkout,
  type HealthWorkout,
} from './mappers';
import { useHealthSettingsStore } from './settingsStore';

const FALLBACK_WEIGHT_KG = 75;
const IN_CHUNK = 100;

export interface HealthSyncResult {
  importedWorkouts: number;
  mergedWorkouts: number;
  deletedWorkouts: number;
  importedWeights: number;
}

/** In-memory (non-persisted) sync status shared by `useHealthSync` + `useHealthAutoSync`. */
export const useHealthSyncStatusStore = create<{
  isSyncing: boolean;
  lastAttemptMs: number | null;
}>()(() => ({ isSyncing: false, lastAttemptMs: null }));

async function importedWorkoutId(
  userId: string,
  healthkitUuid: string,
): Promise<string> {
  const hex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    importedWorkoutIdName(userId, healthkitUuid),
  );
  return uuidFromSha1Hex(hex);
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function latestWeightKg(userId: string): Promise<number> {
  const { data } = await supabase
    .from('weight_logs')
    .select('weight_kg')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.weight_kg ?? FALLBACK_WEIGHT_KG;
}

type WorkoutRowForMerge = {
  id: string;
  user_id: string;
  routine_id: string | null;
  started_at: string;
  ended_at: string | null;
  category: string;
  kcal_burned: number | null;
  kcal_source: string | null;
  healthkit_uuid: string | null;
  notes: string | null;
};

/** Server rows + not-yet-synced outbox rows of this user overlapping [from, to]. */
async function existingWorkoutsInWindow(
  userId: string,
  from: Date,
  to: Date,
): Promise<WorkoutRowForMerge[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(
      'id, user_id, routine_id, started_at, ended_at, category, kcal_burned, kcal_source, healthkit_uuid, notes',
    )
    .eq('user_id', userId)
    .gte('started_at', from.toISOString())
    .lte('started_at', to.toISOString());
  if (error) throw error;

  const pendingDeletes = pendingDeleteIdsForTable('workouts');
  const byId = new Map<string, WorkoutRowForMerge>();
  for (const row of data ?? [])
    if (!pendingDeletes.has(row.id)) byId.set(row.id, row);
  for (const p of pendingUpsertsForTable('workouts')) {
    const startedAt = p.started_at as string | undefined;
    if (p.user_id !== userId || !startedAt) continue;
    const t = Date.parse(startedAt);
    if (t < from.getTime() || t > to.getTime()) continue;
    const prev = byId.get(p.id as string);
    byId.set(
      p.id as string,
      {
        ...(prev ?? {}),
        ...(p as Partial<WorkoutRowForMerge>),
      } as WorkoutRowForMerge,
    );
  }
  return [...byId.values()];
}

async function syncWorkouts(
  userId: string,
  own: string | null,
): Promise<Omit<HealthSyncResult, 'importedWeights'>> {
  const hk = getHealthKit();
  const result = { importedWorkouts: 0, mergedWorkouts: 0, deletedWorkouts: 0 };
  if (!hk) return result;

  const key = anchorStorageKey(userId, 'workouts');
  const anchor = storage.getString(key);
  const response = await hk.queryWorkoutSamplesWithAnchor({
    limit: 0,
    anchor,
    filter: anchor
      ? undefined
      : { date: { startDate: initialImportStart(new Date()) } },
  });

  // Flatten the native proxies. Energy: per-workout statistics (the iOS 18+
  // way) with the deprecated `totalEnergyBurned` (always kcal) as fallback.
  const healthWorkouts: HealthWorkout[] = [];
  for (const w of response.workouts) {
    const metadata = (w.metadata ?? {}) as Record<string, unknown>;
    const sourceBundleId = w.sourceRevision?.source?.bundleIdentifier ?? null;
    let kcal: number | null = null;
    if (sourceBundleId !== own) {
      try {
        const stat = await w.getStatistic(
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'kcal',
        );
        kcal = stat?.sumQuantity?.quantity ?? null;
      } catch {
        kcal = null;
      }
      if (kcal === null || kcal <= 0)
        kcal = w.totalEnergyBurned?.quantity ?? null;
    }
    healthWorkouts.push({
      uuid: w.uuid,
      activityType: w.workoutActivityType,
      startedAt: w.startDate.toISOString(),
      endedAt: w.endDate.toISOString(),
      kcal: kcal !== null && kcal > 0 ? Math.round(kcal) : null,
      sourceBundleId,
      metadata,
    });
  }

  if (healthWorkouts.length > 0) {
    const starts = healthWorkouts.map((w) => Date.parse(w.startedAt));
    const ends = healthWorkouts.map((w) => Date.parse(w.endedAt));
    const from = new Date(Math.min(...starts) - 12 * 60 * 60 * 1000);
    const to = new Date(Math.max(...ends));
    const existingRows = await existingWorkoutsInWindow(userId, from, to);
    const existing: ExistingWorkout[] = existingRows.map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      healthkitUuid: r.healthkit_uuid,
    }));
    const actions = planWorkoutImport(healthWorkouts, existing, own);

    let weightKg: number | null = null;
    for (const action of actions) {
      const w = action.workout;
      if (action.kind === 'insert') {
        let kcal = w.kcal;
        let kcalSource: 'healthkit' | 'met' = 'healthkit';
        if (kcal === null) {
          // No energy in Health (e.g. manually entered workout): MET estimate via src/domain.
          weightKg ??= await latestWeightKg(userId);
          const category = categoryForActivityType(w.activityType);
          const met =
            category === 'strength'
              ? STRENGTH_MET_MIN
              : metForIntensity('moderate');
          const hours =
            (Date.parse(w.endedAt) - Date.parse(w.startedAt)) / 3_600_000;
          kcal = Math.round(
            calculateKcalBurned(met, weightKg, Math.max(0, hours)),
          );
          kcalSource = 'met';
        }
        enqueueUpsert('workouts', await importedWorkoutId(userId, w.uuid), {
          user_id: userId,
          routine_id: null,
          started_at: w.startedAt,
          ended_at: w.endedAt,
          category: categoryForActivityType(w.activityType),
          kcal_burned: kcal,
          kcal_source: kcalSource,
          healthkit_uuid: w.uuid,
          notes: null,
        });
        result.importedWorkouts += 1;
      } else if (action.kind === 'merge') {
        const target = existingRows.find((r) => r.id === action.targetId);
        if (!target) continue;
        // Full row (not a partial patch): the outbox upserts on `id`, and the
        // INSERT half of an upsert needs every NOT NULL column.
        enqueueUpsert('workouts', target.id, {
          user_id: target.user_id,
          routine_id: target.routine_id,
          started_at: target.started_at,
          ended_at: target.ended_at,
          category: target.category,
          notes: target.notes,
          kcal_burned: w.kcal ?? target.kcal_burned,
          kcal_source: w.kcal !== null ? 'healthkit' : target.kcal_source,
          healthkit_uuid: w.uuid,
        });
        result.mergedWorkouts += 1;
      }
    }
  }

  // Deletions: only rows we imported (deterministic id) are removed; a merged
  // møni workout keeps its own id and is therefore never matched here.
  const deletedUuids = response.deletedSamples.map((d) => d.uuid);
  if (deletedUuids.length > 0) {
    const candidateIds = await Promise.all(
      deletedUuids.map((uuid) => importedWorkoutId(userId, uuid)),
    );
    for (const id of await knownWorkoutIds(userId, candidateIds)) {
      enqueueDelete('workouts', id);
      result.deletedWorkouts += 1;
    }
    await unmergeDeletedWorkouts(userId, deletedUuids, new Set(candidateIds));
  }

  storage.set(key, response.newAnchor);
  return result;
}

/**
 * A Health workout that was merged into a møni workout was deleted in Health:
 * the row stays (the session was recorded in møni) but loses the Health link
 * and its Health kcal → MET estimate again.
 */
async function unmergeDeletedWorkouts(
  userId: string,
  uuids: string[],
  importedIds: Set<string>,
): Promise<void> {
  const rows: WorkoutRowForMerge[] = [];
  for (const chunk of chunks(uuids, IN_CHUNK)) {
    const { data, error } = await supabase
      .from('workouts')
      .select(
        'id, user_id, routine_id, started_at, ended_at, category, kcal_burned, kcal_source, healthkit_uuid, notes',
      )
      .eq('user_id', userId)
      .in('healthkit_uuid', chunk);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  let weightKg: number | null = null;
  for (const row of rows) {
    if (importedIds.has(row.id)) continue; // plain imports are deleted above
    weightKg ??= await latestWeightKg(userId);
    const met =
      row.category === 'strength'
        ? STRENGTH_MET_MIN
        : metForIntensity('moderate');
    const end = row.ended_at
      ? Date.parse(row.ended_at)
      : Date.parse(row.started_at);
    const hours = Math.max(0, (end - Date.parse(row.started_at)) / 3_600_000);
    enqueueUpsert('workouts', row.id, {
      user_id: row.user_id,
      routine_id: row.routine_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      category: row.category,
      notes: row.notes,
      kcal_burned: Math.round(calculateKcalBurned(met, weightKg, hours)),
      kcal_source: 'met',
      healthkit_uuid: null,
    });
  }
}

/** Of the given candidate ids, those that exist on the server or in the outbox. */
async function knownWorkoutIds(
  userId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const found = new Set<string>();
  for (const chunk of chunks(ids, IN_CHUNK)) {
    const { data, error } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', userId)
      .in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) found.add(row.id);
  }
  const wanted = new Set(ids);
  for (const p of pendingUpsertsForTable('workouts')) {
    if (wanted.has(p.id as string)) found.add(p.id as string);
  }
  return [...found];
}

async function syncBodyMass(
  userId: string,
  own: string | null,
): Promise<number> {
  const hk = getHealthKit();
  if (!hk) return 0;

  const key = anchorStorageKey(userId, 'bodyMass');
  const anchor = storage.getString(key);
  const response = await hk.queryQuantitySamplesWithAnchor(
    'HKQuantityTypeIdentifierBodyMass',
    {
      limit: 0,
      anchor,
      unit: 'kg',
      filter: anchor
        ? undefined
        : { date: { startDate: initialImportStart(new Date()) } },
    },
  );

  const rows = mapBodyMassSamples(
    response.samples.map((s) => ({
      uuid: s.uuid,
      startDate: s.startDate,
      kg: s.quantity,
      sourceBundleId: s.sourceRevision?.source?.bundleIdentifier ?? null,
      metadata: (s.metadata ?? {}) as Record<string, unknown>,
    })),
    own,
    toISODate,
  );

  for (const chunk of chunks(rows, IN_CHUNK)) {
    const { error } = await supabase.from('weight_logs').upsert(
      chunk.map((r) => ({ ...r, id: Crypto.randomUUID(), user_id: userId })),
      { onConflict: 'healthkit_uuid', ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  const deletedUuids = response.deletedSamples.map((d) => d.uuid);
  for (const chunk of chunks(deletedUuids, IN_CHUNK)) {
    const { error } = await supabase
      .from('weight_logs')
      .delete()
      .eq('user_id', userId)
      .in('healthkit_uuid', chunk);
    if (error) throw error;
  }

  storage.set(key, response.newAnchor);
  return rows.length;
}

let inFlight: Promise<HealthSyncResult | null> | null = null;

/**
 * One import run for `userId`. No-op (resolves null) when Apple Health is
 * disabled in settings or unavailable. Concurrent calls share one run.
 * Workouts and weights are independent: one failing doesn't block the other,
 * and only a fully successful run updates `lastSyncedAt`.
 */
export function runHealthSync(
  userId: string,
): Promise<HealthSyncResult | null> {
  if (inFlight) return inFlight;
  if (!useHealthSettingsStore.getState().enabled || !healthKitAvailable())
    return Promise.resolve(null);

  inFlight = (async () => {
    useHealthSyncStatusStore.setState({
      isSyncing: true,
      lastAttemptMs: Date.now(),
    });
    const own = ownBundleId();
    const result: HealthSyncResult = {
      importedWorkouts: 0,
      mergedWorkouts: 0,
      deletedWorkouts: 0,
      importedWeights: 0,
    };
    let ok = true;
    try {
      Object.assign(result, await syncWorkouts(userId, own));
    } catch (err) {
      ok = false;
      console.warn('[health] workout import failed', err);
    }
    try {
      result.importedWeights = await syncBodyMass(userId, own);
    } catch (err) {
      ok = false;
      console.warn('[health] body mass import failed', err);
    }
    if (ok)
      useHealthSettingsStore
        .getState()
        .setLastSyncedAt(new Date().toISOString());
    return result;
  })().finally(() => {
    useHealthSyncStatusStore.setState({ isSyncing: false });
    inFlight = null;
  });
  return inFlight;
}
