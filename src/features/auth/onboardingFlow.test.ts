import { activeSteps, nextOnboardingStep, onboardingProgress } from './onboardingFlow';

describe('onboardingFlow', () => {
  const lose = { goal: 'lose' as const, healthAvailable: true };
  const maintain = { goal: 'maintain' as const, healthAvailable: false };

  it('starts with the name step after welcome', () => {
    expect(nextOnboardingStep('welcome', lose)).toBe('name');
  });

  it('includes target weight + rate for lose/gain', () => {
    expect(nextOnboardingStep('goal', lose)).toBe('target-weight');
    expect(nextOnboardingStep('target-weight', lose)).toBe('rate');
    expect(nextOnboardingStep('rate', lose)).toBe('experience');
  });

  it('skips target weight + rate for maintain', () => {
    expect(nextOnboardingStep('goal', maintain)).toBe('experience');
  });

  it('skips the health primer when HealthKit is unavailable', () => {
    expect(nextOnboardingStep('result', lose)).toBe('health');
    expect(nextOnboardingStep('result', maintain)).toBe('notifications');
  });

  it('ends after notifications', () => {
    expect(nextOnboardingStep('notifications', lose)).toBeNull();
  });

  it('progress runs from 1/N to 1', () => {
    const n = activeSteps(lose).length;
    expect(onboardingProgress('name', lose)).toBeCloseTo(1 / n);
    expect(onboardingProgress('notifications', lose)).toBe(1);
    expect(onboardingProgress('welcome', lose)).toBe(0);
    expect(activeSteps(maintain).length).toBe(n - 3);
  });
});
