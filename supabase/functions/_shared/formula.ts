// møni · formula TDEE (Mifflin-St Jeor x NEAT factor) — Deno port of src/domain/bmr.ts +
// src/domain/tdee.ts (PLAN §6.1/§6.2). Keep in sync by hand if those constants change.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

const NEAT_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.5,
  active: 1.65,
};

/** Whole years between `birthDate` (YYYY-MM-DD) and `today` (YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export function formulaTdee(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  ageYears: number,
  activity: ActivityLevel,
): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + (sex === "male" ? 5 : -161);
  return bmr * NEAT_FACTORS[activity];
}
