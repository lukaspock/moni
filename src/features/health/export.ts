/**
 * Write-back to Apple Health (PLAN §7.5): finished møni workouts, and —
 * behind the `writeNutrition` toggle — food logs as dietary samples.
 *
 * Every function here is fire-and-forget: guarded by the device-local health
 * settings, never throws (errors are logged), and never touches Supabase, so
 * calling it from the offline workout flow or a food mutation can't block or
 * fail those flows.
 */
import { ComparisonPredicateOperator } from '@kingstinct/react-native-healthkit/types';

import { getHealthKit, healthKitAvailable } from './healthkit';
import {
  activityTypeForCategory,
  foodSyncIdentifier,
  MOENI_FOOD_LOG_ID_METADATA_KEY,
  MOENI_WORKOUT_ID_METADATA_KEY,
  type WorkoutCategory,
} from './mappers';
import { useHealthSettingsStore } from './settingsStore';

export interface ExportWorkoutInput {
  workoutId: string;
  category: WorkoutCategory;
  startedAt: string; // ISO
  endedAt: string; // ISO
  kcalBurned: number;
}

/**
 * Saves a finished møni workout to Health (activity type from its category,
 * active energy sample + total energy). Tagged with `moeni_workout_id`
 * metadata, and attributed to møni's bundle id by HealthKit — both make the
 * importer skip it, so it never comes back as a second workout.
 */
export async function exportWorkoutToHealth(
  input: ExportWorkoutInput,
): Promise<void> {
  if (!useHealthSettingsStore.getState().enabled || !healthKitAvailable())
    return;
  const hk = getHealthKit();
  if (!hk) return;
  try {
    const start = new Date(input.startedAt);
    const end = new Date(input.endedAt);
    if (!(end.getTime() > start.getTime())) return;
    const kcal = Math.max(0, input.kcalBurned);
    await hk.saveWorkoutSample(
      activityTypeForCategory(input.category),
      kcal > 0
        ? [
            {
              quantityType: 'HKQuantityTypeIdentifierActiveEnergyBurned',
              quantity: kcal,
              unit: 'kcal',
              startDate: start,
              endDate: end,
            },
          ]
        : [],
      start,
      end,
      kcal > 0 ? { energyBurned: kcal } : undefined,
      { [MOENI_WORKOUT_ID_METADATA_KEY]: input.workoutId },
    );
  } catch (err) {
    console.warn('[health] exporting workout failed', err);
  }
}

