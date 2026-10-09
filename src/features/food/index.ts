// CONTRACT (owner: `food` agent). Signatures are fixed, implementation is replaced.
import { useFoodLogsForDate } from './queries';

export type FoodTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Sum of all food_logs for a local date (YYYY-MM-DD). */
export function useFoodTotals(date: string): {
  totals: FoodTotals;
  isLoading: boolean;
} {
  const { logs, isLoading } = useFoodLogsForDate(date);
  const totals = logs.reduce<FoodTotals>(
    (acc, log) => ({
      kcal: acc.kcal + log.kcal,
      proteinG: acc.proteinG + log.protein_g,
      carbsG: acc.carbsG + log.carbs_g,
      fatG: acc.fatG + log.fat_g,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  return { totals, isLoading };
}

// Additional exports (not part of the fixed contract above) used by app/ screens and other
// food-feature files. Other features should still only import from this barrel.
export {
  useFoodLogsForDate,
  useRecentFoodLogs,
  useFavoriteMeals,
  useFoodLogById,
  useDeleteFoodLog,
  useSaveFoodDraft,
  useBumpFavoriteUseCount,
  useAnalyzeFood,
  useAnalyzeLabel,
  uploadFoodImage,
  AnalyzeFoodError,
} from './queries';
export type {
  FoodLogRow,
  FoodItemRow,
  FavoriteMealRow,
  FoodLogWithItems,
  SaveFoodDraftInput,
  AnalyzeFoodInput,
  AnalyzeFoodResult,
  AnalyzeLabelResult,
} from './queries';
export { lookupBarcode } from './openFoodFacts';
export type {
  OpenFoodFactsProduct,
  BarcodeLookupResult,
} from './openFoodFacts';
export { useFoodAnalysis } from './analysisFlow';
export type { AnalysisFailure } from './analysisFlow';
export {
  useQuickLogEntries,
  useQuickLogMeal,
  favoriteToItems,
  logToItems,
} from './quickLog';
export type { QuickLogEntry } from './quickLog';
export { useFoodDraftStore } from './draftStore';
export type {
  DraftFoodItem,
  FoodDraftStatus,
  FoodDraftErrorKind,
} from './draftStore';
export { foodKeys } from './keys';

// UI bridge: the food sheets queue a "+kcal" meal flight, Today consumes it (see flightStore.ts).
export { useMealFlightBridge } from './flightStore';
export type { FlightPoint, PendingMealFlight } from './flightStore';
