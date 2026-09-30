import {
  calculateBaseTarget,
  calculateWorkoutBonus,
  weeklyRateToDailyDelta,
  KCAL_PER_KG,
  MIN_KCAL_MALE,
  MIN_KCAL_FEMALE,
} from './targets';

describe('weeklyRateToDailyDelta', () => {
  it('converts kg/week to kcal/day', () => {
    // -0.5 kg/week * 7700 / 7 = -550
    expect(weeklyRateToDailyDelta(-0.5)).toBeCloseTo(-550, 5);
  });

  it('uses the documented kcal-per-kg constant', () => {
    expect(KCAL_PER_KG).toBe(7700);
  });
});

describe('calculateBaseTarget', () => {
  it('applies an unclamped deficit', () => {
    // TDEE 2500, -0.3 kg/week -> delta = -330, within 25% guardrail (max -625)
    const result = calculateBaseTarget({
      tdee: 2500,
      sex: 'male',
      goalRateKgPerWeek: -0.3,
    });
    expect(result.baseKcal).toBe(2170);
    expect(result.flags.deficitCapped).toBe(false);
    expect(result.flags.minimumFloorApplied).toBe(false);
  });

  it('caps a deficit exceeding 25% of TDEE', () => {
    // TDEE 2000, -1.5 kg/week -> raw delta = -1650, max deficit = -500
    const result = calculateBaseTarget({
      tdee: 2000,
      sex: 'male',
      goalRateKgPerWeek: -1.5,
    });
    expect(result.flags.deficitCapped).toBe(true);
    expect(result.appliedDeltaKcal).toBe(-500);
    expect(result.baseKcal).toBe(1500);
  });

  it('caps a surplus above +500 kcal', () => {
    // TDEE 2200, +1.0 kg/week -> raw delta = +1100
    const result = calculateBaseTarget({
      tdee: 2200,
      sex: 'female',
      goalRateKgPerWeek: 1.0,
    });
    expect(result.flags.surplusCapped).toBe(true);
    expect(result.appliedDeltaKcal).toBe(500);
    expect(result.baseKcal).toBe(2700);
  });

  it('raises the result to the male floor of 1500 kcal', () => {
    const result = calculateBaseTarget({
      tdee: 1400,
      sex: 'male',
      goalRateKgPerWeek: -1.0,
    });
    expect(result.flags.minimumFloorApplied).toBe(true);
    expect(result.baseKcal).toBe(MIN_KCAL_MALE);
  });

  it('raises the result to the female floor of 1200 kcal', () => {
    const result = calculateBaseTarget({
      tdee: 1100,
      sex: 'female',
      goalRateKgPerWeek: -0.5,
    });
    expect(result.flags.minimumFloorApplied).toBe(true);
    expect(result.baseKcal).toBe(MIN_KCAL_FEMALE);
  });

  it('applies no delta on maintenance', () => {
    const result = calculateBaseTarget({
      tdee: 2000,
      sex: 'male',
      goalRateKgPerWeek: 0,
    });
    expect(result.baseKcal).toBe(2000);
    expect(result.flags).toEqual({
      deficitCapped: false,
      surplusCapped: false,
      minimumFloorApplied: false,
    });
  });
});

describe('calculateWorkoutBonus', () => {
  const base = 2000;

  it('gives no bonus on a rest day', () => {
    const result = calculateWorkoutBonus({
      baseKcal: base,
      isTrainingDay: false,
      workoutCompleted: false,
      isDayOver: false,
    });
    expect(result).toEqual({
      workoutBonusKcal: 0,
      isProvisional: false,
      dailyLimitKcal: base,
    });
  });

  it('gives a provisional bonus from expected_kcal on a pending planned training day', () => {
    const result = calculateWorkoutBonus({
      baseKcal: base,
      isTrainingDay: true,
      plannedExpectedKcal: 400,
      workoutCompleted: false,
      isDayOver: false,
    });
    expect(result.isProvisional).toBe(true);
    expect(result.workoutBonusKcal).toBe(280); // 400 * 0.7
    expect(result.dailyLimitKcal).toBe(2280);
  });

  it('uses the actual kcal burned once the workout is logged, with a custom eat-back factor', () => {
    const result = calculateWorkoutBonus({
      baseKcal: base,
      isTrainingDay: true,
      plannedExpectedKcal: 400,
      workoutCompleted: true,
      actualKcalBurned: 500,
      isDayOver: false,
      eatBackFactor: 0.5,
    });
    expect(result.isProvisional).toBe(false);
    expect(result.workoutBonusKcal).toBe(250);
    expect(result.dailyLimitKcal).toBe(2250);
  });

  it('drops the provisional bonus in the evening when a planned workout was skipped', () => {
    const result = calculateWorkoutBonus({
      baseKcal: base,
      isTrainingDay: true,
      plannedExpectedKcal: 400,
      workoutCompleted: false,
      isDayOver: true,
    });
    expect(result.workoutBonusKcal).toBe(0);
    expect(result.isProvisional).toBe(false);
    expect(result.dailyLimitKcal).toBe(base);
  });

  it('adds a bonus for an unplanned workout on a rest day', () => {
    const result = calculateWorkoutBonus({
      baseKcal: base,
      isTrainingDay: false,
      workoutCompleted: true,
      actualKcalBurned: 300,
      isDayOver: false,
    });
    expect(result.workoutBonusKcal).toBe(210); // 300 * 0.7
    expect(result.isProvisional).toBe(false);
  });
});
