import {
  daySentence,
  daysAwayFrom,
  greetingSlot,
  nextBestStep,
  variantFor,
  welcomeBackKind,
  type DaySentenceContext,
  type NextStepContext,
} from './rituals';

describe('greetingSlot', () => {
  it.each([
    [0, 'night'],
    [4, 'night'],
    [5, 'morning'],
    [9, 'morning'],
    [10, 'midday'],
    [13, 'midday'],
    [14, 'afternoon'],
    [17, 'afternoon'],
    [18, 'evening'],
    [21, 'evening'],
    [22, 'night'],
    [23, 'night'],
  ])('hour %i is %s', (hour, slot) => {
    expect(greetingSlot(hour)).toBe(slot);
  });
  it('is robust against out-of-range hours', () => {
    expect(greetingSlot(24)).toBe('night');
    expect(greetingSlot(29)).toBe('morning');
    expect(greetingSlot(-1)).toBe('night');
  });
});

describe('variantFor', () => {
  it('rotates through three variants', () => {
    expect([1, 2, 3, 4].map(variantFor)).toEqual([1, 2, 0, 1]);
  });
});

const sentenceBase: DaySentenceContext = {
  slot: 'afternoon',
  weekday: 3,
  dayOfYear: 10,
  isTrainingDay: false,
  workoutDone: false,
  eatenKcal: 800,
  limitKcal: 2000,
  proteinEaten: 60,
  proteinTarget: 150,
  rhythmJustReached: false,
  daysAway: 0,
  flagged: false,
};
const s = (over: Partial<DaySentenceContext> = {}) =>
  daySentence({ ...sentenceBase, ...over });

describe('daySentence', () => {
  it('stays silent when the care signal is active, whatever else applies', () => {
    expect(s({ flagged: true, workoutDone: true, daysAway: 9 })).toBeNull();
  });

  it('welcomes back after 3+ days, before anything else', () => {
    expect(s({ daysAway: 3, workoutDone: true })?.key).toBe('welcomeBack');
    expect(s({ daysAway: 2 })?.key).not.toBe('welcomeBack');
  });

  it('uses a calm, number-free sentence at night', () => {
    expect(s({ slot: 'night', workoutDone: true })?.key).toBe('night');
  });

  it('bridges to food after a workout with little protein', () => {
    expect(s({ workoutDone: true, proteinEaten: 80 })?.key).toBe(
      'bridgeToFood',
    ); // 53 %
    expect(s({ workoutDone: true, proteinEaten: 90 })?.key).toBe(
      'trainingGrewLimit',
    ); // exactly 60 %
  });

  it('prefers training day over rest day logic', () => {
    expect(s({ isTrainingDay: true })?.key).toBe('trainingDay');
    expect(s({ isTrainingDay: false })?.key).toBe('restDay');
  });

  it('keeps the rest-day sentence out of the evening', () => {
    expect(s({ slot: 'evening', eatenKcal: 1000 })?.key).toBe('default');
  });

  it('calls a balanced evening "balanced" within 90–115 %, two-sided', () => {
    const ev = { slot: 'evening' as const };
    expect(s({ ...ev, eatenKcal: 1800 })?.key).toBe('balanced');
    expect(s({ ...ev, eatenKcal: 2299 })?.key).toBe('balanced');
    expect(s({ ...ev, eatenKcal: 2300 })?.key).not.toBe('balanced');
    expect(s({ ...ev, eatenKcal: 1799 })?.key).not.toBe('balanced');
    expect(s({ ...ev, eatenKcal: 500 })?.key).not.toBe('balanced');
  });

  it('announces the reached rhythm week, then weekday variants, then the default', () => {
    const ev = { slot: 'evening' as const, eatenKcal: 500 };
    expect(s({ ...ev, rhythmJustReached: true })?.key).toBe('rhythmReached');
    expect(s({ ...ev, weekday: 1 })?.key).toBe('monday');
    expect(s({ ...ev, weekday: 5 })?.key).toBe('friday');
    expect(s({ ...ev, weekday: 0 })?.key).toBe('sunday');
    expect(s({ ...ev, weekday: 2 })?.key).toBe('default');
  });

  it('handles a missing limit or protein target without dividing by zero', () => {
    expect(s({ workoutDone: true, proteinTarget: 0 })?.key).toBe(
      'trainingGrewLimit',
    );
    expect(s({ slot: 'evening', limitKcal: 0 })?.key).toBe('default');
  });

  it('rotates the variant by day of year', () => {
    expect(s({ dayOfYear: 3 })?.variant).toBe(0);
    expect(s({ dayOfYear: 4 })?.variant).toBe(1);
    expect(s({ dayOfYear: 5 })?.variant).toBe(2);
  });
});

const stepBase: NextStepContext = {
  flagged: false,
  hasWeight: true,
  daysSinceWeight: 2,
  weighInReminderEnabled: true,
  hour: 15,
  weekday: 3,
  isTrainingDay: false,
  workoutDoneToday: false,
  hoursSinceWorkoutEnd: null,
  proteinEaten: 100,
  proteinTarget: 150,
  foodLogCount: 2,
  meals: { breakfast: 1, lunch: 1 },
  dayClosed: false,
  weeklyReviewUnseen: false,
};
const n = (over: Partial<NextStepContext> = {}) =>
  nextBestStep({ ...stepBase, ...over });

