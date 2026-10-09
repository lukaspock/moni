import { shiftIsoDate } from './adaptive';
import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_IDS,
  achievementDef,
  evaluateAchievements,
  mergeUnlocked,
  newlyUnlocked,
  planUnlockPresentation,
  type AchievementFacts,
  type AchievementId,
  type AchievementStatus,
} from './achievements';
import {
  ctx,
  day,
  GOALS,
  makeWeek,
  rhythmWeek,
  weakWeek,
  ws,
} from './ledgerFixtures';
import {
  computeRhythm,
  pauseDateSet,
  type LedgerDay,
  type PauseRange,
} from './rhythm';

const RELEASE1: AchievementId[] = [
  'firstWorkout',
  'workouts10',
  'firstPr',
  'allRounder',
  'firstMeal',
  'threeMeals',
  'proteinWeek',
  'wellFuelled',
  'firstRhythm',
  'rhythm4',
  'fullWeek',
  'comeback',
  'firstWeigh',
  'trendReady',
  'firstPhoto',
  'healthLinked',
];

function facts(
  days: LedgerDay[],
  today: string,
  over: Partial<AchievementFacts> = {},
  pauses: PauseRange[] = [],
): AchievementFacts {
  const rhythm = computeRhythm({
    days,
    today,
    plannedWeekdays: new Set(),
    goalsForWeek: () => GOALS,
    pauses,
  });
  const sum = (f: (d: LedgerDay) => number) =>
    days.reduce((s, d) => s + f(d), 0);
  return {
    today,
    days,
    rhythm,
    dayContext: ctx(today, { pausedDates: pauseDateSet(pauses) }),
    pauses,
    counts: {
      workouts: sum((d) => d.workoutCount),
      foodLogs: sum((d) => d.foodLogCount),
      photoLogs: sum((d) => d.sources.photo),
      barcodeLogs: sum((d) => d.sources.barcode),
      voiceLogs: sum((d) => d.sources.voice),
      labelLogs: sum((d) => d.sources.label),
      favorites: 0,
      customExercises: 0,
      routines: 0,
      weightLogs: sum((d) => (d.weightLogged ? 1 : 0)),
    },
    strength: {
      totalVolumeKg: 0,
      bestOneRmGainPct: null,
      firstPrDate: null,
      bodyweightLiftDone: false,
    },
    body: {
      startWeightKg: null,
      trendWeightKg: null,
      targetWeightKg: null,
      goal: null,
      heightCm: null,
    },
    flags: {
      healthConnected: false,
      healthWorkoutImported: false,
      adaptiveTdeeAvailable: false,
      patternFound: false,
      sharedCount: 0,
      reviewsViewed: 0,
      accountCreatedAt: '2026-01-01',
    },
    careFlagged: false,
    ...over,
  };
}

function status(f: AchievementFacts, id: AchievementId): AchievementStatus {
  const s = evaluateAchievements(f, { includeLater: true }).find(
    (x) => x.id === id,
  );
  if (!s) throw new Error(`missing ${id}`);
  return s;
}

const T = '2026-06-10';

describe('catalog', () => {
  it('has 43 unique stamps with complete metadata', () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(43);
    expect(new Set(ACHIEVEMENT_CATALOG.map((d) => d.id)).size).toBe(43);
    expect(ACHIEVEMENT_IDS).toHaveLength(43);
    for (const def of ACHIEVEMENT_CATALOG) {
      expect(def.nameKey).toBe(`achievements.${def.id}.name`);
      expect(def.bodyKey).toBe(`achievements.${def.id}.body`);
      expect(def.hintKey).toBe(`achievements.${def.id}.hint`);
    }
  });

  it('marks exactly the 16 start stamps as release 1', () => {
    const r1 = ACHIEVEMENT_CATALOG.filter((d) => d.phase === 'release1').map(
      (d) => d.id,
    );
    expect([...r1].sort()).toEqual([...RELEASE1].sort());
    expect(ACHIEVEMENT_CATALOG.filter((d) => d.phase === 'later')).toHaveLength(
      27,
    );
  });

  it('keeps hidden stamps at or below 25 %', () => {
    const hidden = ACHIEVEMENT_CATALOG.filter((d) => d.hidden).length;
    expect(hidden / ACHIEVEMENT_CATALOG.length).toBeLessThanOrEqual(0.25);
    expect(hidden).toBeGreaterThan(0);
  });

  it('has no calorie-floor stamps (care rule)', () => {
    for (const id of ACHIEVEMENT_IDS) {
      expect(id).not.toMatch(
        /deficit|underLimit|fasting|perfectDay|lowKcal|belowLimit/i,
      );
    }
  });

  it('looks stamps up by id', () => {
    expect(achievementDef('firstMeal').category).toBe('nutrition');
  });
});

