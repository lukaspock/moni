/** Local calendar date as `YYYY-MM-DD` (the `date` column format in the DB). */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** 0 = Sunday … 6 = Saturday (matches `training_plan_days.weekday`). */
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * UTC instants bounding a *local* calendar day `[start, end)` — for filtering
 * `timestamptz` columns (e.g. `workouts.started_at`) by the user's local date.
 * DST-safe: both bounds are built from local midnight via the Date constructor.
 */
export function localDayBoundsUtc(isoDate: string): {
  start: string;
  end: string;
} {
  const [y, m, d] = isoDate.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d).toISOString(),
    end: new Date(y, m - 1, d + 1).toISOString(),
  };
}