describe('nextBestStep', () => {
  it('shows nothing under the care signal', () => {
    expect(n({ flagged: true, hasWeight: false })).toEqual({ kind: 'none' });
  });

  it('asks for a first weight before anything else', () => {
    expect(n({ hasWeight: false, isTrainingDay: true, hour: 9 }).kind).toBe(
      'logWeight',
    );
  });

  it('suggests the protein bridge within 3 h after a workout', () => {
    const base = {
      workoutDoneToday: true,
      proteinEaten: 50,
      hoursSinceWorkoutEnd: 1,
    };
    expect(n(base).kind).toBe('proteinBridge');
    expect(n({ ...base, hoursSinceWorkoutEnd: 3.5 }).kind).toBe('none');
    expect(n({ ...base, proteinEaten: 100 }).kind).toBe('none');
  });

  it('suggests starting the workout on training days between 07 and 20', () => {
    const t = { isTrainingDay: true };
    expect(n({ ...t, hour: 7 }).kind).toBe('startWorkout');
    expect(n({ ...t, hour: 19 }).kind).toBe('startWorkout');
    expect(n({ ...t, hour: 6, meals: { breakfast: 1, lunch: 1 } }).kind).toBe(
      'none',
    );
    expect(n({ ...t, hour: 20, foodLogCount: 0 }).kind).toBe('none');
    expect(n({ ...t, workoutDoneToday: true, proteinEaten: 150 }).kind).toBe(
      'none',
    );
  });

  it('suggests the meal that fits the slot', () => {
    expect(n({ hour: 8, meals: { breakfast: 0, lunch: 0 } })).toEqual({
      kind: 'logMeal',
      mealType: 'breakfast',
    });
    expect(n({ hour: 12, meals: { breakfast: 1, lunch: 0 } })).toEqual({
      kind: 'logMeal',
      mealType: 'lunch',
    });
    expect(n({ hour: 12, meals: { breakfast: 0, lunch: 1 } }).kind).toBe(
      'none',
    );
  });

  it('suggests closing the day in the evening after 20:00', () => {
    expect(n({ hour: 20, foodLogCount: 2 }).kind).toBe('closeDay');
    expect(n({ hour: 20, foodLogCount: 1 }).kind).toBe('none');
    expect(n({ hour: 20, dayClosed: true }).kind).toBe('none');
    expect(n({ hour: 19, foodLogCount: 3 }).kind).toBe('none');
  });

  it('points to the weekly review on Sunday after 17:00', () => {
    expect(n({ weekday: 0, hour: 17, weeklyReviewUnseen: true }).kind).toBe(
      'weeklyReview',
    );
    expect(n({ weekday: 0, hour: 16, weeklyReviewUnseen: true }).kind).toBe(
      'none',
    );
    expect(n({ weekday: 0, hour: 18, weeklyReviewUnseen: false }).kind).toBe(
      'none',
    );
  });

  it('reminds to weigh on Monday only when enabled and 7+ days ago', () => {
    expect(n({ weekday: 1, daysSinceWeight: 7 }).kind).toBe('logWeight');
    expect(n({ weekday: 1, daysSinceWeight: 6 }).kind).toBe('none');
    expect(
      n({ weekday: 1, daysSinceWeight: 9, weighInReminderEnabled: false }).kind,
    ).toBe('none');
    expect(n({ weekday: 3, daysSinceWeight: 30 }).kind).toBe('none');
  });

  it('hides the card instead of filling it', () => {
    expect(n()).toEqual({ kind: 'none' });
  });

  it('follows the priority order', () => {
    // training day + missing breakfast: workout first
    expect(
      n({ hour: 9, isTrainingDay: true, meals: { breakfast: 0, lunch: 0 } })
        .kind,
    ).toBe('startWorkout');
  });
});

describe('welcomeBackKind', () => {
  it.each([
    [0, 'none'],
    [2, 'none'],
    [3, 'short'],
    [6, 'short'],
    [7, 'medium'],
    [20, 'medium'],
    [21, 'long'],
    [90, 'long'],
  ] as const)('%i days away -> %s', (days, kind) => {
    expect(welcomeBackKind(days, null)).toBe(kind);
  });

  it('is not shown again right after it was shown', () => {
    expect(welcomeBackKind(10, 0)).toBe('none');
    expect(welcomeBackKind(10, 2)).toBe('none');
    expect(welcomeBackKind(10, 3)).toBe('medium');
    expect(welcomeBackKind(Number.NaN, null)).toBe('none');
  });
});

describe('daysAwayFrom', () => {
  it('counts whole days and is never negative', () => {
    expect(daysAwayFrom('2026-01-01', '2026-01-04')).toBe(3);
    expect(daysAwayFrom('2026-03-28', '2026-03-30')).toBe(2); // across EU DST
    expect(daysAwayFrom('2026-01-05', '2026-01-01')).toBe(0);
    expect(daysAwayFrom(null, '2026-01-01')).toBe(0);
  });
});
