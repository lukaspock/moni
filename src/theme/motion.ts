import { Easing, ReduceMotion } from 'react-native-reanimated';

/**
 * Motion tokens (Doc 03 §2, identity decision D2: rise / settle / ebb, foam).
 * Constants only (worklet-safe). Time curve is asymmetric: fast rise, long
 * settle, ebb (leaving) is quicker than arriving.
 */

export const duration = {
  instant: 90,
  fast: 160,
  base: 280,
  slow: 520,
  hero: 900,
  ambient: 3200,
} as const;

/** Exits are shorter than entrances. */
export const EXIT_FACTOR = 0.65;
export const exit = (ms: number): number => Math.round(ms * EXIT_FACTOR);

export const bezier = {
  /** Steep start, long soft landing. Default for everything that appears/fills. */
  rise: [0.16, 1, 0.3, 1],
  /** Softer; ring delta changes and color transitions. */
  settle: [0.22, 0.61, 0.36, 1],
  /** Slightly accelerating; exits. */
  ebb: [0.4, 0, 0.9, 0.6],
  /** Symmetric; ambient breathing loops only. */
  smooth: [0.45, 0, 0.25, 1],
} as const;

export const easing = {
  rise: Easing.bezier(...bezier.rise),
  settle: Easing.bezier(...bezier.settle),
  ebb: Easing.bezier(...bezier.ebb),
  smooth: Easing.bezier(...bezier.smooth),
  linear: Easing.linear,
} as const;

export const spring = {
  tap: { damping: 22, stiffness: 420, mass: 0.8 },
  settle: { damping: 18, stiffness: 180, mass: 1 },
  bouncy: { damping: 11, stiffness: 240, mass: 0.9 },
  heavy: { damping: 26, stiffness: 120, mass: 1.6 },
} as const;

export const stagger = { tight: 30, base: 55, wide: 90, max: 400 } as const;

/** Delay for item `i`; total delay never exceeds `stagger.max`. */
export const staggerDelay = (i: number, step: number = stagger.base): number =>
  Math.min(Math.max(i, 0) * step, stagger.max);

export const press = {
  subtle: { scale: 0.985, opacity: 1 },
  default: { scale: 0.97, opacity: 0.92 },
  strong: { scale: 0.94, opacity: 0.9 },
  hero: { scale: 0.92, opacity: 1 },
} as const;

/** Reveal: rises a few points, never slides sideways. */
export const reveal = { rise: 8, scaleFrom: 0.98 } as const;

/** Same Reduced Motion policy everywhere: follow the system switch. */
export const REDUCE = ReduceMotion.System;

/** Glow asymmetry: quick attack, long decay. */
export const glow = {
  attack: 180,
  decay: 600,
  idlePeriod: duration.ambient,
} as const;

export type SpringName = keyof typeof spring;
export type DurationName = keyof typeof duration;
export type PressName = keyof typeof press;
