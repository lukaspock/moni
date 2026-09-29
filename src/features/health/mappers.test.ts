import { WorkoutActivityType } from '@kingstinct/react-native-healthkit/types';

import {
  activityTypeForCategory,
  anchorStorageKey,
  AUTO_SYNC_MIN_INTERVAL_MS,
  categoryForActivityType,
  foodSyncIdentifier,
  initialImportStart,
  isOwnSample,
  mapBodyMassSamples,
  MOENI_WORKOUT_ID_METADATA_KEY,
  overlapShare,
  planWorkoutImport,
  shouldAutoSync,
  uuidFromSha1Hex,
  type ExistingWorkout,
  type HealthWorkout,
} from './mappers';

const OWN = 'com.moeni.app';

function hkWorkout(overrides: Partial<HealthWorkout> = {}): HealthWorkout {
  return {
    uuid: 'HK-1',
    activityType: WorkoutActivityType.running,
    startedAt: '2026-09-28T07:00:00.000Z',
    endedAt: '2026-09-28T07:45:00.000Z',
    kcal: 420,
    sourceBundleId: 'com.apple.health',
    metadata: {},
    ...overrides,
  };
}

function moeniRow(overrides: Partial<ExistingWorkout> = {}): ExistingWorkout {
  return {
    id: 'moeni-1',
    startedAt: '2026-09-28T07:05:00.000Z',
    endedAt: '2026-09-28T07:50:00.000Z',
    healthkitUuid: null,
    ...overrides,
  };
}

describe('categoryForActivityType', () => {
  it('maps strength, cardio, sport and other', () => {
    expect(categoryForActivityType(WorkoutActivityType.traditionalStrengthTraining)).toBe('strength');
    expect(categoryForActivityType(WorkoutActivityType.functionalStrengthTraining)).toBe('strength');
    expect(categoryForActivityType(WorkoutActivityType.running)).toBe('cardio');
    expect(categoryForActivityType(WorkoutActivityType.highIntensityIntervalTraining)).toBe('cardio');
    expect(categoryForActivityType(WorkoutActivityType.soccer)).toBe('sport');
    expect(categoryForActivityType(WorkoutActivityType.climbing)).toBe('sport');
    expect(categoryForActivityType(WorkoutActivityType.yoga)).toBe('other');
    expect(categoryForActivityType(WorkoutActivityType.other)).toBe('other');
  });

  it('falls back to sport for unknown values', () => {
    expect(categoryForActivityType(123456)).toBe('sport');
  });

  it('round-trips møni categories that have a dedicated Health type', () => {
    expect(categoryForActivityType(activityTypeForCategory('strength'))).toBe('strength');
    expect(categoryForActivityType(activityTypeForCategory('cardio'))).toBe('cardio');
    expect(categoryForActivityType(activityTypeForCategory('other'))).toBe('other');
  });
});

describe('isOwnSample', () => {
  it('detects møni by bundle id', () => {
    expect(isOwnSample(OWN, {}, OWN)).toBe(true);
    expect(isOwnSample('com.apple.health', {}, OWN)).toBe(false);
  });

  it('detects møni by metadata key even under another bundle id', () => {
    expect(isOwnSample('com.other', { [MOENI_WORKOUT_ID_METADATA_KEY]: 'x' }, OWN)).toBe(true);
  });

  it('does not treat unknown sources as own when own bundle id is unknown', () => {
    expect(isOwnSample(null, {}, null)).toBe(false);
    expect(isOwnSample('com.other', undefined, null)).toBe(false);
  });
});

describe('overlapShare', () => {
  it('is 0 for disjoint ranges', () => {
    expect(overlapShare('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z', '2026-01-01T11:00:00Z', '2026-01-01T12:00:00Z')).toBe(0);
  });

  it('is relative to the shorter range', () => {
    // 30 min inside a 2 h range → fully covered
    expect(overlapShare('2026-01-01T10:00:00Z', '2026-01-01T12:00:00Z', '2026-01-01T10:30:00Z', '2026-01-01T11:00:00Z')).toBe(1);
    // 60 min ranges shifted by 30 min → half
    expect(overlapShare('2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z', '2026-01-01T10:30:00Z', '2026-01-01T11:30:00Z')).toBeCloseTo(0.5);
  });
});