describe('evaluateAchievements scope', () => {
  it('evaluates only the release-1 set by default', () => {
    const ids = evaluateAchievements(facts([], T)).map((s) => s.id);
    expect([...ids].sort()).toEqual([...RELEASE1].sort());
  });
  it('includes the later stamps on request', () => {
    expect(
      evaluateAchievements(facts([], T), { includeLater: true }),
    ).toHaveLength(43);
  });
  it('unlocks nothing for an empty ledger and shows progress for counters', () => {
    const all = evaluateAchievements(facts([], T), { includeLater: true });
    expect(all.every((s) => !s.unlocked)).toBe(true);
    const w10 = all.find((s) => s.id === 'workouts10');
    expect(w10?.progress).toEqual({ current: 0, target: 10 });
  });
});

describe('release-1 stamps', () => {
  it('firstWorkout', () => {
    expect(
      status(facts([day('2026-06-01', { foodLogCount: 1 })], T), 'firstWorkout')
        .unlocked,
    ).toBe(false);
    const s = status(
      facts([day('2026-06-02', { workoutCount: 1 })], T),
      'firstWorkout',
    );
    expect(s.unlocked).toBe(true);
    expect(s.unlockedOn).toBe('2026-06-02');
  });

  it('workouts10 uses the cumulative date', () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      day(shiftIsoDate('2026-05-01', i), { workoutCount: 1 }),
    );
    expect(status(facts(nine, T), 'workouts10').unlocked).toBe(false);
    expect(status(facts(nine, T), 'workouts10').progress).toEqual({
      current: 9,
      target: 10,
    });
    const ten = [...nine, day('2026-05-20', { workoutCount: 1 })];
    const s = status(facts(ten, T), 'workouts10');
    expect(s.unlocked).toBe(true);
    expect(s.unlockedOn).toBe('2026-05-20');
  });

  it('firstPr follows the strength facts', () => {
    const base = facts([], T);
    expect(status(base, 'firstPr').unlocked).toBe(false);
    const pr = facts([], T, {
      strength: { ...base.strength, firstPrDate: '2026-05-04' },
    });
    expect(status(pr, 'firstPr')).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-05-04',
    });
  });

  it('allRounder needs strength and cardio/sport in the same week', () => {
    const same = [
      day(ws(0), { workoutCount: 1, hadStrength: true }),
      day(shiftIsoDate(ws(0), 2), { workoutCount: 1, hadCardioOrSport: true }),
    ];
    const s = status(facts(same, '2026-03-01'), 'allRounder');
    expect(s.unlocked).toBe(true);
    expect(s.unlockedOn).toBe(shiftIsoDate(ws(0), 2));
    const split = [
      day(ws(0), { workoutCount: 1, hadStrength: true }),
      day(ws(1), { workoutCount: 1, hadCardioOrSport: true }),
    ];
    expect(status(facts(split, '2026-03-01'), 'allRounder').unlocked).toBe(
      false,
    );
  });

  it('firstMeal', () => {
    expect(status(facts([], T), 'firstMeal').unlocked).toBe(false);
    expect(
      status(facts([day('2026-06-03', { foodLogCount: 1 })], T), 'firstMeal'),
    ).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-06-03',
    });
  });

  it('threeMeals needs breakfast, lunch and dinner on one day', () => {
    const one = day('2026-06-03', {
      foodLogCount: 3,
      meals: { breakfast: 1, lunch: 1, dinner: 1, snack: 0 },
    });
    expect(status(facts([one], T), 'threeMeals').unlocked).toBe(true);
    const spread = [
      day('2026-06-03', {
        foodLogCount: 2,
        meals: { breakfast: 1, lunch: 1, dinner: 0, snack: 0 },
      }),
      day('2026-06-04', {
        foodLogCount: 1,
        meals: { breakfast: 0, lunch: 0, dinner: 1, snack: 0 },
      }),
    ];
    expect(status(facts(spread, T), 'threeMeals').unlocked).toBe(false);
  });

  it('proteinWeek needs a closed protein ring', () => {
    const closed = makeWeek(ws(0), { food: 4, protein: 4 });
    expect(status(facts(closed, '2026-03-01'), 'proteinWeek').unlocked).toBe(
      true,
    );
    const open = makeWeek(ws(0), { food: 4, protein: 3 });
    expect(status(facts(open, '2026-03-01'), 'proteinWeek').unlocked).toBe(
      false,
    );
  });

  it('wellFuelled is a two-sided corridor (90–115 %) on a training day with >= 3 entries', () => {
    const mk = (kcal: number, over: Partial<LedgerDay> = {}) =>
      day('2026-06-03', {
        workoutCount: 1,
        foodLogCount: 3,
        targetKcal: 2000,
        kcalEaten: kcal,
        ...over,
      });
    expect(status(facts([mk(1800)], T), 'wellFuelled').unlocked).toBe(true);
    expect(status(facts([mk(2300)], T), 'wellFuelled').unlocked).toBe(true);
    expect(status(facts([mk(1799)], T), 'wellFuelled').unlocked).toBe(false);
    expect(status(facts([mk(2301)], T), 'wellFuelled').unlocked).toBe(false);
    expect(
      status(facts([mk(2000, { foodLogCount: 2 })], T), 'wellFuelled').unlocked,
    ).toBe(false);
    expect(
      status(facts([mk(2000, { workoutCount: 0 })], T), 'wellFuelled').unlocked,
    ).toBe(false);
    expect(
      status(facts([mk(2000, { targetKcal: null })], T), 'wellFuelled')
        .unlocked,
    ).toBe(false);
  });

  it('never rewards very low intake', () => {
    const lowDays = Array.from({ length: 10 }, (_, i) =>
      day(shiftIsoDate('2026-05-01', i), {
        foodLogCount: 3,
        kcalEaten: 400,
        targetKcal: 2000,
        workoutCount: 1,
      }),
    );
    expect(status(facts(lowDays, T), 'wellFuelled').unlocked).toBe(false);
  });

  it('firstRhythm and rhythm4', () => {
    const one = rhythmWeek(ws(0));
    const s1 = status(facts(one, shiftIsoDate(ws(1), 2)), 'firstRhythm');
    expect(s1.unlocked).toBe(true);
    expect(s1.unlockedOn).toBe(shiftIsoDate(ws(0), 6));
    expect(status(facts(one, shiftIsoDate(ws(1), 2)), 'rhythm4').unlocked).toBe(
      false,
    );
    const four = [0, 1, 2, 3].flatMap((n) => rhythmWeek(ws(n)));
    const s4 = status(facts(four, shiftIsoDate(ws(4), 2)), 'rhythm4');
    expect(s4.unlocked).toBe(true);
    expect(s4.unlockedOn).toBe(shiftIsoDate(ws(3), 6));
  });

  it('rhythm4 stays unlocked through the best value after a break', () => {
    const days = [
      ...[0, 1, 2, 3].flatMap((n) => rhythmWeek(ws(n))),
      ...weakWeek(ws(4)),
      ...weakWeek(ws(5)),
      ...weakWeek(ws(6)),
    ];
    const f = facts(days, shiftIsoDate(ws(7), 2));
    expect(f.rhythm.current).toBe(0);
    expect(status(f, 'rhythm4').unlocked).toBe(true);
  });

  it('fullWeek needs every visible ring closed', () => {
    const full = makeWeek(ws(0), { food: 5, protein: 4, train: 3 });
    expect(status(facts(full, '2026-03-01'), 'fullWeek').unlocked).toBe(true);
    const almost = makeWeek(ws(0), { food: 5, protein: 3, train: 3 });
    expect(status(facts(almost, '2026-03-01'), 'fullWeek').unlocked).toBe(
      false,
    );
  });

  it('comeback needs a rhythm week after >= 2 weeks without rhythm (and an earlier rhythm)', () => {
    const back = [
      ...rhythmWeek(ws(0)),
      ...weakWeek(ws(1)),
      ...weakWeek(ws(2)),
      ...rhythmWeek(ws(3)),
    ];
    const s = status(facts(back, shiftIsoDate(ws(4), 1)), 'comeback');
    expect(s.unlocked).toBe(true);
    expect(s.unlockedOn).toBe(shiftIsoDate(ws(3), 6));
    const short = [
      ...rhythmWeek(ws(0)),
      ...weakWeek(ws(1)),
      ...rhythmWeek(ws(2)),
    ];
    expect(
      status(facts(short, shiftIsoDate(ws(3), 1)), 'comeback').unlocked,
    ).toBe(false);
    const noPrior = [
      ...weakWeek(ws(0)),
      ...weakWeek(ws(1)),
      ...rhythmWeek(ws(2)),
    ];
    expect(
      status(facts(noPrior, shiftIsoDate(ws(3), 1)), 'comeback').unlocked,
    ).toBe(false);
  });

  it('comeback ignores paused weeks in the gap count', () => {
    const pause: PauseRange = { from: ws(1), to: shiftIsoDate(ws(2), 6) };
    const days = [...rhythmWeek(ws(0)), ...rhythmWeek(ws(3))];
    expect(
      status(facts(days, shiftIsoDate(ws(4), 1), {}, [pause]), 'comeback')
        .unlocked,
    ).toBe(false);
  });

  it('firstWeigh and trendReady', () => {
    expect(
      status(
        facts([day('2026-06-01', { weightLogged: true })], T),
        'firstWeigh',
      ),
    ).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-06-01',
    });
    const eight = Array.from({ length: 8 }, (_, i) =>
      day(shiftIsoDate('2026-05-01', i * 3), { weightLogged: true }),
    );
    // 8 weigh-ins over 22 days
    const ok = status(facts(eight, T), 'trendReady');
    expect(ok.unlocked).toBe(true);
    expect(ok.unlockedOn).toBe(shiftIsoDate('2026-05-01', 21));
    const sparse = Array.from({ length: 8 }, (_, i) =>
      day(shiftIsoDate('2026-03-01', i * 5), { weightLogged: true }),
    );
    expect(status(facts(sparse, T), 'trendReady').unlocked).toBe(false);
    const seven = eight.slice(0, 7);
    expect(status(facts(seven, T), 'trendReady').unlocked).toBe(false);
  });

  it('firstPhoto counts photo-sourced entries only', () => {
    const photo = day('2026-06-01', {
      foodLogCount: 1,
      sources: { photo: 1, voice: 0, barcode: 0, label: 0 },
    });
    expect(status(facts([photo], T), 'firstPhoto').unlocked).toBe(true);
    expect(
      status(facts([day('2026-06-01', { foodLogCount: 1 })], T), 'firstPhoto')
        .unlocked,
    ).toBe(false);
  });

  it('healthLinked needs the connection and an imported workout', () => {
    const base = facts([], T);
    const both = {
      ...base.flags,
      healthConnected: true,
      healthWorkoutImported: true,
    };
    expect(status(facts([], T, { flags: both }), 'healthLinked').unlocked).toBe(
      true,
    );
    expect(
      status(
        facts([], T, { flags: { ...both, healthWorkoutImported: false } }),
        'healthLinked',
      ).unlocked,
    ).toBe(false);
    expect(
      status(
        facts([], T, { flags: { ...both, healthConnected: false } }),
        'healthLinked',
      ).unlocked,
    ).toBe(false);
  });
});

