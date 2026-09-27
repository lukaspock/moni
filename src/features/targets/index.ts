// CONTRACT (owner: `account` agent). Signatures are fixed, implementation is replaced.
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export type DailyTargets = {
  date: string; // YYYY-MM-DD
  baseKcal: number;
  workoutBonusKcal: number;
  /** true = bonus comes from the plan (shown dashed), not yet from a real workout */
  bonusIsProvisional: boolean;
  totalKcal: number; // baseKcal + workoutBonusKcal
  proteinG: number;
  carbsG: number;
  fatG: number;
  isTrainingDay: boolean;
};

/** Signed-in user's profile, or null while loading / before onboarding. */
export function useProfile(): { profile: Profile | null; isLoading: boolean } {
  return { profile: null, isLoading: false };
}

/** Dynamic daily limit for a date (PLAN §6.4), computed via src/domain. */
export function useDailyTargets(date: string): {
  targets: DailyTargets | null;
  isLoading: boolean;
} {
  void date;
  return { targets: null, isLoading: false };
}
