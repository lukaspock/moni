import {
  anchorForSavedCycle,
  baseSlotIndex,
  canPostpone,
  canPullForward,
  clampCycleLength,
  cycleAddDays,
  cycleDaysBetween,
  cycleWeekdayOf,
  effectivePlanForDate,
  effectivePlanRange,
  mondayOf,
  nextTrainingAfter,
  resizeCycle,
  resizeEditorCycle,
  rotateCycle,
  slotsForEditor,
  trainingDayCount,
  weeklyCycleFromWeekdays,
  type CycleSlot,
  type PlanShift,
} from './trainingCycle';

const T = (routineId: string | null): CycleSlot => ({
  kind: 'training',
  routineId,
});
const R: CycleSlot = { kind: 'rest' };

// 2026-10-12 is a Monday.
const MON = '2026-10-12';
// Mo Push · Di Pull · Mi — · Do Legs · Fr — · Sa — · So —
const WEEK: CycleSlot[] = [T('push'), T('pull'), R, T('legs'), R, R, R];

/** Compact view of a range: routine id or '-' for rest. */
function view(
  cycle: CycleSlot[],
  anchor: string,
  shifts: PlanShift[],
  start: string,
  days: number,
): string[] {
  return effectivePlanRange(cycle, anchor, shifts, start, days).map((d) =>
    d.day.kind === 'rest' ? '-' : (d.day.routineId ?? '?'),
  );
}

let idCounter = 0;
function shift(date: string, kind: PlanShift['kind']): PlanShift {
  idCounter += 1;
  return { id: `s${idCounter}`, date, kind };
}

