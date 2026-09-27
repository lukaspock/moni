import type { MealType } from './types';

/**
 * §7.2 – suggest a meal category from the time of day. Boundaries (local time,
 * half-open intervals [start, end)):
 * - breakfast: 05:00–11:00
 * - lunch:     11:00–15:00
 * - dinner:    17:00–22:00
 * - snack:     everything else (15:00–17:00 afternoon gap, 22:00–05:00 night)
 * The suggestion is always user-editable in the UI.
 */
export function suggestMealType(date: Date): MealType {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}
