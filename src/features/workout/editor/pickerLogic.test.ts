import { buildPickerSections, orderMuscleGroups } from './pickerLogic';
import type { Exercise } from '../types';

const ex = (
  id: string,
  nameKey: string | null,
  muscles: string[],
  customName?: string,
): Exercise => ({
  id,
  ownerId: null,
  nameKey,
  customName: customName ?? null,
  category: 'strength',
  muscleGroups: muscles,
  equipment: null,
  metValue: null,
  trackingType: 'weight_reps',
});

const catalog = [
  ex('1', 'exercise.squat', ['quadriceps']),
  ex('2', 'exercise.bench_press', ['chest']),
  ex('3', 'exercise.cable_crossover', ['chest']),
  ex('4', null, ['back'], 'Zug am Seil'),
];
const NAMES: Record<string, string> = {
  '1': 'Kniebeuge',
  '2': 'Bankdrücken',
  '3': 'Cable Crossover',
  '4': 'Zug am Seil',
};
const nameOf = (e: Exercise) => NAMES[e.id] ?? '';

describe('orderMuscleGroups', () => {
  it('puts known groups in training order, unknown ones last', () => {
    expect(
      orderMuscleGroups(['zzz', 'core', 'chest', 'back', 'chest']),
    ).toEqual(['chest', 'back', 'core', 'zzz']);
  });
});

describe('buildPickerSections', () => {
  it('shows recent, popular (without recents) and A–Z when unfiltered', () => {
    const s = buildPickerSections({
      exercises: catalog,
      recentIds: ['2', 'gone'],
      query: '',
      muscleGroup: null,
      nameOf,
    });
    expect(s.filtered).toBe(false);
    expect(s.recent.map((e) => e.id)).toEqual(['2']);
    expect(s.popular.map((e) => e.id)).toEqual(['1']);
    expect(s.all.map((e) => e.id)).toEqual(['2', '3', '1', '4']);
  });

  it('filters by search and muscle group, sorted by name', () => {
    const s = buildPickerSections({
      exercises: catalog,
      recentIds: ['2'],
      query: 'c',
      muscleGroup: 'chest',
      nameOf,
    });
    expect(s.filtered).toBe(true);
    expect(s.recent).toEqual([]);
    expect(s.popular).toEqual([]);
    expect(s.all.map((e) => e.id)).toEqual(['2', '3']);
  });

  it('hides excluded ids everywhere', () => {
    const s = buildPickerSections({
      exercises: catalog,
      recentIds: ['2'],
      query: '',
      muscleGroup: null,
      nameOf,
      excludeIds: ['2'],
    });
    expect(s.recent).toEqual([]);
    expect(s.all.map((e) => e.id)).not.toContain('2');
  });
});
