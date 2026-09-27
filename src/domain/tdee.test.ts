import { calculateBaseTDEE, NEAT_FACTORS } from './tdee';

describe('calculateBaseTDEE', () => {
  it('applies the sedentary NEAT factor', () => {
    expect(calculateBaseTDEE(1780, 'sedentary')).toBeCloseTo(1780 * 1.2, 5);
  });

  it('applies the light NEAT factor', () => {
    expect(calculateBaseTDEE(1780, 'light')).toBeCloseTo(1780 * 1.375, 5);
  });

  it('applies the moderate NEAT factor', () => {
    expect(calculateBaseTDEE(1780, 'moderate')).toBeCloseTo(1780 * 1.5, 5);
  });

  it('applies the active NEAT factor', () => {
    expect(calculateBaseTDEE(1780, 'active')).toBeCloseTo(1780 * 1.65, 5);
  });

  it('exposes the exact documented factors', () => {
    expect(NEAT_FACTORS).toEqual({
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.5,
      active: 1.65,
    });
  });
});
