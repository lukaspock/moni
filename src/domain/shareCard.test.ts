import { ACHIEVEMENT_CATALOG } from './achievements';
import {
  FORBIDDEN_SHARE_KEYS,
  buildShareCardModel,
  type AchievementShareSource,
  type RhythmShareSource,
  type ShareCardModel,
  type ShareCardOptions,
  type WeekShareSource,
  type WorkoutShareSource,
} from './shareCard';

const glyphs = Array.from({ length: 7 }, (_, i) => ({
  ring: i < 5,
  slash: i > 3,
  rest: false,
}));

const week: WeekShareSource = {
  name: 'Lena',
  weekStart: '2026-01-05',
  titleKey: 'full',
  days: glyphs,
  foodDays: 5,
  trainingDays: 3,
  proteinDays: 4,
  avgProteinG: 142.4,
  rhythm: { current: 7, stageKey: 'inStep' },
  weightTrendDeltaKg: -0.34,
};
const workout: WorkoutShareSource = {
  name: 'Lena',
  routineName: 'Push Day',
  durationMin: 52.4,
  volume: 6420,
  distanceKm: 5.234,
  prExerciseName: 'Bench Press',
};
const achievement: AchievementShareSource = {
  name: 'Lena',
  id: 'firstWorkout',
  category: 'training',
  unlockedOn: '2026-01-05',
};
const rhythm: RhythmShareSource = {
  name: 'Lena',
  current: 12,
  lifetimeWeeks: 14,
  stageKey: 'inSync',
};

const off: ShareCardOptions = { showName: false, showDetails: false };
const all: ShareCardOptions = { showName: true, showDetails: true };
const keys = (m: ShareCardModel | null) => (m?.stats ?? []).map((s) => s.key);

describe('week card', () => {
  it('shows counters, days and stage by default, without name or details', () => {
    const m = buildShareCardModel('week', week, off, false);
    expect(m?.name).toBeNull();
    expect(keys(m)).toEqual([
      'trainingDays',
      'foodDays',
      'proteinDays',
      'rhythmWeeks',
    ]);
    expect(m?.days).toHaveLength(7);
    expect(m?.stageKey).toBe('inStep');
    expect(m?.titleKey).toBe('shareCard.week.full');
    expect(m?.date).toBe('2026-01-05');
  });

  it('adds name, protein grams and the weight trend only when switched on', () => {
    const m = buildShareCardModel('week', week, all, false);
    expect(m?.name).toBe('Lena');
    expect(m?.stats.find((s) => s.key === 'avgProteinG')?.value).toBe('142');
    expect(m?.stats.find((s) => s.key === 'trendDelta')?.value).toBe('-0.3');
  });

  it('drops rhythm, stage, protein and trend under the care signal', () => {
    const m = buildShareCardModel('week', week, all, true);
    expect(keys(m)).toEqual(['trainingDays', 'foodDays', 'proteinDays']);
    expect(m?.stageKey).toBeUndefined();
  });

  it('ignores blank names and works without optional data', () => {
    const m = buildShareCardModel(
      'week',
      {
        ...week,
        name: '   ',
        rhythm: null,
        avgProteinG: null,
        weightTrendDeltaKg: null,
      },
      all,
      false,
    );
    expect(m?.name).toBeNull();
    expect(keys(m)).toEqual(['trainingDays', 'foodDays', 'proteinDays']);
  });

  it('formats a positive trend with a plus sign and omits no-change as 0', () => {
    expect(
      buildShareCardModel(
        'week',
        { ...week, weightTrendDeltaKg: 0.3 },
        all,
        false,
      )?.stats.find((s) => s.key === 'trendDelta')?.value,
    ).toBe('+0.3');
    expect(
      buildShareCardModel(
        'week',
        { ...week, weightTrendDeltaKg: 0 },
        all,
        false,
      )?.stats.find((s) => s.key === 'trendDelta')?.value,
    ).toBe('0');
  });
});

