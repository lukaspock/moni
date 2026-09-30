import {
  calculateBMI,
  classifyPace,
  dailyDeltaToWeeklyRate,
  defaultGoalRate,
  healthyWeightRange,
  isAcceptableTargetWeight,
  projectDateAfterWeeks,
  projectWeightCurve,
  roundToHalf,
  suggestTargetWeight,
  targetWeightBounds,
  validateTargetWeight,
  weeksToReachTarget,
  weightForBMI,
} from './projection';
import { weeklyRateToDailyDelta } from './targets';

describe('defaultGoalRate', () => {
  it('keeps a rate that still fits the goal, otherwise uses the default', () => {
    expect(defaultGoalRate('lose', -0.75)).toBe(-0.75);
    expect(defaultGoalRate('lose', 0.25)).toBe(-0.5);
    expect(defaultGoalRate('gain', -0.5)).toBe(0.25);
    expect(defaultGoalRate('gain', 0.4)).toBe(0.4);
    expect(defaultGoalRate('maintain', -0.5)).toBe(0);
  });
});

describe('BMI helpers', () => {
  it('computes BMI and its inverse', () => {
    expect(calculateBMI(80, 200)).toBeCloseTo(20, 5);
    expect(weightForBMI(20, 200)).toBeCloseTo(80, 5);
  });

  it('healthy range for 180 cm is ~59.9–80.7 kg', () => {
    const { minKg, maxKg } = healthyWeightRange(180);
    expect(minKg).toBeCloseTo(59.94, 1);
    expect(maxKg).toBeCloseTo(80.68, 1);
  });

  it('roundToHalf', () => {
    expect(roundToHalf(72.26)).toBe(72.5);
    expect(roundToHalf(72.24)).toBe(72);
  });
});

describe('dailyDeltaToWeeklyRate', () => {
  it('is the inverse of weeklyRateToDailyDelta', () => {
    expect(dailyDeltaToWeeklyRate(weeklyRateToDailyDelta(-0.5))).toBeCloseTo(
      -0.5,
      10,
    );
    expect(dailyDeltaToWeeklyRate(-550)).toBeCloseTo(-0.5, 10);
  });
});

describe('targetWeightBounds', () => {
  it('lose: BMI-17 floor up to current − 0.5', () => {
    const b = targetWeightBounds({
      goal: 'lose',
      currentWeightKg: 90,
      heightCm: 180,
    });
    expect(b.maxKg).toBe(89.5);
    expect(b.minKg).toBe(55.5); // 17 × 1.8² = 55.08 → rounded up to 55.5
  });

  it('lose: never inverts when already at the floor', () => {
    const b = targetWeightBounds({
      goal: 'lose',
      currentWeightKg: 50,
      heightCm: 180,
    });
    expect(b.minKg).toBeLessThanOrEqual(b.maxKg);
  });

  it('gain: current + 0.5 up to current + 25', () => {
    expect(
      targetWeightBounds({ goal: 'gain', currentWeightKg: 70, heightCm: 180 }),
    ).toEqual({ minKg: 70.5, maxKg: 95 });
  });

  it('maintain: pinned to current', () => {
    expect(
      targetWeightBounds({
        goal: 'maintain',
        currentWeightKg: 70.2,
        heightCm: 180,
      }),
    ).toEqual({
      minKg: 70,
      maxKg: 70,
    });
  });
});

describe('suggestTargetWeight', () => {
  it('lose: ~10 % less for an overweight person', () => {
    expect(
      suggestTargetWeight({
        goal: 'lose',
        currentWeightKg: 100,
        heightCm: 180,
      }),
    ).toBe(90);
  });

  it('lose: not below BMI 21 for someone already lean', () => {
    // BMI-21 weight at 180 cm = 68.04 → 68
    expect(
      suggestTargetWeight({ goal: 'lose', currentWeightKg: 72, heightCm: 180 }),
    ).toBe(68);
  });

  it('lose: stays below current even if current is under BMI 21', () => {
    const s = suggestTargetWeight({
      goal: 'lose',
      currentWeightKg: 62,
      heightCm: 180,
    });
    expect(s).toBeLessThan(62);
  });

  it('gain: ~5 % more', () => {
    expect(
      suggestTargetWeight({ goal: 'gain', currentWeightKg: 70, heightCm: 180 }),
    ).toBe(73.5);
  });
});