describe('later stamps', () => {
  it('count based: workouts100, meals100, scanner25, favorites', () => {
    const f = facts([], T, {
      counts: {
        ...facts([], T).counts,
        workouts: 100,
        foodLogs: 99,
        barcodeLogs: 25,
        favorites: 1,
        customExercises: 1,
      },
    });
    expect(status(f, 'workouts100').unlocked).toBe(true);
    expect(status(f, 'workouts50').unlocked).toBe(true);
    expect(status(f, 'meals100').unlocked).toBe(false);
    expect(status(f, 'scanner25').unlocked).toBe(true);
    expect(status(f, 'firstFavorite').unlocked).toBe(true);
    expect(status(f, 'ownExercise').unlocked).toBe(true);
  });

  it('strength: volume10t, plusTen, strongAsYou', () => {
    const base = facts([], T);
    const f = facts([], T, {
      strength: {
        totalVolumeKg: 10_000,
        bestOneRmGainPct: 10,
        firstPrDate: null,
        bodyweightLiftDone: true,
      },
    });
    expect(status(f, 'volume10t').unlocked).toBe(true);
    expect(status(f, 'plusTen').unlocked).toBe(true);
    expect(status(f, 'strongAsYou').unlocked).toBe(true);
    const lower = facts([], T, {
      strength: {
        ...base.strength,
        totalVolumeKg: 9999,
        bestOneRmGainPct: 9.9,
      },
    });
    expect(status(lower, 'volume10t').unlocked).toBe(false);
    expect(status(lower, 'plusTen').unlocked).toBe(false);
  });

  it('rhythm12 / rhythm26 use the best value', () => {
    const days = Array.from({ length: 12 }, (_, n) => rhythmWeek(ws(n))).flat();
    const f = facts(days, shiftIsoDate(ws(12), 2));
    expect(status(f, 'rhythm12')).toMatchObject({
      unlocked: true,
      unlockedOn: shiftIsoDate(ws(11), 6),
    });
    expect(status(f, 'rhythm26').unlocked).toBe(false);
    expect(status(f, 'rhythm26').progress).toEqual({ current: 12, target: 26 });
  });

  it('fullWeek4 counts four full weeks overall', () => {
    const days = [0, 2, 4, 6].flatMap((n) =>
      makeWeek(ws(n), { food: 5, protein: 4, train: 3 }),
    );
    expect(
      status(facts(days, shiftIsoDate(ws(8), 1)), 'fullWeek4').unlocked,
    ).toBe(true);
    const three = [0, 2, 4].flatMap((n) =>
      makeWeek(ws(n), { food: 5, protein: 4, train: 3 }),
    );
    expect(
      status(facts(three, shiftIsoDate(ws(8), 1)), 'fullWeek4').unlocked,
    ).toBe(false);
  });

  it('proteinStreak4 needs four consecutive protein weeks', () => {
    const four = [0, 1, 2, 3].flatMap((n) =>
      makeWeek(ws(n), { food: 4, protein: 4 }),
    );
    expect(
      status(facts(four, shiftIsoDate(ws(4), 1)), 'proteinStreak4').unlocked,
    ).toBe(true);
    const gap = [0, 1, 3, 4].flatMap((n) =>
      makeWeek(ws(n), { food: 4, protein: 4 }),
    );
    expect(
      status(facts(gap, shiftIsoDate(ws(5), 1)), 'proteinStreak4').unlocked,
    ).toBe(false);
  });

  it('bridgeDay needs >= 25 g protein within 3 h after a workout', () => {
    expect(
      status(
        facts([day('2026-06-01', { workoutCount: 1, bridgeProteinG: 25 })], T),
        'bridgeDay',
      ).unlocked,
    ).toBe(true);
    expect(
      status(
        facts([day('2026-06-01', { workoutCount: 1, bridgeProteinG: 24 })], T),
        'bridgeDay',
      ).unlocked,
    ).toBe(false);
  });

  it('goodPause: back within 3 days after a pause of >= 5 days', () => {
    const pause: PauseRange = { from: '2026-02-02', to: '2026-02-08' };
    const back = [day('2026-02-10', { foodLogCount: 2 })];
    expect(
      status(facts(back, '2026-02-20', {}, [pause]), 'goodPause'),
    ).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-02-10',
    });
    const late = [day('2026-02-13', { foodLogCount: 2 })];
    expect(
      status(facts(late, '2026-02-20', {}, [pause]), 'goodPause').unlocked,
    ).toBe(false);
    const short: PauseRange = { from: '2026-02-05', to: '2026-02-08' };
    expect(
      status(facts(back, '2026-02-20', {}, [short]), 'goodPause').unlocked,
    ).toBe(false);
    // pause that has not ended yet
    expect(
      status(facts(back, '2026-02-08', {}, [pause]), 'goodPause').unlocked,
    ).toBe(false);
  });

  it('weekendKeeper: four weekends in a row', () => {
    const weekend = (n: number) => [
      day(shiftIsoDate(ws(n), 5), { workoutCount: 1 }),
      day(shiftIsoDate(ws(n), 6), { workoutCount: 1 }),
    ];
    const four = [0, 1, 2, 3].flatMap(weekend);
    expect(
      status(facts(four, shiftIsoDate(ws(4), 1)), 'weekendKeeper'),
    ).toMatchObject({
      unlocked: true,
      unlockedOn: shiftIsoDate(ws(3), 6),
    });
    const three = [0, 1, 2].flatMap(weekend);
    expect(
      status(facts(three, shiftIsoDate(ws(4), 1)), 'weekendKeeper').unlocked,
    ).toBe(false);
    const broken = [0, 1, 3, 4].flatMap(weekend);
    expect(
      status(facts(broken, shiftIsoDate(ws(6), 1)), 'weekendKeeper').unlocked,
    ).toBe(false);
  });

  it('fullMonth: every week with >= 4 days in the month is a rhythm week', () => {
    // February 2026: weeks starting 02-02, 02-09, 02-16, 02-23 (ws(4)..ws(7))
    const feb = [4, 5, 6, 7].flatMap((n) => rhythmWeek(ws(n)));
    const f = facts(feb, shiftIsoDate(ws(9), 1));
    expect(status(f, 'fullMonth')).toMatchObject({
      unlocked: true,
      unlockedOn: shiftIsoDate(ws(7), 6),
    });
    const missing = [4, 5, 7].flatMap((n) => rhythmWeek(ws(n)));
    expect(
      status(facts(missing, shiftIsoDate(ws(9), 1)), 'fullMonth').unlocked,
    ).toBe(false);
  });

  it('oneYear: account age and recent kept days', () => {
    const recent = Array.from({ length: 8 }, (_, i) =>
      day(shiftIsoDate(T, -i), { workoutCount: 1 }),
    );
    const old = facts(recent, T, {
      flags: {
        ...facts([], T).flags,
        accountCreatedAt: '2025-06-09T10:00:00Z',
      },
    });
    expect(status(old, 'oneYear').unlocked).toBe(true);
    const young = facts(recent, T, {
      flags: {
        ...facts([], T).flags,
        accountCreatedAt: '2025-06-11T10:00:00Z',
      },
    });
    expect(status(young, 'oneYear').unlocked).toBe(false);
    const idle = facts(recent.slice(0, 7), T, {
      flags: { ...facts([], T).flags, accountCreatedAt: '2025-01-01' },
    });
    expect(status(idle, 'oneYear').unlocked).toBe(false);
  });

  it('flags: patternFound, reviews4, sharedFirst, adaptiveOn', () => {
    const base = facts([], T).flags;
    const f = facts([], T, {
      flags: {
        ...base,
        patternFound: true,
        reviewsViewed: 4,
        sharedCount: 1,
        adaptiveTdeeAvailable: true,
      },
    });
    for (const id of [
      'patternFound',
      'reviews4',
      'sharedFirst',
      'adaptiveOn',
    ] as const) {
      expect(status(f, id).unlocked).toBe(true);
    }
    const three = facts([], T, { flags: { ...base, reviewsViewed: 3 } });
    expect(status(three, 'reviews4')).toMatchObject({
      unlocked: false,
      progress: { current: 3, target: 4 },
    });
  });
});

