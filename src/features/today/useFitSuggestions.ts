import { useMemo } from 'react';

import {
  largestMacroGap,
  pickFitSuggestions,
  shouldShowFitCard,
  sumFoodItems,
  type FitCandidate,
  type FitMacro,
  type FitMacros,
  type FitSuggestion,
} from '@/domain';
import {
  favoriteToItems,
  type FoodTotals,
  type QuickLogEntry,
} from '@/features/food';
import { useCareSignal } from '@/features/rhythm';
import type { DailyTargets } from '@/features/targets';

/** Kcal + macros of a regular (favorite items summed, recents from the log row). */
function entryMacros(entry: QuickLogEntry): FitMacros | null {
  if (entry.favorite) {
    const sum = sumFoodItems(favoriteToItems(entry.favorite));
    return {
      kcal: sum.kcal,
      proteinG: sum.proteinG,
      carbsG: sum.carbsG,
      fatG: sum.fatG,
    };
  }
  if (entry.log) {
    return {
      kcal: entry.log.kcal,
      proteinG: entry.log.protein_g,
      carbsG: entry.log.carbs_g,
      fatG: entry.log.fat_g,
    };
  }
  return null;
}

export interface FitSuggestionsResult {
  visible: boolean;
  suggestions: FitSuggestion<QuickLogEntry>[];
  remainingKcal: number;
  gap: { macro: FitMacro; missingG: number } | null;
}

/**
 * "Still fits" for Today: regulars that fit into the kcal left and close the
 * largest macro gap (`src/domain/fitSuggestions`). Hidden when not today,
 * before the afternoon with < 400 kcal left, with the care signal, or when
 * nothing fits.
 */
export function useFitSuggestions(input: {
  enabled: boolean;
  hour: number;
  targets: DailyTargets | null;
  totals: FoodTotals;
  entries: QuickLogEntry[];
}): FitSuggestionsResult {
  const { enabled, hour, targets, totals, entries } = input;
  const care = useCareSignal();
  // Separate memo: favoriteToItems mints ids, so don't redo it on every totals change.
  const candidates = useMemo(() => {
    const out: FitCandidate<QuickLogEntry>[] = [];
    for (const entry of entries) {
      const macros = entryMacros(entry);
      if (macros) out.push({ key: entry.key, ref: entry, ...macros });
    }
    return out;
  }, [entries]);

  return useMemo(() => {
    const empty: FitSuggestionsResult = {
      visible: false,
      suggestions: [],
      remainingKcal: 0,
      gap: null,
    };
    if (!enabled || !targets || !care.isReady) return empty;
    const target: FitMacros = {
      kcal: targets.totalKcal,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
    };
    const remainingKcal = target.kcal - totals.kcal;
    if (!shouldShowFitCard({ hour, remainingKcal })) return empty;

    const suggestions = pickFitSuggestions({
      candidates,
      targets: target,
      consumed: totals,
      careFlagged: care.flagged,
    });
    return {
      visible: suggestions.length > 0,
      suggestions,
      remainingKcal,
      gap: largestMacroGap(target, totals),
    };
  }, [enabled, hour, targets, totals, candidates, care.flagged, care.isReady]);
}
