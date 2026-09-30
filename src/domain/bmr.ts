import type { Sex } from './types';

/**
 * §6.1 – Mifflin-St Jeor basal metabolic rate.
 * BMR = 10·kg + 6.25·cm − 5·age + (male +5 | female −161)
 */

export const MALE_BMR_OFFSET = 5;
export const FEMALE_BMR_OFFSET = -161;

export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const offset = sex === 'male' ? MALE_BMR_OFFSET : FEMALE_BMR_OFFSET;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + offset;
}

/**
 * Whole years elapsed between birthDate and today (defaults to now),
 * accounting for whether the birthday has occurred yet this year.
 */
export function ageFromBirthDate(
  birthDate: Date,
  today: Date = new Date(),
): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age;
}