describe('planWorkoutImport', () => {
  it('inserts a Health workout that matches nothing', () => {
    const actions = planWorkoutImport([hkWorkout()], [], OWN);
    expect(actions).toEqual([{ kind: 'insert', workout: hkWorkout() }]);
  });

  it('skips workouts møni wrote itself (loop prevention)', () => {
    const own = hkWorkout({ sourceBundleId: OWN, metadata: { [MOENI_WORKOUT_ID_METADATA_KEY]: 'moeni-1' } });
    expect(planWorkoutImport([own], [], OWN)).toEqual([{ kind: 'skip', workout: own, reason: 'own' }]);
  });

  it('merges into an overlapping møni workout instead of duplicating it', () => {
    const actions = planWorkoutImport([hkWorkout()], [moeniRow()], OWN);
    expect(actions).toEqual([{ kind: 'merge', workout: hkWorkout(), targetId: 'moeni-1' }]);
  });

  it('does not merge a barely-overlapping workout', () => {
    const row = moeniRow({ startedAt: '2026-09-28T07:40:00.000Z', endedAt: '2026-09-28T08:40:00.000Z' });
    expect(planWorkoutImport([hkWorkout()], [row], OWN)[0].kind).toBe('insert');
  });

  it('skips a uuid that is already imported/merged', () => {
    const row = moeniRow({ healthkitUuid: 'HK-1' });
    expect(planWorkoutImport([hkWorkout()], [row], OWN)).toEqual([{ kind: 'skip', workout: hkWorkout(), reason: 'known' }]);
  });

  it('skips a second Health workout of the same session (e.g. Watch + Strava)', () => {
    const watch = hkWorkout({ uuid: 'HK-WATCH' });
    const strava = hkWorkout({ uuid: 'HK-STRAVA', startedAt: '2026-09-28T07:01:00.000Z', sourceBundleId: 'com.strava' });
    const actions = planWorkoutImport([strava, watch], [], OWN);
    expect(actions.map((a) => [a.workout.uuid, a.kind])).toEqual([
      ['HK-WATCH', 'insert'],
      ['HK-STRAVA', 'skip'],
    ]);
  });

  it('merges only one Health workout into a møni workout', () => {
    const a = hkWorkout({ uuid: 'A' });
    const b = hkWorkout({ uuid: 'B', startedAt: '2026-09-28T07:02:00.000Z' });
    const actions = planWorkoutImport([a, b], [moeniRow()], OWN);
    expect(actions.map((x) => x.kind)).toEqual(['merge', 'skip']);
  });

  it('picks the møni workout with the largest overlap', () => {
    const rows = [
      moeniRow({ id: 'small', startedAt: '2026-09-28T07:20:00.000Z', endedAt: '2026-09-28T08:20:00.000Z' }),
      moeniRow({ id: 'big', startedAt: '2026-09-28T06:55:00.000Z', endedAt: '2026-09-28T07:45:00.000Z' }),
    ];
    const [action] = planWorkoutImport([hkWorkout()], rows, OWN);
    expect(action).toMatchObject({ kind: 'merge', targetId: 'big' });
  });
});

describe('uuidFromSha1Hex', () => {
  it('formats a SHA-1 digest as a version-5 UUID', () => {
    // SHA-1("abc")
    const uuid = uuidFromSha1Hex('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(uuid).toBe('a9993e36-4706-516a-ba3e-25717850c26c');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('rejects short input', () => {
    expect(() => uuidFromSha1Hex('abc')).toThrow();
  });
});

describe('mapBodyMassSamples', () => {
  const toLocalDate = (d: Date) => d.toISOString().slice(0, 10);

  it('maps samples, drops own and implausible values', () => {
    const rows = mapBodyMassSamples(
      [
        { uuid: 'w1', startDate: new Date('2026-09-28T06:00:00Z'), kg: 80.456, sourceBundleId: 'com.withings', metadata: {} },
        { uuid: 'w2', startDate: new Date('2026-09-28T06:00:00Z'), kg: 80, sourceBundleId: OWN, metadata: {} },
        { uuid: 'w3', startDate: new Date('2026-09-28T06:00:00Z'), kg: 0, sourceBundleId: 'x', metadata: {} },
        { uuid: 'w4', startDate: new Date('2026-09-28T06:00:00Z'), kg: 600, sourceBundleId: 'x', metadata: {} },
      ],
      OWN,
      toLocalDate,
    );
    expect(rows).toEqual([{ date: '2026-09-28', weight_kg: 80.46, source: 'healthkit', healthkit_uuid: 'w1' }]);
  });
});

describe('small helpers', () => {
  it('anchorStorageKey is per user and kind', () => {
    expect(anchorStorageKey('u1', 'workouts')).toBe('health:anchor:u1:workouts');
    expect(anchorStorageKey('u1', 'bodyMass')).not.toBe(anchorStorageKey('u2', 'bodyMass'));
  });

  it('initialImportStart is 30 days back', () => {
    const now = new Date('2026-09-29T12:00:00Z');
    expect(initialImportStart(now).toISOString()).toBe('2026-08-30T12:00:00.000Z');
  });

  it('shouldAutoSync throttles to the minimum interval', () => {
    expect(shouldAutoSync(null, 1000)).toBe(true);
    expect(shouldAutoSync(0, AUTO_SYNC_MIN_INTERVAL_MS - 1)).toBe(false);
    expect(shouldAutoSync(0, AUTO_SYNC_MIN_INTERVAL_MS)).toBe(true);
  });

  it('foodSyncIdentifier is stable per log + nutrient', () => {
    expect(foodSyncIdentifier('f1', 'kcal')).toBe('moeni:food:f1:kcal');
    expect(foodSyncIdentifier('f1', 'protein')).not.toBe(foodSyncIdentifier('f1', 'kcal'));
  });
});