describe('date helpers', () => {
  it('counts days and adds days across months/DST', () => {
    expect(cycleDaysBetween('2026-10-12', '2026-10-19')).toBe(7);
    expect(cycleDaysBetween('2026-10-19', '2026-10-12')).toBe(-7);
    expect(cycleDaysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(cycleAddDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(cycleAddDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('weekday and monday', () => {
    expect(cycleWeekdayOf(MON)).toBe(1);
    expect(cycleWeekdayOf('2026-10-18')).toBe(0);
    expect(mondayOf('2026-10-18')).toBe(MON);
    expect(mondayOf(MON)).toBe(MON);
    expect(mondayOf('2026-10-14')).toBe(MON);
  });

  it('clamps the cycle length', () => {
    expect(clampCycleLength(0)).toBe(1);
    expect(clampCycleLength(99)).toBe(14);
    expect(clampCycleLength(Number.NaN)).toBe(7);
    expect(clampCycleLength(5.4)).toBe(5);
  });
});

describe('effectivePlanForDate without shifts', () => {
  it('repeats the cycle from the anchor', () => {
    expect(view(WEEK, MON, [], MON, 8)).toEqual([
      'push',
      'pull',
      '-',
      'legs',
      '-',
      '-',
      '-',
      'push',
    ]);
  });

  it('reads backwards before the anchor', () => {
    expect(effectivePlanForDate(WEEK, MON, [], '2026-10-11')).toEqual(R);
    expect(effectivePlanForDate(WEEK, MON, [], '2026-10-05')).toEqual(
      T('push'),
    );
    expect(baseSlotIndex(7, MON, '2026-10-08')).toBe(3);
  });

  it('empty cycle is always rest', () => {
    expect(effectivePlanForDate([], MON, [], MON)).toEqual(R);
    expect(canPostpone([], MON, [], MON)).toBe(false);
    expect(canPullForward([], MON, [], MON)).toBe(false);
  });

  it('works with other lengths', () => {
    const cycle = [T('a'), T('b'), R];
    expect(view(cycle, MON, [], MON, 7)).toEqual([
      'a',
      'b',
      '-',
      'a',
      'b',
      '-',
      'a',
    ]);
  });
});

describe('postpone ("Heute nicht")', () => {
  it('owner example: shift is absorbed by the next rest day', () => {
    const shifts = [shift(MON, 'postpone')];
    expect(view(WEEK, MON, shifts, MON, 8)).toEqual([
      '-',
      'push',
      'pull',
      'legs',
      '-',
      '-',
      '-',
      'push',
    ]);
  });

  it('marks only moved days as shifted', () => {
    const range = effectivePlanRange(
      WEEK,
      MON,
      [shift(MON, 'postpone')],
      MON,
      4,
    );
    expect(range.map((d) => d.shifted)).toEqual([true, true, true, false]);
    expect(range[0]!.slotIndex).toBeNull();
    expect(range[1]!.slotIndex).toBe(0);
  });

  it('with the rest day right after: only that day is consumed', () => {
    const shifts = [shift('2026-10-13', 'postpone')]; // Di Pull
    expect(view(WEEK, MON, shifts, MON, 7)).toEqual([
      'push',
      '-',
      'pull',
      'legs',
      '-',
      '-',
      '-',
    ]);
  });

  it('a second rest day in a row stays', () => {
    const shifts = [shift('2026-10-15', 'postpone')]; // Do Legs
    expect(view(WEEK, MON, shifts, MON, 8)).toEqual([
      'push',
      'pull',
      '-',
      '-',
      'legs',
      '-',
      '-',
      'push',
    ]);
  });

  it('no rest day in the cycle: the shift becomes permanent', () => {
    const cycle = [T('a'), T('b'), T('c')];
    const shifts = [shift(MON, 'postpone')];
    expect(view(cycle, MON, shifts, MON, 7)).toEqual([
      '-',
      'a',
      'b',
      'c',
      'a',
      'b',
      'c',
    ]);
  });

  it('two postpones on consecutive days', () => {
    const shifts = [shift(MON, 'postpone'), shift('2026-10-13', 'postpone')];
    // After Mo: - push pull legs - - -; postpone Di (push): rest inserted,
    // absorbed by the rest on Fr.
    expect(view(WEEK, MON, shifts, MON, 8)).toEqual([
      '-',
      '-',
      'push',
      'pull',
      'legs',
      '-',
      '-',
      'push',
    ]);
  });

  it('is ignored on a rest day', () => {
    const shifts = [shift('2026-10-14', 'postpone')];
    expect(view(WEEK, MON, shifts, MON, 7)).toEqual(
      view(WEEK, MON, [], MON, 7),
    );
  });
});

describe('pull forward ("Doch trainieren")', () => {
  it('moves the next training to today, everything after one day earlier', () => {
    const shifts = [shift('2026-10-14', 'pullForward')]; // Mi rest
    expect(view(WEEK, MON, shifts, MON, 9)).toEqual([
      'push',
      'pull',
      'legs',
      '-',
      '-',
      '-',
      'push',
      'pull',
      '-',
    ]);
  });

  it('keeps rest days between today and the pulled training', () => {
    const shifts = [shift('2026-10-16', 'pullForward')]; // Fr rest, then Sa/So rest, Mo push
    expect(view(WEEK, MON, shifts, MON, 10)).toEqual([
      'push',
      'pull',
      '-',
      'legs',
      'push', // Fr ← next Mo
      '-',
      '-',
      'pull', // next Mo ← next Di (−1 from here on)
      '-',
      'legs',
    ]);
  });

  it('is ignored on a training day', () => {
    const shifts = [shift(MON, 'pullForward')];
    expect(view(WEEK, MON, shifts, MON, 7)).toEqual(
      view(WEEK, MON, [], MON, 7),
    );
  });

  it('is ignored without a training in the cycle', () => {
    const cycle = [R, R];
    expect(view(cycle, MON, [shift(MON, 'pullForward')], MON, 3)).toEqual([
      '-',
      '-',
      '-',
    ]);
    expect(canPullForward(cycle, MON, [], MON)).toBe(false);
  });
});

describe('combined shifts and edge cases', () => {
  it('pull forward then postpone on a later day', () => {
    const shifts = [
      shift('2026-10-14', 'pullForward'), // Mi gets legs
      shift('2026-10-19', 'postpone'), // next Mo (push after the −1)... see below
    ];
    // after pullForward: Mo push, Di pull, Mi legs, Do -, Fr -, Sa -, So push, Mo pull, Di -, Mi legs
    // postpone Mo (pull): Mo -, Di pull (Di rest absorbed), Mi legs
    expect(view(WEEK, MON, shifts, '2026-10-18', 4)).toEqual([
      'push',
      '-',
      'pull',
      'legs',
    ]);
  });

  it('postpone then pull forward (different days)', () => {
    const shifts = [shift(MON, 'postpone'), shift('2026-10-16', 'pullForward')];
    // after postpone: - push pull legs - - - | push pull - legs
    // pull forward Fr: Fr ← next Mo push
    expect(view(WEEK, MON, shifts, MON, 9)).toEqual([
      '-',
      'push',
      'pull',
      'legs',
      'push',
      '-',
      '-',
      'pull',
      '-',
    ]);
  });

  it('only the first event per date counts', () => {
    const shifts = [shift(MON, 'postpone'), shift(MON, 'pullForward')];
    expect(view(WEEK, MON, shifts, MON, 4)).toEqual([
      '-',
      'push',
      'pull',
      'legs',
    ]);
  });

  it('duplicate ids count once (idempotent replay)', () => {
    const s = shift(MON, 'postpone');
    expect(view(WEEK, MON, [s, s, s], MON, 4)).toEqual(
      view(WEEK, MON, [s], MON, 4),
    );
  });

  it('is order-independent across dates', () => {
    const a = shift(MON, 'postpone');
    const b = shift('2026-10-16', 'pullForward');
    expect(view(WEEK, MON, [b, a], MON, 14)).toEqual(
      view(WEEK, MON, [a, b], MON, 14),
    );
  });

  it('ignores shifts before the anchor', () => {
    const shifts = [shift('2026-10-05', 'postpone')];
    expect(view(WEEK, MON, shifts, MON, 7)).toEqual(
      view(WEEK, MON, [], MON, 7),
    );
    expect(canPostpone(WEEK, MON, [], '2026-10-05')).toBe(false);
  });

  it('a shift after the queried date has no effect on it', () => {
    const shifts = [shift('2026-10-15', 'postpone')];
    expect(effectivePlanForDate(WEEK, MON, shifts, '2026-10-13')).toEqual(
      T('pull'),
    );
  });

  it('stays correct far after the anchor with many shifts', () => {
    const shifts: PlanShift[] = [];
    for (let w = 0; w < 20; w += 1) {
      shifts.push(shift(cycleAddDays(MON, w * 7), 'postpone'));
    }
    // each Monday postpone is absorbed by Wednesday's rest → weekly pattern
    expect(view(WEEK, MON, shifts, cycleAddDays(MON, 19 * 7), 7)).toEqual([
      '-',
      'push',
      'pull',
      'legs',
      '-',
      '-',
      '-',
    ]);
  });

  it('a 1-day training cycle postpones permanently', () => {
    const cycle = [T('a')];
    expect(view(cycle, MON, [shift(MON, 'postpone')], MON, 3)).toEqual([
      '-',
      'a',
      'a',
    ]);
  });
});

describe('canPostpone / canPullForward', () => {
  it('postpone only on training days without a shift', () => {
    expect(canPostpone(WEEK, MON, [], MON)).toBe(true);
    expect(canPostpone(WEEK, MON, [], '2026-10-14')).toBe(false);
    expect(canPostpone(WEEK, MON, [shift(MON, 'postpone')], MON)).toBe(false);
  });

  it('pull forward only on rest days without a shift', () => {
    expect(canPullForward(WEEK, MON, [], '2026-10-14')).toBe(true);
    expect(canPullForward(WEEK, MON, [], MON)).toBe(false);
    // after a postpone today is rest, but the day already has its shift (→ undo)
    expect(canPullForward(WEEK, MON, [shift(MON, 'postpone')], MON)).toBe(
      false,
    );
  });

  it('next training after a date', () => {
    expect(nextTrainingAfter(WEEK, MON, [], '2026-10-15')?.date).toBe(
      '2026-10-19',
    );
    expect(nextTrainingAfter([R], MON, [], MON)).toBeNull();
  });
});

describe('editing helpers', () => {
  it('anchors 7-day cycles on Monday, others on today', () => {
    expect(anchorForSavedCycle(7, '2026-10-15')).toBe(MON);
    expect(anchorForSavedCycle(5, '2026-10-15')).toBe('2026-10-15');
  });

  it('slotsForEditor keeps the plain plan when saved unchanged', () => {
    const cycle = [T('a'), T('b'), R, T('c'), R];
    const anchor = '2026-10-01';
    const today = '2026-10-15';
    const edited = slotsForEditor(cycle, anchor, today);
    const newAnchor = anchorForSavedCycle(edited.length, today);
    expect(view(edited, newAnchor, [], today, 10)).toEqual(
      view(cycle, anchor, [], today, 10),
    );
  });

  it('slotsForEditor for 7 days starts on Monday', () => {
    const anchor = '2026-10-14'; // a 7-day cycle anchored mid-week (legacy)
    const edited = slotsForEditor(WEEK, anchor, '2026-10-15');
    expect(view(edited, MON, [], MON, 7)).toEqual(
      view(WEEK, anchor, [], MON, 7),
    );
  });

  it('resizes with rest days', () => {
    expect(resizeCycle([T('a')], 3)).toEqual([T('a'), R, R]);
    expect(resizeCycle(WEEK, 2)).toEqual([T('push'), T('pull')]);
    expect(resizeCycle(WEEK, 40)).toHaveLength(14);
  });

  it('rotates slots', () => {
    expect(rotateCycle([T('a'), T('b'), R], 1)).toEqual([T('b'), R, T('a')]);
    expect(rotateCycle([T('a'), T('b'), R], -1)).toEqual([R, T('a'), T('b')]);
    expect(rotateCycle([], 3)).toEqual([]);
  });

  it('resizing across the 7-day boundary keeps today’s plan', () => {
    const today = '2026-10-14'; // Wednesday → Monday-based index 2
    const to8 = resizeEditorCycle(WEEK, 8, today);
    expect(to8[0]).toEqual(WEEK[2]); // day 1 = today = Wednesday's slot
    expect(to8).toHaveLength(8);
    expect(to8[7]).toEqual(R);
    // and back: Monday first again, Wednesday holds today's slot
    const back = resizeEditorCycle(to8, 7, today);
    expect(back).toEqual(WEEK);
    // plain resize inside non-week lengths
    expect(resizeEditorCycle([T('a'), R, R], 4, today)).toEqual([
      T('a'),
      R,
      R,
      R,
    ]);
  });

  it('builds a weekly cycle from weekdays with round-robin routines', () => {
    // Mon (1), Wed (3), Fri (5), Sun (0)
    expect(weeklyCycleFromWeekdays([1, 3, 5, 0], ['a', 'b'])).toEqual([
      T('a'),
      R,
      T('b'),
      R,
      T('a'),
      R,
      T('b'),
    ]);
    expect(weeklyCycleFromWeekdays([2])).toEqual([R, T(null), R, R, R, R, R]);
    expect(trainingDayCount(WEEK)).toBe(3);
  });
});
