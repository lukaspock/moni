import { RECOMPUTE_INTERVAL_MS, isRecomputeDue } from './recomputeSchedule';

describe('isRecomputeDue', () => {
  const now = 1_800_000_000_000;
  it('is due when never attempted', () => {
    expect(isRecomputeDue(null, now)).toBe(true);
    expect(isRecomputeDue(undefined, now)).toBe(true);
    expect(isRecomputeDue(NaN, now)).toBe(true);
  });
  it('is not due within 7 days', () => {
    expect(isRecomputeDue(now - RECOMPUTE_INTERVAL_MS + 1, now)).toBe(false);
    expect(isRecomputeDue(now - 1000, now)).toBe(false);
  });
  it('is due at exactly 7 days and later', () => {
    expect(isRecomputeDue(now - RECOMPUTE_INTERVAL_MS, now)).toBe(true);
    expect(isRecomputeDue(now - 10 * 86_400_000, now)).toBe(true);
  });
  it('treats a future timestamp as due', () => {
    expect(isRecomputeDue(now + 1000, now)).toBe(true);
  });
});
