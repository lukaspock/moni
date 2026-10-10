import { shiftIsoDate } from './adaptive';
import {
  ctx,
  day,
  GOALS,
  makeWeek,
  rhythmWeek,
  weakWeek,
  ws,
  WEEK0,
} from './ledgerFixtures';
import {
  addPause,
  addPauseDetailed,
  classifyDay,
  computeRhythm,
  computeWeekRings,
  dayGlyph,
  defaultWeekGoals,
  isoWeekNumber,
  isPausedOn,
  isPlannedRestDay,
  pauseDateSet,
  proratedGoal,
  removePause,
  weekStartFor,
  weekdayOfIso,
  type LedgerDay,
  type PauseRange,
} from './rhythm';

function run(
  days: LedgerDay[],
  today: string,
  extra: { pauses?: PauseRange[]; goals?: typeof GOALS } = {},
) {
  return computeRhythm({
    days,
    today,
    plannedWeekdays: new Set<number>(),
    goalsForWeek: () => extra.goals ?? GOALS,
    pauses: extra.pauses ?? [],
  });
}

/** Wednesday of week n. */
const wed = (n: number) => shiftIsoDate(ws(n), 2);

describe('week helpers', () => {
  it('finds Monday as week start and Sunday when configured', () => {
    expect(weekStartFor('2026-01-05')).toBe('2026-01-05'); // Monday
    expect(weekStartFor('2026-01-11')).toBe('2026-01-05'); // Sunday belongs to the Monday week
    expect(weekStartFor('2026-01-11', 0)).toBe('2026-01-11');
    expect(weekStartFor('2026-01-10', 0)).toBe('2026-01-04');
  });

  it('is stable across DST changes', () => {
    // EU spring forward 2026-03-29, US 2026-03-08, EU fall back 2026-10-25
    expect(weekStartFor('2026-03-29')).toBe('2026-03-23');
    expect(weekStartFor('2026-03-30')).toBe('2026-03-30');
    expect(weekStartFor('2026-03-08')).toBe('2026-03-02');
    expect(weekStartFor('2026-10-25')).toBe('2026-10-19');
  });

  it('computes ISO week numbers around year boundaries', () => {
    expect(isoWeekNumber('2026-01-05')).toBe(2);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
    expect(isoWeekNumber('2020-12-31')).toBe(53);
    expect(isoWeekNumber('2021-01-03')).toBe(53);
    expect(isoWeekNumber('2021-01-04')).toBe(1);
  });

  it('knows weekdays and planned rest days', () => {
    expect(weekdayOfIso('2026-01-04')).toBe(0);
    expect(weekdayOfIso('2026-01-05')).toBe(1);
    const plan = new Set([1, 3, 5]);
    expect(isPlannedRestDay('2026-01-06', plan)).toBe(true); // Tuesday
    expect(isPlannedRestDay('2026-01-05', plan)).toBe(false);
    // no plan known -> no rest-day concession
    expect(isPlannedRestDay('2026-01-06', new Set())).toBe(false);
  });
});

describe('classifyDay', () => {
  const today = '2026-01-14';
  it('counts a workout as kept', () => {
    expect(
      classifyDay(
        day('2026-01-12', { workoutCount: 1 }),
        '2026-01-12',
        ctx(today),
      ),
    ).toBe('kept');
  });
  it('needs two entries for food', () => {
    expect(
      classifyDay(
        day('2026-01-12', { foodLogCount: 1 }),
        '2026-01-12',
        ctx(today),
      ),
    ).toBe('empty');
    expect(
      classifyDay(
        day('2026-01-12', { foodLogCount: 2 }),
        '2026-01-12',
        ctx(today),
      ),
    ).toBe('kept');
  });
  it('does not count a weigh-in alone', () => {
    expect(
      classifyDay(
        day('2026-01-12', { weightLogged: true }),
        '2026-01-12',
        ctx(today),
      ),
    ).toBe('empty');
  });
  it('lets one entry or a confirmation keep a planned rest day', () => {
    const c = ctx(today, { plannedWeekdays: new Set([1, 3, 5]) }); // Mon/Wed/Fri
    expect(
      classifyDay(day('2026-01-13', { foodLogCount: 1 }), '2026-01-13', c),
    ).toBe('kept'); // Tue
    expect(
      classifyDay(day('2026-01-13', { restConfirmed: true }), '2026-01-13', c),
    ).toBe('kept');
    expect(classifyDay(undefined, '2026-01-13', c)).toBe('empty');
    // training day with one entry is not enough
    expect(
      classifyDay(day('2026-01-12', { foodLogCount: 1 }), '2026-01-12', c),
    ).toBe('empty');
  });
  it('distinguishes open (today) / empty (past) / future', () => {
    expect(classifyDay(undefined, today, ctx(today))).toBe('open');
    expect(classifyDay(undefined, '2026-01-10', ctx(today))).toBe('empty');
    expect(classifyDay(undefined, '2026-01-20', ctx(today))).toBe('future');
  });
  it('marks paused days, but real activity wins', () => {
    const c = ctx(today, {
      pausedDates: new Set(['2026-01-10', '2026-01-11']),
    });
    expect(classifyDay(undefined, '2026-01-10', c)).toBe('paused');
    expect(
      classifyDay(day('2026-01-11', { workoutCount: 1 }), '2026-01-11', c),
    ).toBe('kept');
  });
});

