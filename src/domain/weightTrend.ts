/**
 * Pure weight-trend and Insights helpers (PLAN §7.8): smoothed weight trend,
 * weekly rate, range filters and simple correlation helpers. All dates are
 * local `YYYY-MM-DD` strings. No RN/Expo imports.
 */

import { shiftIsoDate } from './adaptive';

export interface WeightPoint {
  /** local YYYY-MM-DD */
  date: string;
  weightKg: number;
}

export type WeightRange = '4w' | '12w' | 'all';

const MS_PER_DAY = 86_400_000;

/** Days since an arbitrary epoch for a YYYY-MM-DD string (timezone/DST independent). */
export function dayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function mean(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Collapses several entries of one day to their mean, sorted ascending by date. */
export function dailyAverages(points: readonly WeightPoint[]): WeightPoint[] {
  const byDate = new Map<string, { sum: number; n: number }>();
  for (const p of points) {
    const e = byDate.get(p.date) ?? { sum: 0, n: 0 };
    e.sum += p.weightKg;
    e.n += 1;
    byDate.set(p.date, e);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, e]) => ({ date, weightKg: e.sum / e.n }));
}

/**
 * Time-aware exponential moving average over daily means. `tauDays` is the
 * smoothing time constant: a gap of `dt` days weights the new reading with
 * `1 - exp(-dt / tauDays)`, so irregular logging behaves sensibly.
 */
export function smoothTrend(
  points: readonly WeightPoint[],
  tauDays = 7,
): WeightPoint[] {
  const out: WeightPoint[] = [];
  let trend: number | null = null;
  let prevDay = 0;
  for (const p of dailyAverages(points)) {
    const day = dayNumber(p.date);
    if (trend === null) {
      trend = p.weightKg;
    } else {
      const alpha = 1 - Math.exp(-(day - prevDay) / tauDays);
      trend = trend + alpha * (p.weightKg - trend);
    }
    prevDay = day;
    out.push({ date: p.date, weightKg: trend });
  }
  return out;
}

/** Keeps points within the range ending at `today` (inclusive). */
export function filterByRange<T extends { date: string }>(
  points: readonly T[],
  range: WeightRange,
  today: string,
): T[] {
  if (range === 'all') return [...points];
  const weeks = range === '4w' ? 4 : 12;
  const from = shiftIsoDate(today, -weeks * 7 + 1);
  return points.filter((p) => p.date >= from && p.date <= today);
}

