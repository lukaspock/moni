import { TIDE_PERIOD_MS, surfaceBaseY, tideLevel, waveY } from './tideMath';

describe('tideMath', () => {
  it('level stays within 0.34..0.66 and loops seamlessly', () => {
    for (let i = 0; i <= 100; i++) {
      const l = tideLevel(i / 100);
      expect(l).toBeGreaterThanOrEqual(0.34 - 1e-9);
      expect(l).toBeLessThanOrEqual(0.66 + 1e-9);
    }
    expect(tideLevel(0)).toBeCloseTo(tideLevel(1));
    expect(TIDE_PERIOD_MS % 1600).toBe(0);
  });
  it('wave loops seamlessly and is bounded by amp', () => {
    expect(waveY(10, 0, 100, 50, 4, 0)).toBeCloseTo(
      waveY(10, 0, 100, 50, 4, 1),
    );
    for (let x = 0; x <= 100; x += 7) {
      expect(Math.abs(waveY(x, 0, 100, 50, 4, 0.3) - 50)).toBeLessThanOrEqual(
        4 + 1e-9,
      );
    }
  });
  it('surface y: empty at the bottom, full at the top', () => {
    expect(surfaceBaseY(50, 40, 0)).toBe(90);
    expect(surfaceBaseY(50, 40, 1)).toBe(10);
    expect(surfaceBaseY(50, 40, 0.5)).toBe(50);
    expect(surfaceBaseY(50, 40, 2)).toBe(10);
  });
});
