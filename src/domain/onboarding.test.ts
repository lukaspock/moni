import { computeOnboardingPreview, estimateDefaultWorkoutExpectedKcal } from './onboarding';

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
    expect(result.trainingDay.totalKcal).toBeGreaterThan(result.restDay.totalKcal);
  });

  it('training day protein is higher than rest day protein (2.0 vs 1.6 g/kg + deficit bonus)', () => {
    const result = computeOnboardingPreview(baseInput);
    expect(result.trainingDay.proteinG).toBeGreaterThan(result.restDay.proteinG);
  });

  it('with no training days, training/rest previews match (no bonus)', () => {
    const result = computeOnboardingPreview({ ...baseInput, hasTrainingDays: false });
    expect(result.trainingDay.workoutBonusKcal).toBe(0);
    expect(result.trainingDay.totalKcal).toBe(result.restDay.totalKcal);
  });
});