export function linearSlope(
  xs: readonly number[],
  ys: readonly number[],
): number | null {
  const n = xs.length;
  if (n < 2 || n !== ys.length) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/**
 * Weekly rate of change (kg/week): least-squares slope of the given (usually
 * smoothed) points over the last `windowDays`. Null with fewer than 2 points
 * or when they span less than `minSpanDays`.
 */
export function weeklyRateKg(
  points: readonly WeightPoint[],
  windowDays = 28,
  minSpanDays = 6,
): number | null {
  if (points.length < 2) return null;
  const lastDay = dayNumber(points[points.length - 1].date);
  const win = points.filter((p) => dayNumber(p.date) > lastDay - windowDays);
  if (win.length < 2) return null;
  const xs = win.map((p) => dayNumber(p.date));
  const ys = win.map((p) => p.weightKg);
  if (Math.max(...xs) - Math.min(...xs) < minSpanDays) return null;
  const slope = linearSlope(xs, ys);
  return slope === null ? null : slope * 7;
}

/** Pearson correlation; null when fewer than 3 pairs or zero variance. */
export function pearson(
  xs: readonly number[],
  ys: readonly number[],
): number | null {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export interface DaySummary {
  date: string;
  kcalEaten: number;
  /** null when no target was computed for the day */
  targetKcal: number | null;
  proteinEatenG: number;
  targetProteinG: number | null;
  /** at least one food entry logged */
  logged: boolean;
  hadWorkout: boolean;
}

export interface KcalAdherence {
  loggedDays: number;
  avgEatenKcal: number;
  avgTargetKcal: number;
  /** avg(eaten - target) in kcal; negative = under target */
  avgDeltaKcal: number;
  /** days with eaten within ±tolerance (default 10 %) of target */
  daysOnTarget: number;
}

/** Only logged days with a target count. Null when there are none. */
export function kcalAdherence(
  days: readonly DaySummary[],
  tolerance = 0.1,
): KcalAdherence | null {
  const used = days.filter(
    (d) => d.logged && d.targetKcal !== null && d.targetKcal > 0,
  );
  if (used.length === 0) return null;
  return {
    loggedDays: used.length,
    avgEatenKcal: mean(used.map((d) => d.kcalEaten)),
    avgTargetKcal: mean(used.map((d) => d.targetKcal as number)),
    avgDeltaKcal: mean(used.map((d) => d.kcalEaten - (d.targetKcal as number))),
    daysOnTarget: used.filter(
      (d) =>
        Math.abs(d.kcalEaten - (d.targetKcal as number)) <=
        tolerance * (d.targetKcal as number),
    ).length,
  };
}

/** Consecutive days ending at `today` (or yesterday, if today has no entry yet) contained in `dates`. */
export function currentStreak(
  dates: ReadonlySet<string>,
  today: string,
): number {
  let day = dates.has(today) ? today : shiftIsoDate(today, -1);
  let streak = 0;
  while (dates.has(day)) {
    streak += 1;
    day = shiftIsoDate(day, -1);
  }
  return streak;
}

export interface TrainingComparison {
  trainingDays: number;
  restDays: number;
  avgProteinTrainingG: number;
  avgProteinRestG: number;
  avgKcalTrainingDelta: number;
  avgKcalRestDelta: number;
}

/** Protein / kcal-vs-target on training vs. rest days. Null unless both groups have ≥ `minPerGroup` logged days. */
export function compareTrainingDays(
  days: readonly DaySummary[],
  minPerGroup = 3,
): TrainingComparison | null {
  const logged = days.filter((d) => d.logged);
  const t = logged.filter((d) => d.hadWorkout);
  const r = logged.filter((d) => !d.hadWorkout);
  if (t.length < minPerGroup || r.length < minPerGroup) return null;
  const delta = (d: DaySummary) =>
    d.targetKcal === null ? 0 : d.kcalEaten - d.targetKcal;
  return {
    trainingDays: t.length,
    restDays: r.length,
    avgProteinTrainingG: mean(t.map((d) => d.proteinEatenG)),
    avgProteinRestG: mean(r.map((d) => d.proteinEatenG)),
    avgKcalTrainingDelta: mean(t.map(delta)),
    avgKcalRestDelta: mean(r.map(delta)),
  };
}

/** Workout days per rolling 7-day bucket ending at `today`, oldest first. */
export function workoutDaysPerWeek(
  days: readonly DaySummary[],
  today: string,
  weeks: number,
): number[] {
  const out: number[] = new Array<number>(weeks).fill(0);
  const t = dayNumber(today);
  for (const d of days) {
    if (!d.hadWorkout) continue;
    const ago = t - dayNumber(d.date);
    if (ago < 0 || ago >= weeks * 7) continue;
    out[weeks - 1 - Math.floor(ago / 7)] += 1;
  }
  return out;
}

function trendAtOrBefore(
  trend: readonly WeightPoint[],
  day: number,
): number | null {
  let v: number | null = null;
  for (const p of trend) {
    if (dayNumber(p.date) <= day) v = p.weightKg;
    else break;
  }
  return v;
}

/**
 * Correlation between weekly average intake and the weekly change of the
 * smoothed weight trend. Null when fewer than `minWeeks` weeks have ≥ 4 logged
 * days plus trend data on both ends.
 */
export function weightVsKcalCorrelation(
  days: readonly DaySummary[],
  trend: readonly WeightPoint[],
  today: string,
  weeks = 8,
  minWeeks = 4,
): { r: number; weeks: number } | null {
  const t = dayNumber(today);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let w = 0; w < weeks; w++) {
    const endDay = t - w * 7;
    const startDay = endDay - 6;
    const inWeek = days.filter((d) => {
      const n = dayNumber(d.date);
      return d.logged && n >= startDay && n <= endDay;
    });
    if (inWeek.length < 4) continue;
    const before = trendAtOrBefore(trend, startDay - 1);
    const after = trendAtOrBefore(trend, endDay);
    if (before === null || after === null) continue;
    xs.push(mean(inWeek.map((d) => d.kcalEaten)));
    ys.push(after - before);
  }
  if (xs.length < minWeeks) return null;
  const r = pearson(xs, ys);
  return r === null ? null : { r, weeks: xs.length };
}
