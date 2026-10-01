/**
 * Which local calendar day a food log lands on (quick-log for the day the user is viewing).
 * Pure: `today` is passed in as a local `YYYY-MM-DD`.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
  );
}

/** Route param -> log date; anything missing/invalid falls back to `today`. */
export function resolveLogDate(param: unknown, today: string): string {
  const value = Array.isArray(param) ? param[0] : param;
  return isValidIsoDate(value) ? value : today;
}

/** The given local day at `now`'s local time of day, as an ISO timestamp. */
export function loggedAtForDate(date: string, now: Date): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  ).toISOString();
}