describe('dayGlyph', () => {
  it('draws ring for food and slash for training', () => {
    expect(dayGlyph(undefined)).toEqual({
      ring: false,
      slash: false,
      rest: false,
    });
    expect(dayGlyph(day('d', { foodLogCount: 2 }))).toEqual({
      ring: true,
      slash: false,
      rest: false,
    });
    expect(dayGlyph(day('d', { foodLogCount: 2, workoutCount: 1 }))).toEqual({
      ring: true,
      slash: true,
      rest: false,
    });
    expect(dayGlyph(day('d', { workoutCount: 1 }))).toEqual({
      ring: false,
      slash: true,
      rest: false,
    });
  });
  it('shows a confirmed rest day as ring + rest dot, and a single entry on rest days', () => {
    expect(dayGlyph(day('d', { restConfirmed: true }))).toEqual({
      ring: true,
      slash: false,
      rest: true,
    });
    expect(
      dayGlyph(day('d', { foodLogCount: 1 }), { isRestDay: true }).ring,
    ).toBe(true);
    expect(dayGlyph(day('d', { foodLogCount: 1 })).ring).toBe(false);
    // a workout on a "confirmed" rest day is a training day, not a rest day
    expect(
      dayGlyph(day('d', { restConfirmed: true, workoutCount: 1 })).rest,
    ).toBe(false);
  });
});

describe('defaultWeekGoals', () => {
  it('uses the profile value clamped to 1..6', () => {
    expect(
      defaultWeekGoals({
        workoutsPerWeek: 4,
        experience: 'intermediate',
        weeksSinceStart: 10,
      }).trainingDays,
    ).toBe(4);
    expect(
      defaultWeekGoals({
        workoutsPerWeek: 7,
        experience: null,
        weeksSinceStart: 10,
      }).trainingDays,
    ).toBe(6);
    expect(
      defaultWeekGoals({
        workoutsPerWeek: null,
        experience: null,
        weeksSinceStart: 10,
      }).trainingDays,
    ).toBe(3);
  });
  it('switches the training ring off for 0 workouts per week', () => {
    expect(
      defaultWeekGoals({
        workoutsPerWeek: 0,
        experience: null,
        weeksSinceStart: 1,
      }).trainingDays,
    ).toBe(0);
  });
  it('caps beginners at 3 during the first 4 weeks only', () => {
    expect(
      defaultWeekGoals({
        workoutsPerWeek: 5,
        experience: 'beginner',
        weeksSinceStart: 3,
      }).trainingDays,
    ).toBe(3);
    expect(
      defaultWeekGoals({
        workoutsPerWeek: 5,
        experience: 'beginner',
        weeksSinceStart: 4,
      }).trainingDays,
    ).toBe(5);
    expect(
      defaultWeekGoals({
        workoutsPerWeek: 2,
        experience: 'beginner',
        weeksSinceStart: 0,
      }).trainingDays,
    ).toBe(2);
  });
  it('has fixed food/protein defaults', () => {
    const g = defaultWeekGoals({
      workoutsPerWeek: 3,
      experience: null,
      weeksSinceStart: 9,
    });
    expect(g.foodDays).toBe(5);
    expect(g.proteinDays).toBe(4);
  });
});

