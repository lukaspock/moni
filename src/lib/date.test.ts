import { addDays, localDayBoundsUtc, toISODate } from './date';

describe('localDayBoundsUtc', () => {
  it('spans exactly the local calendar day', () => {
    const { start, end } = localDayBoundsUtc('2026-09-29');
    expect(toISODate(new Date(start))).toBe('2026-09-29');
    expect(toISODate(new Date(end))).toBe('2026-09-30');
    expect(new Date(start).getHours()).toBe(0);
    expect(new Date(end).getHours()).toBe(0);
  });

  it('puts a late-evening local timestamp inside its own local day', () => {
    const lateEvening = new Date(2026, 8, 29, 23, 30).toISOString();
    const { start, end } = localDayBoundsUtc('2026-09-29');
    expect(lateEvening >= start && lateEvening < end).toBe(true);
  });

  it('handles month boundaries', () => {
    const { end } = localDayBoundsUtc('2026-01-31');
    expect(toISODate(new Date(end))).toBe(addDays('2026-01-31', 1));
  });
});
