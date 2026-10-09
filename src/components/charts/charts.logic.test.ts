import {
  barHeightPx,
  bonusCapStart,
  bonusTrackEnd,
  dailyBarRatio,
  isOverTarget,
  macroBarModel,
  markerLetter,
  paddedDomain,
  ringGeometry,
  ringPoint,
  ringSegments,
  showGlow,
  smoothSegments,
  withAlpha,
} from './charts.logic';

describe('ring', () => {
  it('geometry fits the canvas', () => {
    expect(ringGeometry(264, 22)).toEqual({ cx: 132, cy: 132, r: 121 });
  });
  it('points go clockwise from 12 o clock in the rotated frame', () => {
    const p0 = ringPoint(100, 100, 50, 0);
    expect(p0.x).toBeCloseTo(150);
    const q = ringPoint(100, 100, 50, 0.25);
    expect(q.x).toBeCloseTo(100);
    expect(q.y).toBeCloseTo(150);
  });
  it('segments cap lime at base share', () => {
    expect(ringSegments(0.5, 0.8)).toEqual({
      baseEnd: 0.5,
      bonusEnd: 0.8,
      inBonus: false,
    });
    const s = ringSegments(0.9, 0.8);
    expect(s.baseEnd).toBe(0.8);
    expect(s.bonusEnd).toBe(0.9);
    expect(s.inBonus).toBe(true);
  });
  it('bonus track streams in', () => {
    expect(bonusTrackEnd(0.8, 0)).toBeCloseTo(0.8);
    expect(bonusTrackEnd(0.8, 1)).toBeCloseTo(1);
  });
  it('glow threshold', () => {
    expect(showGlow(0.01)).toBe(false);
    expect(showGlow(0.5)).toBe(true);
  });
});

describe('macro bar', () => {
  it('marker letters follow the locale', () => {
    expect(markerLetter('Protein')).toBe('P');
    expect(markerLetter('Kohlenhydrate')).toBe('K');
    expect(markerLetter('carbs')).toBe('C');
    expect(markerLetter('')).toBe('·');
  });
  it('model', () => {
    expect(macroBarModel(50, 100)).toEqual({
      fill: 0.5,
      targetPos: 1,
      isOver: false,
    });
    expect(macroBarModel(150, 100)).toEqual({
      fill: 1,
      targetPos: 100 / 150,
      isOver: true,
    });
    expect(macroBarModel(10, 0).fill).toBe(0);
  });
});

describe('bars', () => {
  it('ratio and over', () => {
    expect(dailyBarRatio(2000, 2000)).toBeCloseTo(1 / 1.3);
    expect(dailyBarRatio(9999, 2000)).toBe(1);
    expect(dailyBarRatio(100, null)).toBe(0);
    expect(isOverTarget(2300, 2000)).toBe(true);
    expect(isOverTarget(2100, 2000)).toBe(false);
  });
  it('bonus cap starts where base ends', () => {
    expect(bonusCapStart(1900, 2000, 300)).toBeCloseTo(1700 / 2000 / 1.3);
    expect(bonusCapStart(1500, 2000, 300)).toBeNull();
    expect(bonusCapStart(1900, 2000, 0)).toBeNull();
  });
  it('min height', () => {
    expect(barHeightPx(0, 7, 64)).toBe(0);
    expect(barHeightPx(0.01, 7, 64)).toBe(4);
    expect(barHeightPx(7, 7, 64)).toBe(64);
  });
});

describe('line', () => {
  it('smooth segments never overshoot the endpoints', () => {
    const segs = smoothSegments([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(segs).toHaveLength(2);
    for (const s of segs) {
      expect(s.cp1.y).toBeGreaterThanOrEqual(0);
      expect(s.cp1.y).toBeLessThanOrEqual(10);
    }
  });
  it('domain has a minimum span', () => {
    const d = paddedDomain([80, 80]);
    expect(d.max - d.min).toBeGreaterThanOrEqual(1);
    expect(paddedDomain([]).max).toBe(1);
  });
  it('withAlpha', () => {
    expect(withAlpha('#C6F135', 0.5)).toBe('rgba(198,241,53,0.5)');
    expect(withAlpha('rgba(1,2,3,0.1)', 0.5)).toBe('rgba(1,2,3,0.1)');
  });
});
