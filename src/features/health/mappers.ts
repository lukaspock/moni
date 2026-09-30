/**
 * Pure Apple Health mapping / dedupe / planning logic (PLAN §6.5, §7.5).
 * No React Native / native-module imports here (only the enum values from the
 * library's side-effect-free `/types` entry), so everything is unit-tested in
 * `mappers.test.ts`. The side-effecting HealthKit + Supabase code lives in
 * `sync.ts` / `export.ts`.
 */
import { WorkoutActivityType } from '@kingstinct/react-native-healthkit/types';

import { roundTo } from '@/domain/units';

export type WorkoutCategory = 'strength' | 'cardio' | 'sport' | 'other';

/** Custom HealthKit metadata key møni stamps on every workout it writes (loop prevention). */
export const MOENI_WORKOUT_ID_METADATA_KEY = 'moeni_workout_id';
/** Custom HealthKit metadata key møni stamps on every nutrition sample it writes. */
export const MOENI_FOOD_LOG_ID_METADATA_KEY = 'moeni_food_log_id';

/** First sync (no anchor yet) only looks this far back. */
export const INITIAL_IMPORT_DAYS = 30;
/** Minimum gap between two automatic (mount/foreground) syncs. */
export const AUTO_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
/**
 * Two workouts are "the same session" when their overlap covers at least this
 * share of the shorter one (PLAN §6.5 "zeitlich überlappt").
 */
export const OVERLAP_MIN_SHARE = 0.5;

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

const STRENGTH_TYPES = new Set<number>([
  WorkoutActivityType.traditionalStrengthTraining,
  WorkoutActivityType.functionalStrengthTraining,
  WorkoutActivityType.coreTraining,
  WorkoutActivityType.crossTraining,
]);

const CARDIO_TYPES = new Set<number>([
  WorkoutActivityType.running,
  WorkoutActivityType.cycling,
  WorkoutActivityType.walking,
  WorkoutActivityType.hiking,
  WorkoutActivityType.elliptical,
  WorkoutActivityType.rowing,
  WorkoutActivityType.swimming,
  WorkoutActivityType.stairClimbing,
  WorkoutActivityType.stairs,
  WorkoutActivityType.stepTraining,
  WorkoutActivityType.mixedCardio,
  WorkoutActivityType.mixedMetabolicCardioTraining,
  WorkoutActivityType.highIntensityIntervalTraining,
  WorkoutActivityType.jumpRope,
  WorkoutActivityType.crossCountrySkiing,
  WorkoutActivityType.handCycling,
  WorkoutActivityType.wheelchairWalkPace,
  WorkoutActivityType.wheelchairRunPace,
  WorkoutActivityType.cardioDance,
  WorkoutActivityType.swimBikeRun,
  WorkoutActivityType.waterFitness,
  WorkoutActivityType.paddleSports,
  WorkoutActivityType.skatingSports,
]);

const OTHER_TYPES = new Set<number>([
  WorkoutActivityType.yoga,
  WorkoutActivityType.pilates,
  WorkoutActivityType.flexibility,
  WorkoutActivityType.mindAndBody,
  WorkoutActivityType.cooldown,
  WorkoutActivityType.preparationAndRecovery,
  WorkoutActivityType.taiChi,
  WorkoutActivityType.barre,
  WorkoutActivityType.fishing,
  WorkoutActivityType.hunting,
  WorkoutActivityType.play,
  WorkoutActivityType.transition,
  WorkoutActivityType.rest,
  WorkoutActivityType.other,
]);

/**
 * HKWorkoutActivityType → møni `workouts.category`. Everything that isn't
 * clearly strength, cardio or a low-intensity "other" activity is a sport
 * (team, racquet, combat, climbing, winter sports …).
 */
export function categoryForActivityType(activityType: number): WorkoutCategory {
  if (STRENGTH_TYPES.has(activityType)) return 'strength';
  if (CARDIO_TYPES.has(activityType)) return 'cardio';
  if (OTHER_TYPES.has(activityType)) return 'other';
  return 'sport';
}

/** møni category → HKWorkoutActivityType used when writing a møni workout to Health. */
export function activityTypeForCategory(
  category: WorkoutCategory,
): WorkoutActivityType {
  switch (category) {
    case 'strength':
      return WorkoutActivityType.traditionalStrengthTraining;
    case 'cardio':
      return WorkoutActivityType.mixedCardio;
    case 'sport':
      return WorkoutActivityType.other;
    case 'other':
      return WorkoutActivityType.other;
  }
}

