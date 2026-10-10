/**
 * Plate calculator (pure). Works in the display unit (kg or lb) because
 * plates and bars are physical objects sold in that unit; callers convert
 * the stored metric set weight with `storedToDisplay` first.
 */

export type PlateUnit = 'kg' | 'lb';

/** Available plates, heaviest first. */
export const PLATES: Record<PlateUnit, readonly number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

/** Common bar weights to choose from (first = default). */
export const BAR_PRESETS: Record<PlateUnit, readonly number[]> = {
  kg: [20, 15, 10],
  lb: [45, 35],
};

export const DEFAULT_BAR: Record<PlateUnit, number> = { kg: 20, lb: 45 };

/** Limits for a custom bar weight (display unit). */
export const CUSTOM_BAR_RANGE: Record<PlateUnit, { min: number; max: number }> =
  {
    kg: { min: 0, max: 50 },
    lb: { min: 0, max: 110 },
  };

export interface PlateResult {
  /** Plates on ONE side, heaviest first. */
  perSide: number[];
  /** Total weight that is actually loaded (bar + both sides). */
  achieved: number;
  /** target - achieved: > 0 means the target can't be hit exactly with these plates. */
  remainder: number;
  /** The target is lighter than the bar alone. */
  belowBar: boolean;
}

// Work in hundredths to avoid floating point drift (1.25 kg, 2.5 lb).
const toCents = (n: number) => Math.round(n * 100);
const fromCents = (n: number) => n / 100;

/**
 * Greedy per side: heaviest plate that still fits, repeated. With the
 * standard plate sets greedy is optimal; leftovers end up in `remainder`.
 */
export function calculatePlates(
  target: number,
  bar: number,
  unit: PlateUnit,
  available: readonly number[] = PLATES[unit],
): PlateResult {
  const targetC = Number.isFinite(target) ? Math.max(0, toCents(target)) : 0;
  const barC = Number.isFinite(bar) ? Math.max(0, toCents(bar)) : 0;
  if (targetC < barC) {
    return {
      perSide: [],
      achieved: fromCents(barC),
      remainder: fromCents(targetC - barC),
      belowBar: true,
    };
  }
  const plates = [...available]
    .filter((p) => p > 0)
    .map(toCents)
    .sort((a, b) => b - a);
  let side = Math.floor((targetC - barC) / 2);
  const perSide: number[] = [];
  for (const p of plates) {
    while (side >= p) {
      perSide.push(fromCents(p));
      side -= p;
    }
  }
  const loadedC = barC + 2 * perSide.reduce((s, p) => s + toCents(p), 0);
  return {
    perSide,
    achieved: fromCents(loadedC),
    remainder: fromCents(targetC - loadedC),
    belowBar: false,
  };
}

/** Visual tone of a plate (competition colors), mapped to theme tokens by the UI. */
export type PlateTone =
  'red' | 'blue' | 'yellow' | 'green' | 'white' | 'black' | 'silver';

const KG_TONES: Record<string, PlateTone> = {
  '25': 'red',
  '20': 'blue',
  '15': 'yellow',
  '10': 'green',
  '5': 'white',
  '2.5': 'black',
  '1.25': 'silver',
};
// lb plates take the color of their closest kg counterpart.
const LB_TONES: Record<string, PlateTone> = {
  '45': 'blue',
  '35': 'yellow',
  '25': 'green',
  '10': 'white',
  '5': 'black',
  '2.5': 'silver',
};

export function plateTone(plate: number, unit: PlateUnit): PlateTone {
  return (unit === 'kg' ? KG_TONES : LB_TONES)[String(plate)] ?? 'silver';
}

/** Relative plate height 0.4..1 (heaviest plate = 1), for a proportional drawing. */
export function plateHeightRatio(plate: number, unit: PlateUnit): number {
  const max = PLATES[unit][0] ?? 1;
  const r = plate / max;
  return Math.min(1, Math.max(0.4, 0.4 + 0.6 * r));
}

/** Clamps / rounds a custom bar weight to the allowed range (0.5 steps). */
export function clampBarWeight(value: number, unit: PlateUnit): number {
  const { min, max } = CUSTOM_BAR_RANGE[unit];
  if (!Number.isFinite(value)) return DEFAULT_BAR[unit];
  return Math.min(max, Math.max(min, Math.round(value * 2) / 2));
}
