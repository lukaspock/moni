/**
 * "Passt noch rein" / "Still fits": picks up to three of the user's regulars
 * (favorites/recents) that fit into the kcal still left today and best close
 * the largest macro gap (usually protein). Pure; the score is a transparent
 * weighted sum whose parts are returned with every suggestion.
 */

export type FitMacro = 'protein' | 'carbs' | 'fat';

export interface FitMacros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface FitCandidate<T = unknown> extends FitMacros {
  key: string;
  ref: T;
}

export interface FitScoreParts {
  /** Share of the focus macro's gap this entry closes (0..1, overshoot doesn't count). */
  coverage: number;
  /** Share of the entry's energy that comes from the focus macro (0..1). */
  density: number;
  /** Share of the kcal still left that the entry uses (0..1). */
  fill: number;
}

export interface FitSuggestion<T = unknown> {
  candidate: FitCandidate<T>;
  /** Macro the suggestion targets, or null when every macro target is met. */
  focus: FitMacro | null;
  /** Grams of the focus macro the entry adds. */
  focusGrams: number;
  /** Kcal left after logging it. */
  kcalAfter: number;
  score: number;
  parts: FitScoreParts;
}

/** No suggestions below this many kcal left. */
export const FIT_MIN_REMAINING_KCAL = 150;
export const FIT_MAX_SUGGESTIONS = 3;
/** Score weights (sum 1). */
export const FIT_WEIGHTS: Readonly<FitScoreParts> = {
  coverage: 0.6,
  density: 0.3,
  fill: 0.1,
};
/** The card shows unconditionally from this local hour on ("afternoon"). */
export const FIT_AFTERNOON_HOUR = 14;
/** …or earlier when at least this many kcal are left. */
export const FIT_EARLY_MIN_REMAINING_KCAL = 400;

const KCAL_PER_G: Record<FitMacro, number> = { protein: 4, carbs: 4, fat: 9 };

function gramsOf(m: FitMacros, macro: FitMacro): number {
  return macro === 'protein'
    ? m.proteinG
    : macro === 'carbs'
      ? m.carbsG
      : m.fatG;
}

const clamp01 = (v: number) =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;

/**
 * Macro with the largest *relative* gap (missing / target). Protein wins ties
 * (listed first). Null when no macro has a gap.
 */
export function largestMacroGap(
  targets: FitMacros,
  consumed: FitMacros,
): { macro: FitMacro; missingG: number } | null {
  let best: { macro: FitMacro; missingG: number; rel: number } | null = null;
  for (const macro of ['protein', 'carbs', 'fat'] as const) {
    const target = gramsOf(targets, macro);
    if (!(target > 0)) continue;
    const missing = target - gramsOf(consumed, macro);
    if (!(missing > 0)) continue;
    const rel = missing / target;
    if (!best || rel > best.rel) best = { macro, missingG: missing, rel };
  }
  return best ? { macro: best.macro, missingG: best.missingG } : null;
}

/**
 * Up to `limit` regulars that fit into the kcal left, best first.
 * score = 0.6 × coverage + 0.3 × density + 0.1 × fill (see `FitScoreParts`);
 * without a macro gap only `fill` counts. Empty when fewer than 150 kcal are
 * left or the care signal is active (no nudging towards eating then).
 * Duplicate keys and entries without kcal are ignored.
 */
export function pickFitSuggestions<T>(input: {
  candidates: readonly FitCandidate<T>[];
  targets: FitMacros;
  consumed: FitMacros;
  careFlagged: boolean;
  limit?: number;
}): FitSuggestion<T>[] {
  const { candidates, targets, consumed, careFlagged } = input;
  const limit = input.limit ?? FIT_MAX_SUGGESTIONS;
  if (careFlagged || limit <= 0) return [];
  const remainingKcal = targets.kcal - consumed.kcal;
  if (!(remainingKcal >= FIT_MIN_REMAINING_KCAL)) return [];

  const gap = largestMacroGap(targets, consumed);
  const seen = new Set<string>();
  const scored: FitSuggestion<T>[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.key)) continue;
    seen.add(candidate.key);
    if (!(candidate.kcal > 0) || candidate.kcal > remainingKcal) continue;

    const fill = clamp01(candidate.kcal / remainingKcal);
    let parts: FitScoreParts;
    let score: number;
    let focusGrams = 0;
    if (gap) {
      focusGrams = Math.max(0, gramsOf(candidate, gap.macro));
      parts = {
        coverage: clamp01(Math.min(focusGrams, gap.missingG) / gap.missingG),
        density: clamp01((focusGrams * KCAL_PER_G[gap.macro]) / candidate.kcal),
        fill,
      };
      score =
        FIT_WEIGHTS.coverage * parts.coverage +
        FIT_WEIGHTS.density * parts.density +
        FIT_WEIGHTS.fill * parts.fill;
    } else {
      parts = { coverage: 0, density: 0, fill };
      score = fill;
    }
    scored.push({
      candidate,
      focus: gap?.macro ?? null,
      focusGrams,
      kcalAfter: remainingKcal - candidate.kcal,
      score,
      parts,
    });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.focusGrams - a.focusGrams ||
      a.candidate.key.localeCompare(b.candidate.key),
  );
  return scored.slice(0, limit);
}

/**
 * Whether Today shows the card: from the afternoon on, or earlier when at
 * least 400 kcal are left (the suggestions themselves still need ≥ 150 kcal).
 */
export function shouldShowFitCard(input: {
  hour: number;
  remainingKcal: number;
}): boolean {
  return (
    input.hour >= FIT_AFTERNOON_HOUR ||
    input.remainingKcal >= FIT_EARLY_MIN_REMAINING_KCAL
  );
}
