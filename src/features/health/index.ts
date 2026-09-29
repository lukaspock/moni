// CONTRACT (owner: `health` agent; called by `onboarding`). Signatures of
// `isHealthAvailable`, `requestHealthAuthorization`, `useHealthSettings` and
// `useHealthSync` are fixed. Scope: PLAN §7.5 Apple Health.
// Sync/dedupe design: see the header of `./sync.ts` and CLAUDE.md "Apple Health".
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { useSession } from '@/features/auth';

import { getHealthKit, healthKitAvailable } from './healthkit';
import { shouldAutoSync } from './mappers';
import { useHealthSettingsStore } from './settingsStore';
import { runHealthSync, useHealthSyncStatusStore } from './sync';

export type HealthAuthorizationResult = 'granted' | 'denied' | 'unavailable';

export type HealthSettings = {
  enabled: boolean;
  writeNutrition: boolean;
  setEnabled(v: boolean): void;
  setWriteNutrition(v: boolean): void;
};

export type HealthSyncState = {
  syncNow(): Promise<void>;
  isSyncing: boolean;
  lastSyncedAt: string | null;
};

/**
 * Whether HealthKit can be used on this device at all (synchronous; false on
 * iPad-without-Health, or when the native module isn't in the binary).
 */
export function isHealthAvailable(): boolean {
  return healthKitAvailable();
}

/**
 * Shows the system HealthKit permission sheet.
 * Read: workouts, activeEnergyBurned, bodyMass.
 * Write: workouts + activeEnergyBurned (the workout's energy sample),
 * dietaryEnergyConsumed + protein/carbs/fat (the nutrition types are always
 * requested so the optional `writeNutrition` toggle can be flipped later
 * without a second sheet).
 *
 * Resolves 'unavailable' when `isHealthAvailable()` is false. HealthKit never
 * reveals whether *read* access was denied (privacy: a denied read just looks
 * like "no data"), so 'granted' only means the sheet was shown and completed
 * — not that the user ticked every box. 'denied' means the request itself
 * failed (e.g. missing entitlement) or resolved false. On 'granted', callers
 * typically `setEnabled(true)`.
 */
export async function requestHealthAuthorization(): Promise<HealthAuthorizationResult> {
  if (!healthKitAvailable()) return 'unavailable';
  const hk = getHealthKit();
  if (!hk) return 'unavailable';
  try {
    const ok = await hk.requestAuthorization({
      toRead: [
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBodyMass',
      ],
      toShare: [
        'HKWorkoutTypeIdentifier',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierDietaryEnergyConsumed',
        'HKQuantityTypeIdentifierDietaryProtein',
        'HKQuantityTypeIdentifierDietaryCarbohydrates',
        'HKQuantityTypeIdentifierDietaryFatTotal',
      ],
    });
    return ok ? 'granted' : 'denied';
  } catch (err) {
    console.warn('[health] requestAuthorization failed', err);
    return 'denied';
  }
}

/**
 * Device-local Apple Health preferences, persisted in MMKV (Zustand persist).
 * `enabled`: master switch for import/export. `writeNutrition`: also export
 * logged food as dietaryEnergyConsumed + macros (default off).
 */
export function useHealthSettings(): HealthSettings {
  return useHealthSettingsStore(
    useShallow((s) => ({
      enabled: s.enabled,
      writeNutrition: s.writeNutrition,
      setEnabled: s.setEnabled,
      setWriteNutrition: s.setWriteNutrition,
    })),
  );
}

/** Refreshes everything an import can change (Today dashboard's dynamic limit, weights, history). */
function invalidateAfterSync(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['latestWeight'] });
  void queryClient.invalidateQueries({ queryKey: ['workout'] });
  void queryClient.invalidateQueries({ queryKey: ['targets'] });
  void queryClient.invalidateQueries({ queryKey: ['health'] });
  // `useWorkoutsForDate` / history aren't TanStack queries: they refresh on
  // outbox changes, which the import's `enqueueUpsert` calls trigger.
}

async function syncAndInvalidate(userId: string, queryClient: QueryClient): Promise<void> {
  const result = await runHealthSync(userId);
  if (result) invalidateAfterSync(queryClient);
}

/**
 * Import from Apple Health: workouts → `workouts` (kcal_source 'healthkit',
 * merged into an overlapping møni workout instead of duplicating it) and
 * bodyMass → `weight_logs` (source 'healthkit'), deduped via `healthkit_uuid`.
 * `syncNow()` runs it immediately (no throttle); automatic runs come from
 * `useHealthAutoSync()`. No-op when disabled, unavailable or signed out.
 * `lastSyncedAt` is an ISO timestamp of the last successful sync (device-local).
 */
export function useHealthSync(): HealthSyncState {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const lastSyncedAt = useHealthSettingsStore((s) => s.lastSyncedAt);
  const isSyncing = useHealthSyncStatusStore((s) => s.isSyncing);

  const syncNow = useCallback(async () => {
    if (!userId) return;
    await syncAndInvalidate(userId, queryClient);
  }, [userId, queryClient]);

  return { syncNow, isSyncing, lastSyncedAt };
}

/**
 * Mount once (in `app/(tabs)/_layout.tsx`): syncs on mount and whenever the
 * app returns to the foreground, if Apple Health is enabled and a user is
 * signed in — at most every 5 minutes (`AUTO_SYNC_MIN_INTERVAL_MS`).
 */
export function useHealthAutoSync(): void {
  const { userId } = useSession();
  const enabled = useHealthSettingsStore((s) => s.enabled);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !enabled) return;
    const uid = userId;

    function maybeSync() {
      const { lastAttemptMs } = useHealthSyncStatusStore.getState();
      if (!shouldAutoSync(lastAttemptMs, Date.now())) return;
      void syncAndInvalidate(uid, queryClient);
    }

    maybeSync();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') maybeSync();
    });
    return () => sub.remove();
  }, [userId, enabled, queryClient]);
}

/**
 * Total active energy (kcal) Apple Health recorded on a local date — all
 * activity incl. NEAT, so it's informational only and deliberately NOT fed
 * into the workout bonus (PLAN §6.5: only workouts count). null when Health
 * is off/unavailable or has no data.
 */
export function useActiveEnergyForDate(date: string): { kcal: number | null; isLoading: boolean } {
  const enabled = useHealthSettingsStore((s) => s.enabled);
  const available = enabled && healthKitAvailable();
  const query = useQuery({
    queryKey: ['health', 'activeEnergy', date],
    enabled: available,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number | null> => {
      const hk = getHealthKit();
      if (!hk) return null;
      const [y, m, d] = date.split('-').map(Number);
      const startDate = new Date(y, m - 1, d);
      const endDate = new Date(y, m - 1, d + 1);
      const stats = await hk.queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], {
        unit: 'kcal',
        filter: { date: { startDate, endDate } },
      });
      const kcal = stats.sumQuantity?.quantity;
      return kcal !== undefined ? Math.round(kcal) : null;
    },
  });
  return { kcal: query.data ?? null, isLoading: available && query.isLoading };
}

// Write-back (fire-and-forget; guarded by the settings above). Called from
// `src/features/workout` (finished workouts) and `src/features/food`
// (food log save/delete, only when `writeNutrition` is on).
export { exportWorkoutToHealth, exportFoodLogToHealth, deleteFoodLogFromHealth } from './export';
export type { ExportWorkoutInput, ExportFoodLogInput } from './export';
export type { HealthSyncResult } from './sync';