export interface ExportFoodLogInput {
  id: string;
  loggedAt: string; // ISO
  title: string | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const NUTRIENTS = [
  {
    key: 'kcal',
    type: 'HKQuantityTypeIdentifierDietaryEnergyConsumed',
    unit: 'kcal',
  },
  { key: 'protein', type: 'HKQuantityTypeIdentifierDietaryProtein', unit: 'g' },
  {
    key: 'carbs',
    type: 'HKQuantityTypeIdentifierDietaryCarbohydrates',
    unit: 'g',
  },
  { key: 'fat', type: 'HKQuantityTypeIdentifierDietaryFatTotal', unit: 'g' },
] as const;

function nutritionEnabled(): boolean {
  const { enabled, writeNutrition } = useHealthSettingsStore.getState();
  return enabled && writeNutrition && healthKitAvailable();
}

async function deleteNutrientSample(
  foodLogId: string,
  nutrient: (typeof NUTRIENTS)[number],
): Promise<void> {
  const hk = getHealthKit();
  if (!hk) return;
  await hk.deleteObjects(nutrient.type, {
    metadata: {
      withMetadataKey: 'HKMetadataKeySyncIdentifier',
      operatorType: ComparisonPredicateOperator.equalTo,
      value: foodSyncIdentifier(foodLogId, nutrient.key),
    },
  });
}

/**
 * Writes (or, for an edited log, replaces) a food log's kcal + macros as four
 * dietary quantity samples. Each carries `HKMetadataKeySyncIdentifier` =
 * `moeni:food:<food_log id>:<nutrient>` with a time-based
 * `HKMetadataKeySyncVersion`, so saving again after an edit makes HealthKit
 * replace the old sample instead of adding a second one. A nutrient that
 * drops to 0 in an edit is deleted. Individual samples (not an
 * `HKCorrelationTypeIdentifierFood`) because sync-identifier replacement and
 * deletion by predicate are well-defined per quantity type.
 */
export async function exportFoodLogToHealth(
  input: ExportFoodLogInput,
): Promise<void> {
  if (!nutritionEnabled()) return;
  const hk = getHealthKit();
  if (!hk) return;
  const at = new Date(input.loggedAt);
  const version = Date.now();
  const values: Record<(typeof NUTRIENTS)[number]['key'], number> = {
    kcal: input.kcal,
    protein: input.proteinG,
    carbs: input.carbsG,
    fat: input.fatG,
  };
  for (const nutrient of NUTRIENTS) {
    try {
      const value = values[nutrient.key];
      if (!(value > 0)) {
        await deleteNutrientSample(input.id, nutrient);
        continue;
      }
      await hk.saveQuantitySample(nutrient.type, nutrient.unit, value, at, at, {
        HKMetadataKeySyncIdentifier: foodSyncIdentifier(input.id, nutrient.key),
        HKMetadataKeySyncVersion: version,
        ...(input.title ? { HKMetadataKeyFoodType: input.title } : {}),
        [MOENI_FOOD_LOG_ID_METADATA_KEY]: input.id,
      });
    } catch (err) {
      console.warn(
        `[health] exporting ${nutrient.key} of food log failed`,
        err,
      );
    }
  }
}

/** Removes a deleted food log's dietary samples from Health (by sync identifier). */
export async function deleteFoodLogFromHealth(
  foodLogId: string,
): Promise<void> {
  if (!nutritionEnabled()) return;
  for (const nutrient of NUTRIENTS) {
    try {
      await deleteNutrientSample(foodLogId, nutrient);
    } catch (err) {
      console.warn(`[health] deleting ${nutrient.key} of food log failed`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Water (identity N1): same guard as nutrition (`enabled && writeNutrition`).

/** Custom metadata key on møni's water samples (loop prevention if water is ever imported). */
export const MOENI_WATER_LOG_ID_METADATA_KEY = 'moeni_water_log_id';
const WATER_TYPE = 'HKQuantityTypeIdentifierDietaryWater' as const;

/** HealthKit sync identifier of a water log's sample (`moeni:water:<id>`). */
export function waterSyncIdentifier(waterLogId: string): string {
  return `moeni:water:${waterLogId}`;
}

export interface ExportWaterLogInput {
  id: string;
  loggedAt: string; // ISO
  ml: number;
}

/**
 * Writes one water log as a `dietaryWater` sample (mL), tagged with
 * `HKMetadataKeySyncIdentifier` = `moeni:water:<id>` + a time-based sync
 * version and `moeni_water_log_id`. Fire-and-forget: never throws.
 */
export async function exportWaterLogToHealth(
  input: ExportWaterLogInput,
): Promise<void> {
  if (!nutritionEnabled() || !(input.ml > 0)) return;
  const hk = getHealthKit();
  if (!hk) return;
  try {
    const at = new Date(input.loggedAt);
    await hk.saveQuantitySample(WATER_TYPE, 'mL', input.ml, at, at, {
      HKMetadataKeySyncIdentifier: waterSyncIdentifier(input.id),
      HKMetadataKeySyncVersion: Date.now(),
      [MOENI_WATER_LOG_ID_METADATA_KEY]: input.id,
    });
  } catch (err) {
    console.warn('[health] exporting water log failed', err);
  }
}

/** Removes an undone water log's sample from Health (by sync identifier). Never throws. */
export async function deleteWaterLogFromHealth(
  waterLogId: string,
): Promise<void> {
  if (!nutritionEnabled()) return;
  const hk = getHealthKit();
  if (!hk) return;
  try {
    await hk.deleteObjects(WATER_TYPE, {
      metadata: {
        withMetadataKey: 'HKMetadataKeySyncIdentifier',
        operatorType: ComparisonPredicateOperator.equalTo,
        value: waterSyncIdentifier(waterLogId),
      },
    });
  } catch (err) {
    console.warn('[health] deleting water log failed', err);
  }
}