describe('proratedGoal', () => {
  it('scales by unpaused days with a minimum of 1', () => {
    expect(proratedGoal(5, 0)).toBe(5);
    expect(proratedGoal(5, 2)).toBe(4); // ceil(25/7)
    expect(proratedGoal(3, 2)).toBe(3); // ceil(15/7)
    expect(proratedGoal(3, 6)).toBe(1);
    expect(proratedGoal(5, 7)).toBe(0);
    expect(proratedGoal(0, 0)).toBe(0);
  });
});

describe('computeWeekRings', () => {
  const week = ws(1);
  const today = shiftIsoDate(week, 10); // week is complete

  it('counts food, training and protein days', () => {
    const r = computeWeekRings(
      makeWeek(week, { food: 5, protein: 4, train: 3 }),
      week,
      GOALS,
      ctx(today),
    );
    expect(r.food).toEqual({ done: 5, goal: 5, closed: true });
    expect(r.training).toEqual({ done: 3, goal: 3, closed: true });
    expect(r.protein).toEqual({ done: 4, goal: 4, closed: true });
    expect(r.closedCount).toBe(3);
    expect(r.isFull).toBe(true);
    expect(r.isRhythmWeek).toBe(true);
    expect(r.isComplete).toBe(true);
    expect(r.isPaused).toBe(false);
  });

  it('is a rhythm week with exactly two closed rings', () => {
    const r = computeWeekRings(
      makeWeek(week, { food: 5, protein: 1, train: 3 }),
      week,
      GOALS,
      ctx(today),
    );
    expect(r.closedCount).toBe(2);
    expect(r.isRhythmWeek).toBe(true);
    expect(r.isFull).toBe(false);
  });

  it('is no rhythm week with one closed ring', () => {
    const r = computeWeekRings(
      makeWeek(week, { food: 5, train: 1 }),
      week,
      GOALS,
      ctx(today),
    );
    expect(r.closedCount).toBe(1);
    expect(r.isRhythmWeek).toBe(false);
  });

  it('ignores days outside the week and entries below 2 for food/protein', () => {
    const days = [
      day(shiftIsoDate(week, -1), { foodLogCount: 3 }),
      day(shiftIsoDate(week, 7), { foodLogCount: 3 }),
      day(week, { foodLogCount: 1, proteinG: 200, targetProteinG: 100 }),
    ];
    const r = computeWeekRings(days, week, GOALS, ctx(today));
    expect(r.food.done).toBe(0);
    expect(r.protein.done).toBe(0);
  });

  it('closes the protein ring at exactly 85 % of the target, not below', () => {
    const at = day(week, {
      foodLogCount: 2,
      proteinG: 85,
      targetProteinG: 100,
    });
    const below = day(shiftIsoDate(week, 1), {
      foodLogCount: 2,
      proteinG: 84.9,
      targetProteinG: 100,
    });
    const r = computeWeekRings([at, below], week, GOALS, ctx(today));
    expect(r.protein.done).toBe(1);
  });

  it('falls back to the current protein target and skips days without any target', () => {
    const d1 = day(week, {
      foodLogCount: 2,
      proteinG: 100,
      targetProteinG: null,
    });
    const withFallback = computeWeekRings(
      [d1],
      week,
      GOALS,
      ctx(today, { fallbackProteinTargetG: 110 }),
    );
    expect(withFallback.protein.done).toBe(1);
    const noTarget = computeWeekRings([d1], week, GOALS, ctx(today));
    expect(noTarget.protein.done).toBe(0);
  });

  it('does not cap rings (over-achievement stays open upward)', () => {
    const r = computeWeekRings(
      makeWeek(week, { food: 7, protein: 7, train: 5 }),
      week,
      GOALS,
      ctx(today),
    );
    expect(r.food.done).toBe(7);
    expect(r.training?.done).toBe(5);
    expect(r.training?.closed).toBe(true);
  });

  it('counts several workouts on one day as one training day', () => {
    const r = computeWeekRings(
      [day(week, { workoutCount: 3 })],
      week,
      GOALS,
      ctx(today),
    );
    expect(r.training?.done).toBe(1);
  });

  it('prorates goals for paused days', () => {
    const paused = new Set([shiftIsoDate(week, 5), shiftIsoDate(week, 6)]);
    const r = computeWeekRings(
      makeWeek(week, { food: 4, protein: 3, train: 0 }),
      week,
      GOALS,
      ctx(today, { pausedDates: paused }),
    );
    expect(r.food.goal).toBe(4);
    expect(r.food.closed).toBe(true);
    expect(r.protein.goal).toBe(3);
    expect(r.training?.goal).toBe(3);
  });

  it('marks a fully paused week and never makes it a rhythm week', () => {
    const paused = new Set(
      Array.from({ length: 7 }, (_, i) => shiftIsoDate(week, i)),
    );
    const r = computeWeekRings(
      [],
      week,
      GOALS,
      ctx(today, { pausedDates: paused }),
    );
    expect(r.isPaused).toBe(true);
    expect(r.isRhythmWeek).toBe(false);
    expect(r.isFull).toBe(false);
  });

  it('hides the training ring and needs both remaining rings when it is off', () => {
    const goals = { ...GOALS, trainingDays: 0 };
    const both = computeWeekRings(
      makeWeek(week, { food: 5, protein: 4 }),
      week,
      goals,
      ctx(today),
    );
    expect(both.training).toBeNull();
    expect(both.isRhythmWeek).toBe(true);
    expect(both.isFull).toBe(true);
    const one = computeWeekRings(
      makeWeek(week, { food: 5, protein: 0 }),
      week,
      goals,
      ctx(today),
    );
    expect(one.closedCount).toBe(1);
    expect(one.isRhythmWeek).toBe(false);
  });

  it('is incomplete while the week is running', () => {
    const r = computeWeekRings([], week, GOALS, ctx(shiftIsoDate(week, 6)));
    expect(r.isComplete).toBe(false);
    expect(
      computeWeekRings([], week, GOALS, ctx(shiftIsoDate(week, 7))).isComplete,
    ).toBe(true);
  });

  it('shows empty rings with goals, never an error state, for a week without data', () => {
    const r = computeWeekRings([], week, GOALS, ctx(shiftIsoDate(week, 2)));
    expect(r.food).toEqual({ done: 0, goal: 5, closed: false });
    expect(r.closedCount).toBe(0);
  });
});

