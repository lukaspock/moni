import { shiftIsoDate } from './adaptive';
import {
  ctx,
  day,
  GOALS,
  makeWeek,
  rhythmWeek,
  weakWeek,
  ws,
} from './ledgerFixtures';
import { computeRhythm, computeWeekRings, type LedgerDay } from './rhythm';
import {
  buildWeeklyReview,
  pickHighlight,
  trainingGoalSuggestion,
  weekTitle,
  type WeeklyReviewInput,
} from './weeklyReview';

const today = (n: number) => shiftIsoDate(ws(n), 9);

function rhythmOf(
  days: LedgerDay[],
  t: string,
  pauses = [] as { from: string; to: string }[],
) {
  return computeRhythm({
    days,
    today: t,
    plannedWeekdays: new Set(),
    goalsForWeek: () => GOALS,
    pauses,
  });
}

function input(
  days: LedgerDay[],
  week: string,
  over: Partial<WeeklyReviewInput> = {},
): WeeklyReviewInput {
  const t = shiftIsoDate(week, 9);
  const rhythm = rhythmOf(days, t);
  return {
    weekStart: week,
    days,
    rings: computeWeekRings(days, week, GOALS, ctx(t)),
    rhythm,
    plannedWeekdays: new Set(),
    prs: [],
    comparison: null,
    weight: null,
    nextGoals: GOALS,
    careFlagged: false,
    ...over,
  };
}

describe('weekTitle', () => {
  const rings = (days: LedgerDay[], week = ws(0), paused: string[] = []) =>
    computeWeekRings(
      days,
      week,
      GOALS,
      ctx(today(0), { pausedDates: new Set(paused) }),
    );

  it('is "full" when every ring is closed', () => {
    const days = makeWeek(ws(0), { food: 5, protein: 4, train: 3 });
    expect(weekTitle({ rings: rings(days), days, previousOutcome: null })).toBe(
      'full',
    );
  });

  it('is "strength" with 3+ strength days', () => {
    const days = makeWeek(ws(0), { food: 2, train: 3, strength: true });
    expect(weekTitle({ rings: rings(days), days, previousOutcome: null })).toBe(
      'strength',
    );
  });

  it('is "recovery" with <= 1 training day and food ok', () => {
    const days = makeWeek(ws(0), { food: 5, train: 1 });
    expect(weekTitle({ rings: rings(days), days, previousOutcome: null })).toBe(
      'recovery',
    );
  });

  it('is "restart" for the first rhythm week after a pause', () => {
    const days = makeWeek(ws(0), {
      food: 5,
      train: 3,
      protein: 0,
      strength: false,
    });
    expect(
      weekTitle({ rings: rings(days), days, previousOutcome: 'paused' }),
    ).toBe('restart');
    expect(
      weekTitle({ rings: rings(days), days, previousOutcome: 'rhythm' }),
    ).toBe('quiet');
  });

  it('falls back to "quiet" and never calls a calm week bad', () => {
    const days = makeWeek(ws(0), { food: 2, train: 2, strength: false });
    expect(weekTitle({ rings: rings(days), days, previousOutcome: null })).toBe(
      'quiet',
    );
  });
});

describe('pickHighlight', () => {
  const week = [
    day('2026-01-05', {
      longestWorkoutMin: 40,
      proteinG: 120,
      firstLogHour: 9,
    }),
    day('2026-01-06', {
      longestWorkoutMin: 70,
      proteinG: 160,
      firstLogHour: 7,
    }),
  ];

  it('prefers a PR, then the longest workout, then the best protein day, then the earliest entry', () => {
    expect(
      pickHighlight(week, [
        { exerciseId: 'a', gainKg: 2 },
        { exerciseId: 'b', gainKg: 5 },
      ]),
    ).toEqual({
      kind: 'pr',
      exerciseId: 'b',
      gainKg: 5,
    });
    expect(pickHighlight(week, [])).toEqual({
      kind: 'longestWorkout',
      date: '2026-01-06',
      minutes: 70,
    });
    const noWorkout = week.map((d) => ({ ...d, longestWorkoutMin: 0 }));
    expect(pickHighlight(noWorkout, [])).toEqual({
      kind: 'bestProteinDay',
      date: '2026-01-06',
      proteinG: 160,
    });
    const noProtein = noWorkout.map((d) => ({ ...d, proteinG: 0 }));
    expect(pickHighlight(noProtein, [])).toEqual({
      kind: 'earliestEntry',
      date: '2026-01-06',
      hour: 7,
    });
    expect(pickHighlight([], [])).toBeNull();
  });
});