describe('body stamps and the care signal', () => {
  const body = (over: Partial<AchievementFacts['body']>) => ({
    startWeightKg: 85,
    trendWeightKg: 82.5,
    targetWeightKg: 75,
    goal: 'lose' as const,
    heightCm: 180,
    ...over,
  });

  it('bodyGoal2kg: 2 kg towards the goal while not underweight', () => {
    expect(
      status(facts([], T, { body: body({}) }), 'bodyGoal2kg').unlocked,
    ).toBe(true);
    expect(
      status(
        facts([], T, { body: body({ trendWeightKg: 83.5 }) }),
        'bodyGoal2kg',
      ).unlocked,
    ).toBe(false);
    // wrong direction
    expect(
      status(facts([], T, { body: body({ trendWeightKg: 88 }) }), 'bodyGoal2kg')
        .unlocked,
    ).toBe(false);
    // would end underweight (BMI 17.6)
    expect(
      status(
        facts([], T, { body: body({ startWeightKg: 60, trendWeightKg: 57 }) }),
        'bodyGoal2kg',
      ).unlocked,
    ).toBe(false);
    // maintain never qualifies
    expect(
      status(facts([], T, { body: body({ goal: 'maintain' }) }), 'bodyGoal2kg')
        .unlocked,
    ).toBe(false);
    // gain towards the goal
    expect(
      status(
        facts([], T, {
          body: body({ goal: 'gain', startWeightKg: 70, trendWeightKg: 72.4 }),
        }),
        'bodyGoal2kg',
      ).unlocked,
    ).toBe(true);
  });

  it('goalReached: within 0.3 kg of a healthy target', () => {
    const ok = body({
      startWeightKg: 80,
      targetWeightKg: 75,
      trendWeightKg: 75.2,
    });
    expect(status(facts([], T, { body: ok }), 'goalReached').unlocked).toBe(
      true,
    );
    expect(
      status(
        facts([], T, { body: { ...ok, trendWeightKg: 75.4 } }),
        'goalReached',
      ).unlocked,
    ).toBe(false);
    // target BMI below 18.5 is never celebrated
    expect(
      status(
        facts([], T, {
          body: {
            ...ok,
            targetWeightKg: 55,
            startWeightKg: 80,
            trendWeightKg: 55.1,
          },
        }),
        'goalReached',
      ).unlocked,
    ).toBe(false);
    // start == target: nothing was achieved
    expect(
      status(
        facts([], T, { body: { ...ok, startWeightKg: 75, trendWeightKg: 75 } }),
        'goalReached',
      ).unlocked,
    ).toBe(false);
    expect(
      status(facts([], T, { body: { ...ok, goal: 'maintain' } }), 'goalReached')
        .unlocked,
    ).toBe(false);
    expect(
      status(facts([], T, { body: { ...ok, heightCm: null } }), 'goalReached')
        .unlocked,
    ).toBe(false);
  });

  it('withholds weight-related stamps while the care signal is active', () => {
    const f = facts([], T, { body: body({}), careFlagged: true });
    const s = status(f, 'bodyGoal2kg');
    expect(s.unlocked).toBe(false);
    expect(s.withheld).toBe(true);
    expect(s.unlockedOn).toBeNull();
    // other stamps are unaffected
    const withMeal = facts([day('2026-06-01', { foodLogCount: 1 })], T, {
      careFlagged: true,
    });
    expect(status(withMeal, 'firstMeal').unlocked).toBe(true);
  });
});

