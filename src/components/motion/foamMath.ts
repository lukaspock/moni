/**
 * Pure "foam" (Gischt) particle math (decision D2: light dots that rise and
 * fade, no confetti, no fire). Closed-form per particle, so positions are a
 * pure function of time: no per-frame integration, safe as a worklet.
 * Spec: docs/identity/03 §6.2 (with the drag formula corrected).
 */

export const FOAM_MAX_COUNT = 48;

export interface FoamParticle {
  x0: number;
  y0: number;
  /** px/s horizontal */
  vx: number;
  /** px/s vertical, negative = up */
  vy: number;
  /** 1/s air resistance */
  drag: number;
  /** lifetime in seconds */
  life: number;
  r0: number;
  r1: number;
  /** side sway amplitude px, frequency rad/s, phase rad */
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  /** index into the palette */
  colorIndex: number;
}

export interface FoamOptions {
  origin: { x: number; y: number };
  count?: number;
  spread?: number;
  riseMin?: number;
  riseMax?: number;
  lifeMinMs?: number;
  lifeMaxMs?: number;
  radiusStart?: number;
  radiusEnd?: number;
  paletteSize?: number;
  seed?: number;
}

/** Small deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  'worklet';
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFoam(opts: FoamOptions): FoamParticle[] {
  'worklet';
  const {
    origin,
    spread = 18,
    riseMin = 60,
    riseMax = 120,
    lifeMinMs = 900,
    lifeMaxMs = 1300,
    radiusStart = 3,
    radiusEnd = 0.8,
    paletteSize = 1,
    seed = 1,
  } = opts;
  const count = Math.min(
    Math.max(Math.floor(opts.count ?? 24), 0),
    FOAM_MAX_COUNT,
  );
  const rnd = mulberry32(seed);
  const u = (a: number, b: number) => a + (b - a) * rnd();
  const out: FoamParticle[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x0: origin.x + u(-6, 6),
      y0: origin.y,
      vx: u(-spread, spread),
      vy: -u(riseMin, riseMax),
      drag: u(1.1, 1.8),
      life: u(lifeMinMs, lifeMaxMs) / 1000,
      r0: radiusStart * u(0.8, 1.15),
      r1: radiusEnd,
      swayAmp: u(1.5, 4),
      swayFreq: u(3, 6),
      swayPhase: u(0, Math.PI * 2),
      colorIndex: Math.max(0, Math.floor(u(0, Math.max(paletteSize, 1)))),
    });
  }
  return out;
}

/** Travelled fraction with drag: ∫ exp(-d·s) ds = (1 - exp(-d·t)) / d. */
export function dragK(drag: number, t: number): number {
  'worklet';
  return (1 - Math.exp(-drag * t)) / drag;
}

export function foamX(p: FoamParticle, t: number): number {
  'worklet';
  const k = (1 - Math.exp(-p.drag * t)) / p.drag;
  const fade = Math.min(t * 4, 1); // sway eases in
  return (
    p.x0 + p.vx * k + p.swayAmp * fade * Math.sin(p.swayFreq * t + p.swayPhase)
  );
}

export function foamY(p: FoamParticle, t: number): number {
  'worklet';
  return p.y0 + p.vy * ((1 - Math.exp(-p.drag * t)) / p.drag);
}

export function foamRadius(p: FoamParticle, t: number): number {
  'worklet';
  const f = Math.min(Math.max(t / p.life, 0), 1);
  return p.r0 + (p.r1 - p.r0) * f;
}

/** 8 % fade-in, then (1-p)^1.4 fade-out; exactly 0 outside [0, life]. */
export function foamAlpha(p: FoamParticle, t: number): number {
  'worklet';
  if (t <= 0 || t >= p.life) return 0;
  const f = t / p.life;
  return Math.pow(1 - f, 1.4) * Math.min(1, f / 0.08);
}

export function foamMaxLifeMs(particles: readonly FoamParticle[]): number {
  'worklet';
  let m = 0;
  for (const p of particles) m = Math.max(m, p.life * 1000);
  return Math.ceil(m);
}
