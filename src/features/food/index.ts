// CONTRACT (owner: `food` agent). Signatures are fixed, implementation is replaced.
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
  void date;
  return {
    totals: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    isLoading: false,
  };
}