describe('validateTargetWeight', () => {
  const ctx = { currentWeightKg: 80, heightCm: 180 };

  it('flags the wrong direction', () => {
    expect(
      validateTargetWeight({ ...ctx, goal: 'lose', targetWeightKg: 85 }),
    ).toBe('wrongDirection');
    expect(
      validateTargetWeight({ ...ctx, goal: 'gain', targetWeightKg: 75 }),
    ).toBe('wrongDirection');
  });

  it('rejects BMI < 17 and warns for 17–18.5', () => {
    expect(
      validateTargetWeight({ ...ctx, goal: 'lose', targetWeightKg: 54 }),
    ).toBe('tooLow');
    expect(
      validateTargetWeight({ ...ctx, goal: 'lose', targetWeightKg: 58 }),
    ).toBe('underweight');
    expect(
      validateTargetWeight({ ...ctx, goal: 'lose', targetWeightKg: 72 }),
    ).toBe('ok');
  });

  it('maintain is always ok', () => {
    expect(
      validateTargetWeight({ ...ctx, goal: 'maintain', targetWeightKg: 10 }),
    ).toBe('ok');
  });
});

describe('isAcceptableTargetWeight', () => {
  it('enforces the BMI floor and DB bounds', () => {
    expect(isAcceptableTargetWeight(70, 180)).toBe(true);
    expect(isAcceptableTargetWeight(50, 180)).toBe(false); // BMI 15.4
    expect(isAcceptableTargetWeight(600, 180)).toBe(false);
    expect(isAcceptableTargetWeight(70, 0)).toBe(false);
  });
});

describe('weeksToReachTarget / projectDateAfterWeeks', () => {
  it('computes weeks at a constant rate', () => {
    expect(weeksToReachTarget(80, 75, -0.5)).toBe(10);
    expect(weeksToReachTarget(70, 73, 0.25)).toBe(12);
    expect(weeksToReachTarget(80, 80, -0.5)).toBe(0);
  });

  it('is null when unreachable', () => {
    expect(weeksToReachTarget(80, 75, 0)).toBeNull();
    expect(weeksToReachTarget(80, 75, 0.5)).toBeNull();
  });

  it('adds whole days', () => {
    const d = projectDateAfterWeeks(new Date(2026, 8, 29), 10);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 8]);
  });
});

describe('classifyPace', () => {
  it('loss thresholds (% bodyweight/week)', () => {
    expect(classifyPace(-0.4, 100)).toBe('gentle');
    expect(classifyPace(-0.5, 100)).toBe('gentle');
    expect(classifyPace(-0.8, 100)).toBe('balanced');
    expect(classifyPace(-1.0, 80)).toBe('aggressive');
  });

  it('gain thresholds are stricter', () => {
    expect(classifyPace(0.15, 70)).toBe('gentle');
    expect(classifyPace(0.3, 70)).toBe('balanced');
    expect(classifyPace(0.5, 70)).toBe('aggressive');
  });

  it('zero rate is gentle', () => {
    expect(classifyPace(0, 70)).toBe('gentle');
  });
});

describe('projectWeightCurve', () => {
  it('goes linearly from current to target, then plateaus', () => {
    const pts = projectWeightCurve({
      currentWeightKg: 80,
      targetWeightKg: 75,
      rateKgPerWeek: -0.5,
      samples: 10,
    });
    expect(pts[0]).toEqual({ week: 0, weightKg: 80 });
    expect(pts[10]).toEqual({ week: 10, weightKg: 75 });
    expect(pts[5].weightKg).toBeCloseTo(77.5, 10);
    const tail = pts[pts.length - 1];
    expect(tail.weightKg).toBe(75);
    expect(tail.week).toBe(12);
    // monotonic weeks
    for (let i = 1; i < pts.length; i += 1)
      expect(pts[i].week).toBeGreaterThan(pts[i - 1].week);
  });

  it('flat line when there is no reachable target', () => {
    expect(
      projectWeightCurve({
        currentWeightKg: 80,
        targetWeightKg: null,
        rateKgPerWeek: 0,
      }),
    ).toEqual([
      { week: 0, weightKg: 80 },
      { week: 12, weightKg: 80 },
    ]);
    expect(
      projectWeightCurve({
        currentWeightKg: 80,
        targetWeightKg: 75,
        rateKgPerWeek: 0.5,
      }),
    ).toHaveLength(2);
  });
});
