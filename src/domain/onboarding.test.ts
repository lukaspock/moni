import {
  computeGoalProjection,
  computeOnboardingPreview,
  estimateDefaultWorkoutExpectedKcal,
  isPlausibleHeightCm,
  isPlausibleWeightKg,
} from './onboarding';

describe('estimateDefaultWorkoutExpectedKcal', () => {
  it('scales with bodyweight', () => {
    const at70 = estimateDefaultWorkoutExpectedKcal(70);
    const at90 = estimateDefaultWorkoutExpectedKcal(90);
    expect(at90).toBeGreaterThan(at70);
    expect(at70).toBeGreaterThan(0);
  });
});

describe('computeOnboardingPreview', () => {
  const baseInput = {
    sex: 'male' as const,
    birthDate: new Date(1994, 0, 1),
    heightCm: 180,
    weightKg: 80,
    activityLevel: 'moderate' as const,
    goal: 'lose' as const,
    goalRateKgPerWeek: -0.5,
    hasTrainingDays: true,
  };

  it('rest day has no workout bonus, training day does', () => {
    const result = computeOnboardingPreview(baseInput);
    expect(result.restDay.workoutBonusKcal).toBe(0);
    expect(result.trainingDay.workoutBonusKcal).toBeGreaterThan(0);
    expect(result.trainingDay.totalKcal).toBeGreaterThan(
      result.restDay.totalKcal,
    );
  });

  it('training day protein is higher than rest day protein (2.0 vs 1.6 g/kg + deficit bonus)', () => {
    const result = computeOnboardingPreview(baseInput);
    expect(result.trainingDay.proteinG).toBeGreaterThan(
      result.restDay.proteinG,
    );
  });

  it('with no training days, training/rest previews match (no bonus)', () => {
    const result = computeOnboardingPreview({
      ...baseInput,
      hasTrainingDays: false,
    });
    expect(result.trainingDay.workoutBonusKcal).toBe(0);
    expect(result.trainingDay.totalKcal).toBe(result.restDay.totalKcal);
  });
});

describe('body plausibility', () => {
  it('accepts normal values and rejects typos/empties', () => {
    expect(isPlausibleHeightCm(178)).toBe(true);
    expect(isPlausibleHeightCm(1.78)).toBe(false);
    expect(isPlausibleHeightCm(null)).toBe(false);
    expect(isPlausibleWeightKg(72.5)).toBe(true);
    expect(isPlausibleWeightKg(7)).toBe(false);
    expect(isPlausibleWeightKg(725)).toBe(false);
  });
});

describe('computeGoalProjection', () => {
  const baseInput = {
    sex: 'male' as const,
    birthDate: new Date(1994, 0, 1),
    heightCm: 180,
    weightKg: 80,
    activityLevel: 'moderate' as const,
    goal: 'lose' as const,
    goalRateKgPerWeek: -0.5,
    hasTrainingDays: true,
    targetWeightKg: 75,
    startDate: new Date(2026, 8, 29),
  };

  it('uncapped: effective rate equals the requested rate, target in ~10 weeks', () => {
    const r = computeGoalProjection(baseInput);
    expect(r.preview.base.flags.deficitCapped).toBe(false);
    expect(r.effectiveRateKgPerWeek).toBeCloseTo(-0.5, 1);
    expect(r.weeksToTarget).toBeCloseTo(10, 0);
    expect(r.targetDate).not.toBeNull();
    expect(r.pace).toBe('balanced');
    expect(r.curve[0].weightKg).toBe(80);
  });

  it('capped deficit: projection uses the slower effective rate (honest date)', () => {
    const r = computeGoalProjection({ ...baseInput, goalRateKgPerWeek: -1.5 });
    expect(r.preview.base.flags.deficitCapped).toBe(true);
    expect(Math.abs(r.effectiveRateKgPerWeek)).toBeLessThan(1.5);
    expect(r.weeksToTarget!).toBeGreaterThan(5 / 1.5);
    expect(r.pace).toBe('aggressive');
  });

  it('maintain: no target date, flat curve', () => {
    const r = computeGoalProjection({
      ...baseInput,
      goal: 'maintain',
      goalRateKgPerWeek: 0,
    });
    expect(r.weeksToTarget).toBeNull();
    expect(r.targetDate).toBeNull();
    expect(r.effectiveRateKgPerWeek).toBe(0);
    expect(r.curve).toHaveLength(2);
  });

  it('no target weight: kcal delta still computed, no date', () => {
    const r = computeGoalProjection({ ...baseInput, targetWeightKg: null });
    expect(r.dailyDeltaKcal).toBeLessThan(0);
    expect(r.targetDate).toBeNull();
  });
});
