/**
 * Pure helpers for RollingNumber / CountText (no RN imports). The functions
 * used on the UI thread carry the 'worklet' directive.
 */

export type RollingCell =
  | { key: string; kind: 'digit'; digit: number }
  | { key: string; kind: 'sep'; char: string };

export interface RollingOptions {
  fractionDigits?: number;
  /** thousands separator, '' = none */
  groupSeparator?: string;
  decimalSeparator?: string;
}

/**
 * Splits a number into odometer cells. Keys are the index counted from the
 * RIGHT, so the ones digit always keeps its identity (99 -> 100 only adds a
 * new column on the left; separators shift nothing).
 */
export function rollingCells(
  value: number,
  opts: RollingOptions = {},
): RollingCell[] {
  const {
    fractionDigits = 0,
    groupSeparator = '',
    decimalSeparator = '.',
  } = opts;
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(safe).toFixed(Math.max(0, fractionDigits));
  const negative = safe < 0 && Number(fixed) !== 0;
  const [intPart, frac = ''] = fixed.split('.');

  const chars: { kind: 'digit' | 'sep'; v: string }[] = [];
  if (negative) chars.push({ kind: 'sep', v: '-' });
  for (let i = 0; i < intPart.length; i++) {
    chars.push({ kind: 'digit', v: intPart[i] });
    const remaining = intPart.length - i - 1;
    if (groupSeparator && remaining > 0 && remaining % 3 === 0) {
      chars.push({ kind: 'sep', v: groupSeparator });
    }
  }
  if (frac.length > 0) {
    chars.push({ kind: 'sep', v: decimalSeparator });
    for (const ch of frac) chars.push({ kind: 'digit', v: ch });
  }

  const n = chars.length;
  return chars.map((c, i) => {
    const key = `c${n - 1 - i}`;
    return c.kind === 'digit'
      ? { key, kind: 'digit', digit: Number(c.v) }
      : { key, kind: 'sep', char: c.v };
  });
}

/** Large digit jumps use a timing instead of a spring (no wild flinging). */
export function isBigDigitJump(from: number, to: number): boolean {
  return Math.abs(to - from) >= 6;
}

/** Stagger from the lowest digit: index counted from the right. */
export function columnDelayMs(
  indexFromRight: number,
  step: number,
  max = 240,
): number {
  return Math.min(Math.max(indexFromRight, 0) * step, max);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Number of table steps for a count animation (about 60 fps, bounded). */
export function countFrames(durationMs: number): number {
  return Math.min(Math.max(Math.ceil(durationMs / 16), 1), 180);
}

/**
 * Eased value table from -> to with `frames + 1` entries (first = from, last
 * = to exactly). The UI thread only indexes into the formatted labels, so the
 * JS `format` function never has to run per frame.
 */
export function countTable(
  from: number,
  to: number,
  frames: number,
  ease: (t: number) => number = easeOutCubic,
): number[] {
  const n = Math.max(1, Math.floor(frames));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    out.push(i === n ? to : from + (to - from) * ease(i / n));
  }
  return out;
}

/** Table index for a linear 0..1 progress (UI thread). */
export function tableIndex(progress: number, length: number): number {
  'worklet';
  const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return Math.round(p * Math.max(length - 1, 0));
}