describe('computeRhythm', () => {
  it('starts with nothing', () => {
    const s = run([], wed(5));
    expect(s.current).toBe(0);
    expect(s.best).toBe(0);
    expect(s.lifetimeWeeks).toBe(0);
    expect(s.graceTokens).toBe(1);
    expect(s.lastWeekOutcome).toBe('none');
    expect(s.weeks).toEqual([]);
  });

  it('counts consecutive rhythm weeks', () => {
    const days = [0, 1, 2].flatMap((n) => rhythmWeek(ws(n)));
    const s = run(days, wed(3));
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.lifetimeWeeks).toBe(3);
    expect(s.lastWeekOutcome).toBe('rhythm');
    expect(s.weeks.map((w) => w.outcome)).toEqual([
      'rhythm',
      'rhythm',
      'rhythm',
    ]);
  });

  it('does not let the running week change the value, only thisWeek', () => {
    const days = [...rhythmWeek(ws(0)), ...rhythmWeek(ws(1))];
    const s = run(days, shiftIsoDate(ws(1), 8)); // week 1 not complete? ws(1)+8 is in week 2
    expect(s.current).toBe(2);
    const inWeek = run(days, shiftIsoDate(ws(1), 6)); // Sunday of week 1 -> week 1 still running
    expect(inWeek.current).toBe(1);
    expect(inWeek.thisWeek).toBe('in-rhythm');
  });

  it('spends the starting grace token on the first weak week and keeps the rhythm', () => {
    const days = [
      ...rhythmWeek(ws(0)),
      ...rhythmWeek(ws(1)),
      ...weakWeek(ws(2)),
    ];
    const s = run(days, wed(3));
    expect(s.current).toBe(2);
    expect(s.graceTokens).toBe(0);
    expect(s.lastWeekOutcome).toBe('grace');
    expect(s.weeksWithGrace).toEqual([ws(2)]);
  });

  it('breaks after a second weak week without tokens and remembers the best', () => {
    const days = [
      ...rhythmWeek(ws(0)),
      ...rhythmWeek(ws(1)),
      ...weakWeek(ws(2)),
      ...weakWeek(ws(3)),
    ];
    const s = run(days, wed(4));
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
    expect(s.lifetimeWeeks).toBe(2);
    expect(s.lastWeekOutcome).toBe('broken');
  });

  it('keeps lifetime weeks after a break and continues counting', () => {
    const days = [
      ...rhythmWeek(ws(0)),
      ...weakWeek(ws(1)),
      ...weakWeek(ws(2)), // broken
      ...rhythmWeek(ws(3)),
    ];
    const s = run(days, wed(4));
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
    expect(s.lifetimeWeeks).toBe(2);
  });

  it('earns a grace token every 4 consecutive rhythm weeks, max 2', () => {
    const four = [0, 1, 2, 3].flatMap((n) => rhythmWeek(ws(n)));
    expect(run(four, wed(4)).graceTokens).toBe(2);
    const twelve = Array.from({ length: 12 }, (_, n) =>
      rhythmWeek(ws(n)),
    ).flat();
    expect(run(twelve, wed(12)).graceTokens).toBe(2);
    const three = [0, 1, 2].flatMap((n) => rhythmWeek(ws(n)));
    expect(run(three, wed(3)).graceTokens).toBe(1);
  });

  it('restarts the token progress after a break', () => {
    // 3 rhythm weeks, 2 weak (grace, then break), 3 rhythm weeks: never reaches 4 in a row
    const days = [
      ...[0, 1, 2].flatMap((n) => rhythmWeek(ws(n))),
      ...weakWeek(ws(3)),
      ...weakWeek(ws(4)),
      ...[5, 6, 7].flatMap((n) => rhythmWeek(ws(n))),
    ];
    const s = run(days, wed(8));
    expect(s.current).toBe(3);
    expect(s.graceTokens).toBe(0);
  });

  it('does not burn a grace token while the rhythm is still 0 (idle)', () => {
    const days = [...weakWeek(ws(0)), ...weakWeek(ws(1)), ...rhythmWeek(ws(2))];
    const s = run(days, wed(3));
    expect(s.weeks.map((w) => w.outcome)).toEqual(['idle', 'idle', 'rhythm']);
    expect(s.graceTokens).toBe(1);
    expect(s.current).toBe(1);
  });

  it('reports "none" as last outcome after an idle week', () => {
    expect(run(weakWeek(ws(0)), wed(1)).lastWeekOutcome).toBe('none');
  });

  it('skips fully paused weeks (neither plus nor break)', () => {
    const pauseWeek: PauseRange = { from: ws(1), to: shiftIsoDate(ws(1), 6) };
    const days = [...rhythmWeek(ws(0)), ...rhythmWeek(ws(2))];
    const s = run(days, wed(3), { pauses: [pauseWeek] });
    expect(s.current).toBe(2);
    expect(s.lifetimeWeeks).toBe(2);
    expect(s.graceTokens).toBe(1);
    expect(s.weeks.map((w) => w.outcome)).toEqual([
      'rhythm',
      'paused',
      'rhythm',
    ]);
  });

  it('reports paused as last outcome', () => {
    const pause: PauseRange = { from: ws(1), to: shiftIsoDate(ws(1), 6) };
    expect(
      run(rhythmWeek(ws(0)), wed(2), { pauses: [pause] }).lastWeekOutcome,
    ).toBe('paused');
  });

  it('lets a partially paused week reach rhythm with prorated goals', () => {
    // 3 paused days -> goals food ceil(5*4/7)=3, training ceil(3*4/7)=2
    const pause: PauseRange = {
      from: shiftIsoDate(ws(1), 4),
      to: shiftIsoDate(ws(1), 6),
    };
    const d = (i: number, p: Partial<LedgerDay>) =>
      day(shiftIsoDate(ws(1), i), p);
    const days = [
      ...rhythmWeek(ws(0)),
      d(0, { foodLogCount: 2, workoutCount: 1 }),
      d(1, { foodLogCount: 2, workoutCount: 1 }),
      d(2, { foodLogCount: 2 }),
    ];
    const s = run(days, wed(2), { pauses: [pause] });
    expect(s.weeks[1].outcome).toBe('rhythm');
    expect(s.current).toBe(2);
  });

  it('counts a back-filled past week fully (late entries recompute everything)', () => {
    const base = [
      ...rhythmWeek(ws(0)),
      ...weakWeek(ws(1)),
      ...rhythmWeek(ws(2)),
    ];
    expect(run(base, wed(3)).graceTokens).toBe(0); // week 1 used the token
    const filled = [
      ...rhythmWeek(ws(0)),
      ...rhythmWeek(ws(1)),
      ...rhythmWeek(ws(2)),
    ];
    const s = run(filled, wed(3));
    expect(s.current).toBe(3);
    expect(s.graceTokens).toBe(1);
  });

  it('starts replay at the first active day, not at the epoch', () => {
    const s = run(rhythmWeek(ws(10)), wed(11));
    expect(s.weeks).toHaveLength(1);
    expect(s.current).toBe(1);
  });

  it('treats weight-only weeks as activity but never as a rhythm week', () => {
    const s = run([day(ws(0), { weightLogged: true })], wed(1));
    expect(s.weeks).toHaveLength(1);
    expect(s.current).toBe(0);
  });

  it('classifies thisWeek: in-rhythm / in-reach / open', () => {
    const base = rhythmWeek(ws(0));
    // in-rhythm: rings closed this week
    expect(
      run([...base, ...rhythmWeek(ws(1))], shiftIsoDate(ws(1), 6)).thisWeek,
    ).toBe('in-rhythm');
    // in-reach: training closed (3), food 3 on Thursday, 4 days left
    const reach = [0, 1, 2].map((i) =>
      day(shiftIsoDate(ws(1), i), { foodLogCount: 2, workoutCount: 1 }),
    );
    expect(run([...base, ...reach], shiftIsoDate(ws(1), 3)).thisWeek).toBe(
      'in-reach',
    );
    // open: nothing yet
    expect(run(base, wed(1)).thisWeek).toBe('open');
    // open: one ring closed but nothing else can still close on Sunday
    const hopeless = [0, 1, 2].map((i) =>
      day(shiftIsoDate(ws(1), i), { workoutCount: 1 }),
    );
    expect(run([...base, ...hopeless], shiftIsoDate(ws(1), 6)).thisWeek).toBe(
      'open',
    );
  });

  it('exposes this week rings and honours a Sunday week start for the replay', () => {
    const s = run(rhythmWeek(ws(0)), wed(0));
    expect(s.thisWeekRings.weekStart).toBe(ws(0));
    const sun = computeRhythm({
      days: rhythmWeek(ws(0)),
      today: wed(2),
      plannedWeekdays: new Set(),
      goalsForWeek: () => GOALS,
      pauses: [],
      weekStartsOn: 0,
    });
    expect(sun.thisWeekRings.weekStart).toBe(shiftIsoDate(ws(2), -1));
  });

  it('is deterministic and does not mutate its input', () => {
    const days = [...rhythmWeek(ws(0)), ...weakWeek(ws(1))];
    const copy = JSON.stringify(days);
    const a = run(days, wed(2));
    const b = run(days, wed(2));
    expect(a).toEqual(b);
    expect(JSON.stringify(days)).toBe(copy);
  });
});

