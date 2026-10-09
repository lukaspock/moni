import { shiftIsoDate } from './adaptive';
import { detectLowIntakePattern } from './care';
import { day } from './ledgerFixtures';

const today = '2026-02-10';
const ago = (n: number) => shiftIsoDate(today, -n);
const low = (n: number, kcal = 900, entries = 2) =>
  day(ago(n), { foodLogCount: entries, kcalEaten: kcal });

describe('detectLowIntakePattern', () => {
  it('flags 5 low days out of the last 7', () => {
    const days = [1, 2, 3, 4, 5].map((n) => low(n));
    const r = detectLowIntakePattern(days, 2000, today);
    expect(r.flagged).toBe(true);
    expect(r.lowDays).toBe(5);
    expect(r.daysConsidered).toBe(5);
  });

  it('does not flag 4 low days', () => {
    const days = [1, 2, 3, 4].map((n) => low(n));
    expect(detectLowIntakePattern(days, 2000, today).flagged).toBe(false);
  });

  it('uses 60 % of the base limit as the (exclusive) threshold', () => {
    const exactly = [1, 2, 3, 4, 5].map((n) => low(n, 1200));
    expect(detectLowIntakePattern(exactly, 2000, today).flagged).toBe(false);
    const just = [1, 2, 3, 4, 5].map((n) => low(n, 1199));
    expect(detectLowIntakePattern(just, 2000, today).flagged).toBe(true);
  });

  it('ignores days with fewer than 2 entries (fasting/untracked days do not count)', () => {
    const days = [1, 2, 3, 4, 5].map((n) => low(n, 100, 1));
    const r = detectLowIntakePattern(days, 2000, today);
    expect(r.flagged).toBe(false);
    expect(r.daysConsidered).toBe(0);
  });

  it('does not count days without entries as low', () => {
    const days = [low(1), low(2), low(3), low(4)];
    // days 5-7 simply absent
    expect(detectLowIntakePattern(days, 2000, today).flagged).toBe(false);
  });

  it('ignores today (still being logged) and days older than 7', () => {
    const days = [low(0), low(8), low(9), low(10), low(11), low(1)];
    const r = detectLowIntakePattern(days, 2000, today);
    expect(r.lowDays).toBe(1);
    expect(r.flagged).toBe(false);
  });

  it('does not flag normal intake or invalid limits', () => {
    const normal = [1, 2, 3, 4, 5, 6, 7].map((n) => low(n, 2000));
    expect(detectLowIntakePattern(normal, 2000, today).flagged).toBe(false);
    expect(
      detectLowIntakePattern(
        [1, 2, 3, 4, 5].map((n) => low(n)),
        0,
        today,
      ).flagged,
    ).toBe(false);
    expect(
      detectLowIntakePattern(
        [1, 2, 3, 4, 5].map((n) => low(n)),
        Number.NaN,
        today,
      ).flagged,
    ).toBe(false);
  });

  it('counts duplicate dates only once', () => {
    const days = [low(1), low(1), low(1), low(1), low(1)];
    expect(detectLowIntakePattern(days, 2000, today).lowDays).toBe(1);
  });
});
