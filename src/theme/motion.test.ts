import { EXIT_FACTOR, exit, stagger, staggerDelay } from './motion';

jest.mock('react-native-reanimated', () => ({
  Easing: { bezier: () => ({}), linear: () => 0 },
  ReduceMotion: { System: 'system' },
}));

describe('motion tokens', () => {
  it('shortens exits', () => {
    expect(EXIT_FACTOR).toBe(0.65);
    expect(exit(280)).toBe(182);
  });

  it('caps the total stagger delay', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(2 * stagger.base);
    expect(staggerDelay(50)).toBe(stagger.max);
    expect(staggerDelay(-3)).toBe(0);
  });
});