describe('trainingGoalSuggestion', () => {
  const weeksOf = (days: LedgerDay[], t: string) => rhythmOf(days, t).weeks;

  it('suggests lowering after two completed weeks without a closed training ring', () => {
    const days = [
      ...makeWeek(ws(0), { food: 5, train: 1 }),
      ...makeWeek(ws(1), { food: 5, train: 2 }),
    ];
    expect(trainingGoalSuggestion(weeksOf(days, today(2)))).toBe('lower');
  });

  it('keeps the goal when the last week closed the ring', () => {
    const days = [
      ...makeWeek(ws(0), { food: 5, train: 1 }),
      ...rhythmWeek(ws(1)),
    ];
    expect(trainingGoalSuggestion(weeksOf(days, today(2)))).toBe('keep');
  });

  it('suggests raising after four weeks of exceeding the goal', () => {
    const days = [0, 1, 2, 3].flatMap((n) =>
      makeWeek(ws(n), { food: 5, train: 4 }),
    );
    expect(trainingGoalSuggestion(weeksOf(days, today(3)))).toBe('raise');
  });

  it('ignores paused weeks and has nothing to say without history', () => {
    expect(trainingGoalSuggestion([])).toBe('keep');
    const pause = { from: ws(1), to: shiftIsoDate(ws(1), 6) };
    const days = [
      ...makeWeek(ws(0), { food: 5, train: 1 }),
      ...makeWeek(ws(2), { food: 5, train: 1 }),
    ];
    const weeks = rhythmOf(days, today(3), [pause]).weeks;
    expect(trainingGoalSuggestion(weeks)).toBe('lower');
  });
});

describe('buildWeeklyReview', () => {
  it('returns a quiet result for paused weeks', () => {
    const pause = { from: ws(0), to: shiftIsoDate(ws(0), 6) };
    const days = rhythmWeek(ws(1));
    const t = today(2);
    const rhythm = rhythmOf(days, t, [pause]);
    const r = buildWeeklyReview({
      ...input(days, ws(0)),
      rings: computeWeekRings(
        [],
        ws(0),
        GOALS,
        ctx(t, {
          pausedDates: new Set(
            Array.from({ length: 7 }, (_, i) => shiftIsoDate(ws(0), i)),
          ),
        }),
      ),
      rhythm,
    });
    expect(r.quiet).toBe('paused');
    expect(r.cards).toEqual([]);
  });

  it('returns a quiet result for weeks without data', () => {
    const r = buildWeeklyReview(input(rhythmWeek(ws(1)), ws(0)));
    expect(r.quiet).toBe('noData');
    expect(r.cards).toEqual([]);
  });

  it('builds the core cards for a normal week and skips conditional ones', () => {
    const days = rhythmWeek(ws(0));
    const r = buildWeeklyReview(input(days, ws(0)));
    expect(r.quiet).toBeNull();
    expect(r.cards.map((c) => c.kind)).toEqual([
      'intro',
      'week',
      'highlight',
      'rhythm',
      'outlook',
    ]);
    const intro = r.cards[0];
    expect(intro.kind === 'intro' && intro.weekNumber).toBe(2);
    const week = r.cards[1];
    if (week.kind !== 'week') throw new Error('expected week card');
    expect(week.glyphs).toHaveLength(7);
    expect(week.foodDays).toBe(5);
    expect(week.trainingDays).toBe(3);
    expect(week.avgMealsPerLoggedDay).toBe(2);
  });

  it('adds the connection card only when comparison data exists', () => {
    const cmp = {
      trainingDays: 4,
      restDays: 4,
      avgProteinTrainingG: 141.6,
      avgProteinRestG: 118.2,
      avgKcalTrainingDelta: 0,
      avgKcalRestDelta: 0,
    };
    const r = buildWeeklyReview(
      input(rhythmWeek(ws(0)), ws(0), { comparison: cmp }),
    );
    const card = r.cards.find((c) => c.kind === 'connection');
    expect(card).toMatchObject({
      avgProteinTrainingG: 142,
      avgProteinRestG: 118,
    });
  });

  it('adds the body card only with >= 4 weigh-ins and never under the care signal', () => {
    const days = rhythmWeek(ws(0));
    const has = (over: Partial<WeeklyReviewInput>) =>
      buildWeeklyReview(input(days, ws(0), over)).cards.some(
        (c) => c.kind === 'body',
      );
    expect(has({ weight: { entries: 4, trendDeltaKg: -0.34 } })).toBe(true);
    expect(has({ weight: { entries: 3, trendDeltaKg: -0.3 } })).toBe(false);
    expect(has({ weight: null })).toBe(false);
    expect(
      has({ weight: { entries: 6, trendDeltaKg: -0.3 }, careFlagged: true }),
    ).toBe(false);
  });

  it('marks grace usage and carries the stage on the rhythm card', () => {
    const days = [
      ...rhythmWeek(ws(0)),
      ...weakWeek(ws(1)).concat([
        day(shiftIsoDate(ws(1), 1), { workoutCount: 1 }),
      ]),
    ];
    const r = buildWeeklyReview(input(days, ws(1)));
    const card = r.cards.find((c) => c.kind === 'rhythm');
    expect(card).toMatchObject({
      graceUsed: true,
      stageKey: 'warmup',
      current: 1,
    });
  });

  it('is deterministic', () => {
    const days = rhythmWeek(ws(0));
    expect(buildWeeklyReview(input(days, ws(0)))).toEqual(
      buildWeeklyReview(input(days, ws(0))),
    );
  });
});
