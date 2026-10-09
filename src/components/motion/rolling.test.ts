import {
  columnDelayMs,
  countFrames,
  countTable,
  rollingCells,
  tableIndex,
  isBigDigitJump,
} from './rolling';

describe('rollingCells', () => {
  it('splits digits and keys them from the right', () => {
    const cells = rollingCells(1234);
    expect(cells.map((c) => (c.kind === 'digit' ? c.digit : c.char))).toEqual([
      1, 2, 3, 4,
    ]);
    expect(cells.map((c) => c.key)).toEqual(['c3', 'c2', 'c1', 'c0']);
  });
  it('keeps the ones digit key stable when a column is added', () => {
    const a = rollingCells(99).at(-1)!;
    const b = rollingCells(100).at(-1)!;
    expect(a.key).toBe(b.key);
  });
  it('groups thousands and handles decimals', () => {
    const cells = rollingCells(1234.5, {
      fractionDigits: 1,
      groupSeparator: '.',
      decimalSeparator: ',',
    });
    const text = cells.map((c) => (c.kind === 'digit' ? c.digit : c.char));
    expect(text.join('')).toBe('1.234,5');
  });
  it('renders negatives with a sign cell and never "-0"', () => {
    expect(rollingCells(-5)[0]).toMatchObject({ kind: 'sep', char: '-' });
    expect(rollingCells(-0.2).some((c) => c.kind === 'sep')).toBe(false);
  });
  it('is safe for NaN', () => {
    expect(rollingCells(NaN)).toHaveLength(1);
  });
});

describe('count table', () => {
  it('starts at from, ends exactly at to, monotone', () => {
    const t = countTable(0, 100, 10);
    expect(t).toHaveLength(11);
    expect(t[0]).toBe(0);
    expect(t[10]).toBe(100);
    for (let i = 1; i < t.length; i++)
      expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
  });
  it('works downwards', () => {
    const t = countTable(100, 40, 6);
    expect(t[0]).toBe(100);
    expect(t.at(-1)).toBe(40);
  });
  it('bounds frames', () => {
    expect(countFrames(0)).toBe(1);
    expect(countFrames(100000)).toBe(180);
    expect(countFrames(800)).toBe(50);
  });
  it('maps progress to index', () => {
    expect(tableIndex(0, 11)).toBe(0);
    expect(tableIndex(1, 11)).toBe(10);
    expect(tableIndex(0.5, 11)).toBe(5);
    expect(tableIndex(2, 11)).toBe(10);
    expect(tableIndex(0.3, 1)).toBe(0);
  });
});

describe('digit helpers', () => {
  it('stagger is capped', () => {
    expect(columnDelayMs(2, 30)).toBe(60);
    expect(columnDelayMs(100, 30)).toBe(240);
  });
  it('uses timing for big jumps', () => {
    expect(isBigDigitJump(1, 3)).toBe(false);
    expect(isBigDigitJump(0, 9)).toBe(true);
  });
});
