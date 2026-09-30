import { useProfile } from '@/features/targets';
import { kgToLb, lbToKg, roundTo } from '@/domain';

export interface WeightInput {
  isImperial: boolean;
  unitLabelKey: 'insights.units.kg' | 'insights.units.lb';
  /** DB kg -> display number in the user's unit (1 decimal) */
  toDisplay: (kg: number) => number;
  /** user-typed text (comma or dot) -> kg (2 decimals), or null when invalid / out of 20–500 kg */
  parseToKg: (text: string) => number | null;
}

/** kg/lb display and input conversion; the DB always stores kg (hard rule #4). */
export function useWeightInput(): WeightInput {
  const { profile } = useProfile();
  const isImperial = profile?.unit_system === 'imperial';
  return {
    isImperial,
    unitLabelKey: isImperial ? 'insights.units.lb' : 'insights.units.kg',
    toDisplay: (kg) => roundTo(isImperial ? kgToLb(kg) : kg, 1),
    parseToKg: (text) => {
      const value = Number(text.trim().replace(',', '.'));
      if (!text.trim() || !Number.isFinite(value) || value <= 0) return null;
      const kg = roundTo(isImperial ? lbToKg(value) : value, 2);
      return kg >= 20 && kg <= 500 ? kg : null;
    },
  };
}
