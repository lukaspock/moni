import {
  DEFAULT_BAR,
  calculatePlates,
  clampBarWeight,
  plateHeightRatio,
  plateTone,
} from './plates';

describe('calculatePlates', () => {
  it('loads 100 kg on a 20 kg bar as 25 + 15 per side', () => {
    expect(calculatePlates(100, 20, 'kg')).toEqual({
      perSide: [25, 15],
      achieved: 100,
      remainder: 0,
      belowBar: false,
    });
  });
  it('uses small change plates (62.5 kg)', () => {
    expect(calculatePlates(62.5, 20, 'kg').perSide).toEqual([20, 1.25]);
  });
  it('handles a lighter bar', () => {
    expect(calculatePlates(40, 15, 'kg').perSide).toEqual([10, 2.5]);
    expect(calculatePlates(40, 10, 'kg').perSide).toEqual([15]);
  });
  it('just the bar', () => {
    expect(calculatePlates(20, 20, 'kg')).toMatchObject({
      perSide: [],
      remainder: 0,
      belowBar: false,
    });
  });
  it('reports a remainder when not exact', () => {
    const r = calculatePlates(61, 20, 'kg');
    expect(r.perSide).toEqual([20]);
    expect(r.achieved).toBe(60);
    expect(r.remainder).toBe(1);
  });
  it('flags weights below the bar', () => {
    expect(calculatePlates(15, 20, 'kg')).toMatchObject({
      perSide: [],
      belowBar: true,
      achieved: 20,
      remainder: -5,
    });
  });
  it('works in lb', () => {
    expect(calculatePlates(225, 45, 'lb').perSide).toEqual([45, 45]);
    expect(calculatePlates(185, 45, 'lb').perSide).toEqual([45, 25]);
    expect(calculatePlates(140, 35, 'lb').perSide).toEqual([45, 5, 2.5]);
    expect(DEFAULT_BAR.lb).toBe(45);
  });
  it('respects a custom plate set and has no float drift', () => {
    const odd = calculatePlates(23.75, 20, 'kg');
    expect(odd.perSide).toEqual([1.25]);
    expect(odd.remainder).toBe(1.25);
    expect(calculatePlates(60, 20, 'kg', [10]).perSide).toEqual([10, 10]);
  });
  it('treats garbage input as 0', () => {
    expect(calculatePlates(Number.NaN, 20, 'kg').belowBar).toBe(true);
  });
});

describe('plate visuals', () => {
  it('maps competition colors', () => {
    expect(plateTone(25, 'kg')).toBe('red');
    expect(plateTone(20, 'kg')).toBe('blue');
    expect(plateTone(1.25, 'kg')).toBe('silver');
    expect(plateTone(45, 'lb')).toBe('blue');
    expect(plateTone(3, 'kg')).toBe('silver');
  });
  it('scales heights relative to the heaviest plate', () => {
    expect(plateHeightRatio(25, 'kg')).toBe(1);
    expect(plateHeightRatio(1.25, 'kg')).toBeGreaterThanOrEqual(0.4);
    expect(plateHeightRatio(10, 'kg')).toBeLessThan(plateHeightRatio(20, 'kg'));
  });
  it('clamps a custom bar weight', () => {
    expect(clampBarWeight(-3, 'kg')).toBe(0);
    expect(clampBarWeight(12.3, 'kg')).toBe(12.5);
    expect(clampBarWeight(500, 'lb')).toBe(110);
  });
});
