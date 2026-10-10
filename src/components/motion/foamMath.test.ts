import {
  FOAM_MAX_COUNT,
  createFoam,
  foamAlpha,
  foamMaxLifeMs,
  foamRadius,
  foamX,
  foamY,
  mulberry32,
} from './foamMath';

const origin = { x: 100, y: 200 };

describe('foam', () => {
  it('is deterministic per seed', () => {
    expect(createFoam({ origin, seed: 7 })).toEqual(
      createFoam({ origin, seed: 7 }),
    );
    expect(createFoam({ origin, seed: 7 })).not.toEqual(
      createFoam({ origin, seed: 8 }),
    );
  });
  it('clamps the count to the budget', () => {
    expect(createFoam({ origin, count: 500 })).toHaveLength(FOAM_MAX_COUNT);
    expect(createFoam({ origin, count: -3 })).toHaveLength(0);
    expect(createFoam({ origin })).toHaveLength(24);
  });
  it('particles rise (y decreases) and slow down', () => {
    const [p] = createFoam({ origin, count: 1, seed: 3 });
    expect(foamY(p, 0)).toBe(p.y0);
    expect(foamY(p, 0.5)).toBeLessThan(foamY(p, 0.1));
    const d1 = foamY(p, 0.2) - foamY(p, 0.1);
    const d2 = foamY(p, 1.1) - foamY(p, 1.0);
    expect(Math.abs(d2)).toBeLessThan(Math.abs(d1));
  });
  it('x stays near the origin spread', () => {
    for (const p of createFoam({ origin, seed: 5 })) {
      expect(Math.abs(foamX(p, 1) - origin.x)).toBeLessThan(60);
    }
  });
  it('alpha is 0 at the ends, bounded and positive in between', () => {
    for (const p of createFoam({ origin, seed: 9 })) {
      expect(foamAlpha(p, 0)).toBe(0);
      expect(foamAlpha(p, p.life)).toBe(0);
      const mid = foamAlpha(p, p.life * 0.3);
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThanOrEqual(1);
      expect(foamRadius(p, p.life)).toBeCloseTo(p.r1);
    }
  });
  it('max life within spec range', () => {
    const ms = foamMaxLifeMs(createFoam({ origin }));
    expect(ms).toBeGreaterThanOrEqual(900);
    expect(ms).toBeLessThanOrEqual(1300);
  });
  it('prng is in [0,1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
