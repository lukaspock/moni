import { kgToLb, type UnitSystem } from '../../domain';
import i18n from '../../i18n';

/** Display-only formatting (DB/draft values stay metric — hard rule #4). */
export function formatWeight(
  kg: number,
  unitSystem: UnitSystem,
  fractionDigits = 1,
): string {
  const value = unitSystem === 'imperial' ? kgToLb(kg) : kg;
  const number = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: fractionDigits,
  }).format(value);
  return `${number} ${unitSystem === 'imperial' ? 'lb' : 'kg'}`;
}

/** Signed weekly rate, e.g. "−0.5 kg" / "+0.3 lb". */
export function formatSignedWeight(
  kg: number,
  unitSystem: UnitSystem,
  fractionDigits = 2,
): string {
  const value = unitSystem === 'imperial' ? kgToLb(kg) : kg;
  const number = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: fractionDigits,
    signDisplay: 'exceptZero',
  }).format(value);
  return `${number} ${unitSystem === 'imperial' ? 'lb' : 'kg'}`;
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** 05–11 morning, 11–18 afternoon, otherwise evening. */
export function greetingPeriod(date: Date = new Date()): GreetingPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 18) return 'afternoon';
  return 'evening';
}

export function formatKcal(kcal: number): string {
  return new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 0,
  }).format(Math.round(kcal));
}