describe('no revocation', () => {
  it('keeps persisted unlocks and records new ones with a date', () => {
    const f = facts([day('2026-06-01', { foodLogCount: 1 })], T);
    const statuses = evaluateAchievements(f);
    const { record, statuses: merged } = mergeUnlocked({}, statuses, T);
    expect(record.firstMeal).toBe('2026-06-01');
    expect(merged.find((s) => s.id === 'firstMeal')?.unlocked).toBe(true);

    // later the data disappears (e.g. deleted logs) -> still unlocked, date kept
    const empty = evaluateAchievements(facts([], T));
    const again = mergeUnlocked(record, empty, T);
    const meal = again.statuses.find((s) => s.id === 'firstMeal');
    expect(meal).toMatchObject({ unlocked: true, unlockedOn: '2026-06-01' });
    expect(again.record).toEqual(record);
  });

  it('uses the detection date when the provable date is unknown', () => {
    const base = facts([], T);
    const f = facts([], T, {
      strength: { ...base.strength, firstPrDate: null },
      flags: {
        ...base.flags,
        healthConnected: true,
        healthWorkoutImported: true,
      },
    });
    const { record } = mergeUnlocked({}, evaluateAchievements(f), T);
    expect(record.healthLinked).toBe(T);
  });

  it('keeps a body stamp unlocked even if the care signal appears later', () => {
    const f1 = facts([], T, {
      body: {
        startWeightKg: 85,
        trendWeightKg: 82.5,
        targetWeightKg: 75,
        goal: 'lose',
        heightCm: 180,
      },
    });
    const first = mergeUnlocked(
      {},
      evaluateAchievements(f1, { includeLater: true }),
      T,
    );
    const f2 = { ...f1, careFlagged: true };
    const second = mergeUnlocked(
      first.record,
      evaluateAchievements(f2, { includeLater: true }),
      T,
    );
    expect(second.statuses.find((s) => s.id === 'bodyGoal2kg')?.unlocked).toBe(
      true,
    );
  });

  it('keeps the earliest provable date', () => {
    const [s] = evaluateAchievements(
      facts([day('2026-06-05', { foodLogCount: 1 })], T),
    ).filter((x) => x.id === 'firstMeal');
    const merged = mergeUnlocked({ firstMeal: '2026-06-09' }, [s], T);
    expect(merged.record.firstMeal).toBe('2026-06-05');
  });
});

