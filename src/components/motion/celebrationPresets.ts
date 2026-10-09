import type { HapticEvent } from '@/lib/hapticsEngine';

export type CelebrationKind =
  'goalReached' | 'streak' | 'pr' | 'workoutDone' | 'bonus';

export type CelebrationLevel = 1 | 2 | 3;

export interface CelebrationPreset {
  count: number;
  spread: number;
  riseMax: number;
  /** which palette the foam uses */
  palette: 'foam' | 'bonus';
  haptic: HapticEvent;
}

/** Intensity per kind/level; counts stay within the 48 budget. */
export function celebrationPreset(
  kind: CelebrationKind,
  level: CelebrationLevel = 1,
): CelebrationPreset {
  switch (kind) {
    case 'goalReached':
      return {
        count: 28,
        spread: 22,
        riseMax: 120,
        palette: 'foam',
        haptic: 'goalReached',
      };
    case 'streak': {
      const count = level === 3 ? 44 : level === 2 ? 32 : 20;
      return {
        count,
        spread: 18 + level * 4,
        riseMax: 100 + level * 15,
        palette: 'foam',
        haptic: 'rhythmMilestone',
      };
    }
    case 'pr':
      return {
        count: 36,
        spread: 26,
        riseMax: 130,
        palette: 'foam',
        haptic: 'prLanded',
      };
    case 'workoutDone':
      return {
        count: 30,
        spread: 24,
        riseMax: 120,
        palette: 'foam',
        haptic: 'workoutFinished',
      };
    case 'bonus':
      return {
        count: 8,
        spread: 10,
        riseMax: 90,
        palette: 'bonus',
        haptic: 'bonusGained',
      };
  }
}