describe('pause mode', () => {
  const today = '2026-02-10';

  it('adds a simple range', () => {
    const r = addPauseDetailed(
      [],
      { from: '2026-02-10', to: '2026-02-14' },
      today,
    );
    expect(r.pauses).toEqual([{ from: '2026-02-10', to: '2026-02-14' }]);
    expect(r.limited).toBe(false);
  });

  it('accepts a future pause and swaps reversed ranges', () => {
    expect(
      addPause([], { from: '2026-02-20', to: '2026-02-15' }, today),
    ).toEqual([{ from: '2026-02-15', to: '2026-02-20' }]);
  });

  it('caps one pause at 21 days', () => {
    const r = addPauseDetailed(
      [],
      { from: '2026-02-10', to: '2026-04-30' },
      today,
    );
    expect(r.pauses).toEqual([{ from: '2026-02-10', to: '2026-03-02' }]);
    expect(r.limited).toBe(true);
    expect(pauseDateSet(r.pauses).size).toBe(21);
  });

  it('allows retroactive pauses up to 7 days', () => {
    const r = addPauseDetailed(
      [],
      { from: '2026-02-01', to: '2026-02-04' },
      today,
    );
    expect(r.pauses[0].from).toBe('2026-02-03');
    expect(r.limited).toBe(true);
    const none = addPauseDetailed(
      [],
      { from: '2026-01-01', to: '2026-01-10' },
      today,
    );
    expect(none.pauses).toEqual([]);
    expect(none.added).toBeNull();
  });

  it('merges overlapping and adjacent ranges', () => {
    const first = addPause([], { from: '2026-02-10', to: '2026-02-12' }, today);
    const second = addPause(
      first,
      { from: '2026-02-13', to: '2026-02-15' },
      today,
    );
    expect(second).toEqual([{ from: '2026-02-10', to: '2026-02-15' }]);
    const third = addPause(
      second,
      { from: '2026-02-12', to: '2026-02-18' },
      today,
    );
    expect(third).toEqual([{ from: '2026-02-10', to: '2026-02-18' }]);
    const apart = addPause(
      third,
      { from: '2026-02-25', to: '2026-02-26' },
      today,
    );
    expect(apart).toHaveLength(2);
  });

  it('limits to 42 paused days per rolling year', () => {
    let pauses: PauseRange[] = [];
    pauses = addPause(
      pauses,
      { from: '2025-09-10', to: '2025-09-30' },
      '2025-09-10',
    ); // 21 days
    pauses = addPause(
      pauses,
      { from: '2025-11-01', to: '2025-11-21' },
      '2025-11-01',
    ); // 21 days
    expect(pauseDateSet(pauses).size).toBe(42);
    const r = addPauseDetailed(
      pauses,
      { from: '2026-02-10', to: '2026-02-14' },
      today,
    );
    expect(r.added).toBeNull();
    expect(r.limited).toBe(true);
    expect(pauseDateSet(r.pauses).size).toBe(42);
  });

  it('trims a request to the remaining yearly budget', () => {
    const pauses = addPause(
      [],
      { from: '2025-10-01', to: '2025-10-21' },
      '2025-10-01',
    );
    const more = addPause(
      pauses,
      { from: '2025-12-01', to: '2025-12-20' },
      '2025-12-01',
    ); // 20 days -> 41
    const r = addPauseDetailed(
      more,
      { from: '2026-02-10', to: '2026-02-14' },
      today,
    );
    expect(r.added).toEqual({ from: '2026-02-10', to: '2026-02-10' });
    expect(r.limited).toBe(true);
  });

  it('forgets pause days older than a year for the budget', () => {
    const old = addPause(
      [],
      { from: '2024-01-01', to: '2024-01-21' },
      '2024-01-01',
    );
    const old2 = addPause(
      old,
      { from: '2024-03-01', to: '2024-03-21' },
      '2024-03-01',
    );
    const r = addPauseDetailed(
      old2,
      { from: '2026-02-10', to: '2026-02-14' },
      today,
    );
    expect(r.limited).toBe(false);
    expect(r.added).toEqual({ from: '2026-02-10', to: '2026-02-14' });
  });

  it('removes a range or part of one', () => {
    const base: PauseRange[] = [{ from: '2026-02-10', to: '2026-02-20' }];
    expect(removePause(base, { from: '2026-02-12', to: '2026-02-14' })).toEqual(
      [
        { from: '2026-02-10', to: '2026-02-11' },
        { from: '2026-02-15', to: '2026-02-20' },
      ],
    );
    expect(removePause(base, { from: '2026-02-01', to: '2026-03-01' })).toEqual(
      [],
    );
  });

  it('checks inclusive coverage', () => {
    const p: PauseRange[] = [{ from: '2026-02-10', to: '2026-02-12' }];
    expect(isPausedOn(p, '2026-02-10')).toBe(true);
    expect(isPausedOn(p, '2026-02-12')).toBe(true);
    expect(isPausedOn(p, '2026-02-13')).toBe(false);
  });

  it('survives corrupt ranges without hanging', () => {
    expect(pauseDateSet([{ from: '2026-03-01', to: '2026-02-01' }]).size).toBe(
      0,
    );
    expect(
      pauseDateSet([{ from: '2000-01-01', to: '2999-12-31' }]).size,
    ).toBeLessThanOrEqual(400);
  });

  it('is exported alongside a Monday fixture sanity check', () => {
    expect(weekdayOfIso(WEEK0)).toBe(1);
  });
});