describe('celebration flow', () => {
  const st = (id: AchievementId, unlocked = true): AchievementStatus => ({
    id,
    unlocked,
    unlockedOn: null,
    progress: null,
    withheld: false,
  });

  it('newlyUnlocked filters seen and locked ones', () => {
    const list = [st('firstMeal'), st('firstWorkout'), st('firstPhoto', false)];
    expect(
      newlyUnlocked(new Set(['firstMeal']), list).map((s) => s.id),
    ).toEqual(['firstWorkout']);
  });

  it('restores silently on a device without a seen set', () => {
    const p = planUnlockPresentation({
      seen: null,
      statuses: [st('firstMeal'), st('firstWorkout'), st('firstPhoto', false)],
      celebratedToday: 0,
      celebratedThisOpen: 0,
    });
    expect(p.celebrate).toEqual([]);
    expect(p.restoredCount).toBe(2);
    expect(p.markSeen.sort()).toEqual(['firstMeal', 'firstWorkout']);
  });

  it('celebrates one stamp per open and stacks the rest', () => {
    const p = planUnlockPresentation({
      seen: new Set(),
      statuses: [st('firstMeal'), st('firstWorkout'), st('firstPhoto')],
      celebratedToday: 0,
      celebratedThisOpen: 0,
    });
    expect(p.celebrate.map((s) => s.id)).toEqual(['firstMeal']);
    expect(p.stacked.map((s) => s.id)).toEqual(['firstWorkout', 'firstPhoto']);
    expect(p.markSeen).toEqual(['firstMeal']);
  });

  it('respects the per-open and per-day limits', () => {
    const base = { seen: new Set<string>(), statuses: [st('firstMeal')] };
    expect(
      planUnlockPresentation({
        ...base,
        celebratedToday: 0,
        celebratedThisOpen: 1,
      }).celebrate,
    ).toEqual([]);
    expect(
      planUnlockPresentation({
        ...base,
        celebratedToday: 2,
        celebratedThisOpen: 0,
      }).celebrate,
    ).toEqual([]);
    const limited = planUnlockPresentation({
      ...base,
      celebratedToday: 2,
      celebratedThisOpen: 0,
    });
    expect(limited.stacked.map((s) => s.id)).toEqual(['firstMeal']);
    expect(
      planUnlockPresentation({
        ...base,
        celebratedToday: 1,
        celebratedThisOpen: 0,
      }).celebrate,
    ).toHaveLength(1);
  });

  it('has nothing to do when everything is seen', () => {
    const p = planUnlockPresentation({
      seen: new Set(['firstMeal']),
      statuses: [st('firstMeal')],
      celebratedToday: 0,
      celebratedThisOpen: 0,
    });
    expect(p.celebrate).toEqual([]);
    expect(p.stacked).toEqual([]);
    expect(p.markSeen).toEqual([]);
  });
});