describe('workout card', () => {
  it('shows duration and the PR exercise by default', () => {
    const m = buildShareCardModel('workout', workout, off, false);
    expect(keys(m)).toEqual(['durationMin', 'prExercise']);
    expect(m?.stats[0].value).toBe('52');
  });
  it('adds volume, distance and routine name with details', () => {
    const m = buildShareCardModel('workout', workout, all, false);
    expect(keys(m)).toEqual([
      'durationMin',
      'volume',
      'distance',
      'prExercise',
      'routine',
    ]);
    expect(m?.stats.find((s) => s.key === 'distance')?.value).toBe('5.2');
  });
  it('stays available under the care signal', () => {
    expect(buildShareCardModel('workout', workout, all, true)).not.toBeNull();
  });
});

describe('achievement card', () => {
  it('references the stamp name key and unlock date', () => {
    const m = buildShareCardModel('achievement', achievement, off, false);
    expect(m).toMatchObject({
      achievementId: 'firstWorkout',
      titleKey: 'achievements.firstWorkout.name',
      date: '2026-01-05',
      stats: [],
    });
  });
  it('is hidden for body stamps under the care signal only', () => {
    const body = {
      ...achievement,
      id: 'bodyGoal2kg' as const,
      category: 'body' as const,
    };
    expect(buildShareCardModel('achievement', body, off, true)).toBeNull();
    expect(buildShareCardModel('achievement', body, off, false)).not.toBeNull();
    expect(
      buildShareCardModel('achievement', achievement, off, true),
    ).not.toBeNull();
  });
});

describe('rhythm card', () => {
  it('shows weeks and stage', () => {
    const m = buildShareCardModel('rhythm', rhythm, off, false);
    expect(m?.stats).toEqual([
      { key: 'rhythmWeeks', value: '12' },
      { key: 'lifetimeWeeks', value: '14' },
    ]);
    expect(m?.stageKey).toBe('inSync');
  });
  it('is not offered under the care signal', () => {
    expect(buildShareCardModel('rhythm', rhythm, all, true)).toBeNull();
  });
});

describe('privacy by construction', () => {
  const models = (): ShareCardModel[] => {
    const out: (ShareCardModel | null)[] = [];
    for (const opts of [off, all]) {
      for (const flagged of [false, true]) {
        out.push(buildShareCardModel('week', week, opts, flagged));
        out.push(buildShareCardModel('workout', workout, opts, flagged));
        out.push(buildShareCardModel('rhythm', rhythm, opts, flagged));
        for (const def of ACHIEVEMENT_CATALOG) {
          out.push(
            buildShareCardModel(
              'achievement',
              {
                name: 'Lena',
                id: def.id,
                category: def.category,
                unlockedOn: '2026-01-05',
              },
              opts,
              flagged,
            ),
          );
        }
      }
    }
    return out.filter((m): m is ShareCardModel => m !== null);
  };

  it('never emits forbidden stat keys', () => {
    for (const m of models()) {
      for (const stat of m.stats) {
        expect(FORBIDDEN_SHARE_KEYS).not.toContain(stat.key);
      }
    }
  });

  it('never leaks calories, weights, BMI or clock times in values', () => {
    for (const m of models()) {
      for (const stat of m.stats) {
        expect(stat.value).not.toMatch(/kcal|\bkg\b|\blb\b|bmi|\d{1,2}:\d{2}/i);
      }
      expect(JSON.stringify(m)).not.toMatch(/kcal|bmi|targetWeight/i);
    }
  });

  it('only includes the name when explicitly enabled', () => {
    for (const m of models()) {
      // `off` models never carry a name
      if (m.name) expect(m.name).toBe('Lena');
    }
    for (const kind of ['week', 'workout', 'rhythm'] as const) {
      const src = { week, workout, rhythm }[kind];
      expect(
        buildShareCardModel(kind, src as never, off, false)?.name,
      ).toBeNull();
    }
  });

  it('keeps the week card free of absolute body data by default', () => {
    const m = buildShareCardModel('week', week, off, false);
    expect(keys(m)).not.toContain('trendDelta');
    expect(keys(m)).not.toContain('avgProteinG');
  });
});
