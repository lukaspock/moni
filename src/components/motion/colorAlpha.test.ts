import { withAlpha } from './colorAlpha';

describe('withAlpha', () => {
  it('converts hex', () => {
    expect(withAlpha('#C6F135', 0.5)).toBe('rgba(198,241,53,0.5)');
    expect(withAlpha('#fff', 1)).toBe('rgba(255,255,255,1)');
  });
  it('multiplies an existing alpha channel', () => {
    expect(withAlpha('#00000080', 0.5)).toBe('rgba(0,0,0,0.251)');
  });
  it('passes non-hex through and clamps', () => {
    expect(withAlpha('rgba(1,2,3,0.4)', 0.2)).toBe('rgba(1,2,3,0.4)');
    expect(withAlpha('#000000', 5)).toBe('rgba(0,0,0,1)');
  });
});
