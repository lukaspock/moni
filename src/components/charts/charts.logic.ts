/**
 * Pure chart math (no RN / Skia imports) — angles, segments, scales, smoothing.
 * Components stay thin; everything testable lives here.
 */

// Every helper here may run on the UI thread (useDerivedValue / Skia), so all
// of them are worklets – arrow consts included.
export function clamp01(n: number): number {
  'worklet';
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 0;
}

// ---------------------------------------------------------------- Kcal ring

/** Center + radius of a stroked circle that fits a square canvas. */
export function ringGeometry(size: number, strokeWidth: number) {
  'worklet';
  return { cx: size / 2, cy: size / 2, r: (size - strokeWidth) / 2 };
}

/**
 * Point on the ring for a share (0..1), measured clockwise from 12 o'clock.
 * (Skia draws circles starting at 3 o'clock, so the ring group is rotated -90°
 * and this returns coordinates in the *rotated* frame: angle = share · 2π.)
 */
export function ringPoint(
  cx: number,
  cy: number,
  r: number,
  share: number,
): { x: number; y: number } {
  'worklet';
  const a = clamp01(share) * Math.PI * 2;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Segment ends for a fill share: lime part is capped at the base share. */
export function ringSegments(fill: number, baseShare: number) {
  'worklet';
  const f = clamp01(fill);
  const base = clamp01(baseShare);
  return {
    baseEnd: Math.min(f, base),
    /** end of the ember fill that starts at `baseShare` (== base when empty). */
    bonusEnd: Math.max(f, base),
    inBonus: f > base + 1e-6,
  };
}

/** Where the bonus track ends while it streams in (t: 0..1). */
export function bonusTrackEnd(baseShare: number, t: number): number {
  'worklet';
  return clamp01(baseShare) + (1 - clamp01(baseShare)) * clamp01(t);
}

/** Glow only for a visible fill (> 2 %). */
export function showGlow(fill: number): boolean {
  'worklet';
  return fill > 0.02;
}

// ---------------------------------------------------------------- Macro bar

/** Single uppercase marker letter taken from the (localized) macro label. */
export function markerLetter(label: string): string {
  'worklet';
  const ch = Array.from(label.trim())[0];
  return ch ? ch.toLocaleUpperCase() : '·';
}

export interface MacroBarModel {
  /** fill width, 0..1 of the track */
  fill: number;
  /** target tick position (0..1) — only meaningful when over */
  targetPos: number;
  isOver: boolean;
}

/**
 * When the target is exceeded the scale grows to the eaten amount, so the
 * target stays visible as a tick inside the bar.
 */
export function macroBarModel(eaten: number, target: number): MacroBarModel {
  'worklet';
  const e = Number.isFinite(eaten) ? Math.max(eaten, 0) : 0;
  const t = Number.isFinite(target) ? Math.max(target, 0) : 0;
  if (t <= 0) return { fill: 0, targetPos: 1, isOver: false };
  if (e > t) return { fill: 1, targetPos: t / e, isOver: true };
  return { fill: e / t, targetPos: 1, isOver: false };
}

// ---------------------------------------------------------------- Bars

/** Bar height ratio (0..1) where the top of the area == `cap` × target. */
export function dailyBarRatio(
  eaten: number,
  target: number | null,
  cap = 1.3,
): number {
  'worklet';
  if (!target || target <= 0 || eaten <= 0) return 0;
  return Math.min(eaten / target, cap) / cap;
}

export function isOverTarget(
  eaten: number,
  target: number | null,
  tolerance = 1.1,
): boolean {
  'worklet';
  return !!target && target > 0 && eaten > target * tolerance;
}

/** Ratio (0..1 of the bar area) at which the bonus cap starts, or null. */
export function bonusCapStart(
  eaten: number,
  target: number | null,
  bonusKcal: number | undefined,
  cap = 1.3,
): number | null {
  'worklet';
  if (!target || target <= 0 || !bonusKcal || bonusKcal <= 0) return null;
  const baseKcal = Math.max(target - bonusKcal, 0);
  if (eaten <= baseKcal) return null;
  return Math.min(baseKcal / target, cap) / cap;
}

/** Pixel height of a value bar; non-zero values keep a visible minimum. */
export function barHeightPx(
  value: number,
  top: number,
  areaPx: number,
  minPx = 4,
): number {
  'worklet';
  if (!(value > 0) || !(top > 0)) return 0;
  return Math.max(Math.min(value / top, 1) * areaPx, minPx);
}

// ---------------------------------------------------------------- Line charts

export interface Pt {
  x: number;
  y: number;
}
export interface BezierSeg {
  cp1: Pt;
  cp2: Pt;
  to: Pt;
}

/**
 * Catmull-Rom → cubic Bézier control points (tension 0.5 = standard). Control
 * y is clamped between the segment's endpoints so weight curves never
 * overshoot a measured value.
 */
export function smoothSegments(
  points: readonly Pt[],
  tension = 0.5,
): BezierSeg[] {
  'worklet';
  const k = tension / 3;
  const segs: BezierSeg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const cl = (y: number) => Math.min(Math.max(y, lo), hi);
    segs.push({
      cp1: { x: p1.x + (p2.x - p0.x) * k, y: cl(p1.y + (p2.y - p0.y) * k) },
      cp2: { x: p2.x - (p3.x - p1.x) * k, y: cl(p2.y - (p3.y - p1.y) * k) },
      to: p2,
    });
  }
  return segs;
}

/** Padded y-domain; at least `minSpan` wide so flat series don't blow up. */
export function paddedDomain(
  values: readonly number[],
  padRatio = 0.1,
  minSpan = 1,
): { min: number; max: number } {
  'worklet';
  if (values.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, minSpan);
  const mid = (lo + hi) / 2;
  return {
    min: Math.min(lo, mid - span / 2) - span * padRatio,
    max: Math.max(hi, mid + span / 2) + span * padRatio,
  };
}

/** `#RRGGBB` + alpha → `rgba(...)` (Skia-safe string). Other formats pass through. */
export function withAlpha(hex: string, alpha: number): string {
  'worklet';
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp01(alpha)})`;
}
