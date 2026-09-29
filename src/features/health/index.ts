// CONTRACT (owner: `health` agent; called by `onboarding`). Signatures are fixed,
// implementation is replaced. Scope: PLAN §7.5 Apple Health.
import { useShallow } from 'zustand/react/shallow';

import { useHealthSettingsStore } from './settingsStore';

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
 * iPad-without-Health, simulators without Health data support, etc.).
 * Intended: `isHealthDataAvailable()` from `@kingstinct/react-native-healthkit`.
 */
export function isHealthAvailable(): boolean {
  // TODO(health): return isHealthDataAvailable();
  return false;
}

/**
 * Shows the system HealthKit permission sheet.
 * Read: workouts, activeEnergyBurned, bodyMass.
 * Write: workouts, dietaryEnergyConsumed + protein/carbs/fat (the nutrition
 * types are always requested so the optional `writeNutrition` toggle can be
 * flipped later without a second sheet).
 * Resolves 'unavailable' when `isHealthAvailable()` is false. Note HealthKit
 * never reveals whether *read* access was denied — 'denied' only means the
 * request itself failed / the user dismissed the sheet; 'granted' means it
 * was shown and completed. On 'granted', callers typically `setEnabled(true)`.
 */
export async function requestHealthAuthorization(): Promise<HealthAuthorizationResult> {
  // TODO(health): implement with requestAuthorization({ toRead, toShare }).
  return 'unavailable';
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

/**
 * Import from Apple Health. Intended behaviour: runs on app start and on
 * foreground (AppState) when `enabled`; `syncNow()` triggers it manually.
 * Imports workouts → `workouts` (kcal_source 'healthkit') and bodyMass samples
 * → `weight_logs` (source 'healthkit'), both deduped via their unique
 * `healthkit_uuid` column (upsert on conflict); activeEnergyBurned feeds the
 * workout kcal. Workouts logged in møni are exported back to Health (and food,
 * if `writeNutrition`). No-op when disabled or unavailable.
 * `lastSyncedAt` is an ISO timestamp of the last successful sync (device-local).
 */
export function useHealthSync(): HealthSyncState {
  const lastSyncedAt = useHealthSettingsStore((s) => s.lastSyncedAt);
  // TODO(health): implement import/export + app-start/foreground triggers.
  return { syncNow: noopSync, isSyncing: false, lastSyncedAt };
}

const noopSync = async (): Promise<void> => {};
