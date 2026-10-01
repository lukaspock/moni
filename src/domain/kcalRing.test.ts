import { computeKcalRingModel } from './kcalRing';

describe('computeKcalRingModel', () => {
  it('handles a normal day without bonus', () => {
    const m = computeKcalRingModel({
      eatenKcal: 500,
      baseKcal: 2000,
      bonusKcal: 0,
    });
    expect(m.limitKcal).toBe(2000);
    expect(m.remainingKcal).toBe(1500);
    expect(m.isOver).toBe(false);
    expect(m.fillShare).toBeCloseTo(0.25);
    expect(m.baseShare).toBe(1);
    expect(m.bonusShare).toBe(0);
  });

  it('splits base and bonus shares of the total limit', () => {
    const m = computeKcalRingModel({
      eatenKcal: 2200,
      baseKcal: 2000,
      bonusKcal: 500,
    });
    expect(m.baseShare).toBeCloseTo(0.8);
    expect(m.bonusShare).toBeCloseTo(0.2);
    expect(m.fillShare).toBeCloseTo(0.88);
    expect(m.remainingKcal).toBe(300);
  });

  it('reports overflow and clamps the fill', () => {
    const m = computeKcalRingModel({
      eatenKcal: 2300,
      baseKcal: 2000,
      bonusKcal: 0,
    });
    expect(m.isOver).toBe(true);
    expect(m.overKcal).toBe(300);
    expect(m.remainingKcal).toBe(-300);
    expect(m.fillShare).toBe(1);
  });

  it('is not over exactly at the limit', () => {
    const m = computeKcalRingModel({
      eatenKcal: 2000,
      baseKcal: 2000,
      bonusKcal: 0,
    });
    expect(m.isOver).toBe(false);
    expect(m.fillShare).toBe(1);
    expect(m.remainingKcal).toBe(0);
  });

  it('handles zero / invalid values', () => {
    const empty = computeKcalRingModel({
      eatenKcal: 0,
      baseKcal: 0,
      bonusKcal: 0,
    });
    expect(empty.isOver).toBe(false);
    expect(empty.fillShare).toBe(0);
    const noLimit = computeKcalRingModel({
      eatenKcal: 300,
      baseKcal: 0,
      bonusKcal: 0,
    });
    expect(noLimit.isOver).toBe(true);
    expect(noLimit.fillShare).toBe(1);
    const nan = computeKcalRingModel({
      eatenKcal: NaN,
      baseKcal: 2000,
      bonusKcal: -5,
    });
    expect(nan.fillShare).toBe(0);
    expect(nan.limitKcal).toBe(2000);
  });
});
