import { flightOpacity, flightPosition, flightScale } from './flightMath';

describe('flightMath', () => {
  const from = { x: 0, y: 300 };
  const to = { x: 200, y: 100 };
  it('starts at from and ends at to', () => {
    expect(flightPosition(0, from, to)).toEqual(from);
    const end = flightPosition(1, from, to);
    expect(end.x).toBeCloseTo(200);
    expect(end.y).toBeCloseTo(100);
  });
  it('arcs upwards in the middle', () => {
    const mid = flightPosition(0.5, from, to, 28);
    expect(mid.y).toBeCloseTo(200 - 28);
    expect(mid.x).toBeCloseTo(100);
  });
  it('clamps progress and shrinks/dims', () => {
    expect(flightPosition(-1, from, to)).toEqual(from);
    expect(flightScale(1)).toBeCloseTo(0.6);
    expect(flightOpacity(1)).toBeCloseTo(0.85);
    expect(flightScale(0)).toBe(1);
  });
});
