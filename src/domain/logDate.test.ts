import { isValidIsoDate, loggedAtForDate, resolveLogDate } from './logDate';

describe('isValidIsoDate', () => {
  it('accepts real dates and rejects malformed/impossible ones', () => {
    expect(isValidIsoDate('2026-09-30')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-9-3')).toBe(false);
    expect(isValidIsoDate('nope')).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
});

describe('resolveLogDate', () => {
  it('uses a valid param, else today', () => {
    expect(resolveLogDate('2026-09-28', '2026-09-30')).toBe('2026-09-28');
    expect(resolveLogDate(['2026-09-28'], '2026-09-30')).toBe('2026-09-28');
    expect(resolveLogDate(undefined, '2026-09-30')).toBe('2026-09-30');
    expect(resolveLogDate('garbage', '2026-09-30')).toBe('2026-09-30');
  });
});

describe('loggedAtForDate', () => {
  it('keeps the local time of day on the chosen day', () => {
    const now = new Date(2026, 8, 30, 13, 45, 10);
    const at = new Date(loggedAtForDate('2026-09-28', now));
    expect([at.getFullYear(), at.getMonth(), at.getDate()]).toEqual([
      2026, 8, 28,
    ]);
    expect([at.getHours(), at.getMinutes(), at.getSeconds()]).toEqual([
      13, 45, 10,
    ]);
  });
});
