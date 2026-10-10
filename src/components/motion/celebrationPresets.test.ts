import { FOAM_MAX_COUNT } from './foamMath';
import { celebrationPreset, type CelebrationKind } from './celebrationPresets';
import { HAPTIC_PATTERNS } from '@/lib/hapticsEngine';

const kinds: CelebrationKind[] = [
  'goalReached',
  'streak',
  'pr',
  'workoutDone',
  'bonus',
];

describe('celebrationPreset', () => {
  it('maps every kind to an existing haptic within the particle budget', () => {
    for (const k of kinds) {
      for (const l of [1, 2, 3] as const) {
        const p = celebrationPreset(k, l);
        expect(p.count).toBeLessThanOrEqual(FOAM_MAX_COUNT);
        expect(p.haptic in HAPTIC_PATTERNS).toBe(true);
      }
    }
  });
  it('streak intensity grows with level', () => {
    expect(celebrationPreset('streak', 3).count).toBeGreaterThan(
      celebrationPreset('streak', 1).count,
    );
  });
});