// ---------------------------------------------------------------------------
// Loop prevention
// ---------------------------------------------------------------------------

/**
 * True when a HealthKit sample was written by møni itself — either its source
 * is this app's bundle id, or it carries møni's metadata key (covers e.g. a
 * reinstall under a different bundle id in dev builds). Such samples are never
 * imported, so a møni workout exported to Health doesn't come back as a
 * duplicate.
 */
export function isOwnSample(
  sourceBundleId: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
  ownBundleId: string | null | undefined,
): boolean {
  if (ownBundleId && sourceBundleId && sourceBundleId === ownBundleId)
    return true;
  if (
    metadata &&
    (MOENI_WORKOUT_ID_METADATA_KEY in metadata ||
      MOENI_FOOD_LOG_ID_METADATA_KEY in metadata)
  ) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Overlap + import planning
// ---------------------------------------------------------------------------

/** A HealthKit workout, already flattened out of the native proxy. */
export interface HealthWorkout {
  uuid: string;
  activityType: number;
  startedAt: string; // ISO
  endedAt: string; // ISO
  /** Active energy of the workout in kcal, or null if Health has none. */
  kcal: number | null;
  sourceBundleId: string | null;
  metadata: Record<string, unknown>;
}

/** An existing møni `workouts` row (server or still-pending in the outbox). */
export interface ExistingWorkout {
  id: string;
  startedAt: string;
  endedAt: string | null;
  healthkitUuid: string | null;
}

/** Overlap of two time ranges as a share (0…1) of the shorter one. */
export function overlapShare(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): number {
  const a0 = Date.parse(aStart);
  const b0 = Date.parse(bStart);
  // An open-ended row (shouldn't happen for finished workouts) counts as 1 min long.
  const a1 = aEnd ? Date.parse(aEnd) : a0 + 60_000;
  const b1 = bEnd ? Date.parse(bEnd) : b0 + 60_000;
  const overlap = Math.min(a1, b1) - Math.max(a0, b0);
  if (overlap <= 0) return 0;
  const shorter = Math.min(a1 - a0, b1 - b0);
  if (shorter <= 0) return 1;
  return Math.min(1, overlap / shorter);
}

export type WorkoutImportAction =
  /** New `workouts` row (id = `importedWorkoutRowId(...)`). */
  | { kind: 'insert'; workout: HealthWorkout }
  /**
   * Same session as an existing møni workout → keep that row, but take
   * Health's measured energy (`kcal_source = 'healthkit'`) and remember the
   * HealthKit uuid on it (PLAN §6.5).
   */
  | { kind: 'merge'; workout: HealthWorkout; targetId: string }
  | {
      kind: 'skip';
      workout: HealthWorkout;
      reason: 'own' | 'known' | 'duplicate';
    };

/**
 * Decides, per HealthKit workout, whether to insert, merge into an existing
 * møni workout, or skip. Processed in chronological order; every decision is
 * added to the "existing" set so two Health workouts of the same session
 * (e.g. Apple Watch + Strava) don't both count.
 *
 * - written by møni itself → skip ('own', loop prevention)
 * - a row already carries this uuid → skip ('known', idempotent re-delivery)
 * - overlaps a møni-recorded row without a Health link → merge
 * - overlaps a row that is already linked to another Health workout → skip ('duplicate')
 * - otherwise → insert
 */
export function planWorkoutImport(
  healthWorkouts: readonly HealthWorkout[],
  existing: readonly ExistingWorkout[],
  ownBundleId: string | null,
): WorkoutImportAction[] {
  const known: ExistingWorkout[] = existing.map((e) => ({ ...e }));
  const sorted = [...healthWorkouts].sort(
    (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt),
  );
  const actions: WorkoutImportAction[] = [];

  for (const workout of sorted) {
    if (isOwnSample(workout.sourceBundleId, workout.metadata, ownBundleId)) {
      actions.push({ kind: 'skip', workout, reason: 'own' });
      continue;
    }

    // HealthKit samples are immutable, so a uuid we already imported/merged
    // (e.g. re-delivered after an anchor reset) needs no further write.
    if (known.some((e) => e.healthkitUuid === workout.uuid)) {
      actions.push({ kind: 'skip', workout, reason: 'known' });
      continue;
    }

    let best: { row: ExistingWorkout; share: number } | null = null;
    for (const row of known) {
      const share = overlapShare(
        workout.startedAt,
        workout.endedAt,
        row.startedAt,
        row.endedAt,
      );
      if (share >= OVERLAP_MIN_SHARE && (!best || share > best.share))
        best = { row, share };
    }

    if (!best) {
      actions.push({ kind: 'insert', workout });
      known.push({
        id: `hk:${workout.uuid}`,
        startedAt: workout.startedAt,
        endedAt: workout.endedAt,
        healthkitUuid: workout.uuid,
      });
      continue;
    }

    if (best.row.healthkitUuid) {
      actions.push({ kind: 'skip', workout, reason: 'duplicate' });
      continue;
    }

    actions.push({ kind: 'merge', workout, targetId: best.row.id });
    best.row.healthkitUuid = workout.uuid;
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Deterministic ids
// ---------------------------------------------------------------------------

/** Name used to derive an imported workout's row id (see `uuidFromSha1Hex`). */
export function importedWorkoutIdName(
  userId: string,
  healthkitUuid: string,
): string {
  return `moeni:healthkit-workout:${userId}:${healthkitUuid}`;
}

/**
 * Formats the first 128 bits of a SHA-1 hex digest as an RFC 4122 version-5
 * style UUID. Imported workouts get `uuidFromSha1Hex(sha1(importedWorkoutIdName(...)))`
 * as their `id`: deterministic per (user, HealthKit sample), so re-imports are
 * idempotent upserts through the outbox (which conflicts on `id`), and a
 * HealthKit deletion maps to a row id without a lookup.
 */
export function uuidFromSha1Hex(hex: string): string {
  const h = hex.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (h.length < 32) throw new Error('uuidFromSha1Hex: digest too short');
  const timeHiAndVersion = ((parseInt(h.slice(12, 16), 16) & 0x0fff) | 0x5000)
    .toString(16)
    .padStart(4, '0');
  const clockSeq = ((parseInt(h.slice(16, 20), 16) & 0x3fff) | 0x8000)
    .toString(16)
    .padStart(4, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${timeHiAndVersion}-${clockSeq}-${h.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// Body mass
// ---------------------------------------------------------------------------

export interface HealthBodyMassSample {
  uuid: string;
  startDate: Date;
  kg: number;
  sourceBundleId: string | null;
  metadata: Record<string, unknown>;
}

export interface ImportedWeightRow {
  date: string; // local YYYY-MM-DD
  weight_kg: number;
  source: 'healthkit';
  healthkit_uuid: string;
}

/**
 * Body mass samples → `weight_logs` fields (the caller adds `id` + `user_id`).
 * Drops møni's own samples and values outside the DB check (0 < kg < 500).
 * `toLocalDate` is injected (`src/lib/date.ts::toISODate`) to keep this pure.
 */
export function mapBodyMassSamples(
  samples: readonly HealthBodyMassSample[],
  ownBundleId: string | null,
  toLocalDate: (d: Date) => string,
): ImportedWeightRow[] {
  return samples
    .filter((s) => !isOwnSample(s.sourceBundleId, s.metadata, ownBundleId))
    .filter((s) => Number.isFinite(s.kg) && s.kg > 0 && s.kg < 500)
    .map((s) => ({
      date: toLocalDate(s.startDate),
      weight_kg: roundTo(s.kg, 2),
      source: 'healthkit' as const,
      healthkit_uuid: s.uuid,
    }));
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/** MMKV key for a per-user anchored-query anchor. */
export function anchorStorageKey(
  userId: string,
  kind: 'workouts' | 'bodyMass',
): string {
  return `health:anchor:${userId}:${kind}`;
}

/** Start of the first-sync window (INITIAL_IMPORT_DAYS before `now`). */
export function initialImportStart(now: Date): Date {
  return new Date(now.getTime() - INITIAL_IMPORT_DAYS * 24 * 60 * 60 * 1000);
}

/** Throttle for automatic syncs; manual "sync now" bypasses it. */
export function shouldAutoSync(
  lastAttemptMs: number | null,
  nowMs: number,
): boolean {
  return (
    lastAttemptMs === null || nowMs - lastAttemptMs >= AUTO_SYNC_MIN_INTERVAL_MS
  );
}

/**
 * HealthKit sync identifier for one nutrition sample of a food log. Saving a
 * sample with the same identifier and a higher `HKMetadataKeySyncVersion`
 * replaces the previous one (edits), and deletes filter on it.
 */
export function foodSyncIdentifier(
  foodLogId: string,
  nutrient: 'kcal' | 'protein' | 'carbs' | 'fat',
): string {
  return `moeni:food:${foodLogId}:${nutrient}`;
}
