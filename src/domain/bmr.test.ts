import {
  calculateBMR,
  ageFromBirthDate,
  MALE_BMR_OFFSET,
  FEMALE_BMR_OFFSET,
} from './bmr';

describe('calculateBMR', () => {
  it('matches hand-calculated value for a male', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR('male', 80, 180, 30)).toBeCloseTo(1780, 5);
  });

  it('matches hand-calculated value for a female', () => {
    // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    expect(calculateBMR('female', 60, 165, 25)).toBeCloseTo(1345.25, 5);
  });

  it('uses the documented sex offsets', () => {
    expect(MALE_BMR_OFFSET).toBe(5);
    expect(FEMALE_BMR_OFFSET).toBe(-161);
  });
});

describe('ageFromBirthDate', () => {
  it('computes full years when birthday already passed this year', () => {
    const birth = new Date(1996, 0, 15); // Jan 15 1996
    const today = new Date(2026, 5, 1); // Jun 1 2026
    expect(ageFromBirthDate(birth, today)).toBe(30);
  });

  it('subtracts one year when birthday has not occurred yet this year', () => {
    const birth = new Date(1996, 11, 15); // Dec 15 1996
    const today = new Date(2026, 5, 1); // Jun 1 2026
    expect(ageFromBirthDate(birth, today)).toBe(29);
  });

  it('handles the birthday being today exactly', () => {
    const birth = new Date(2000, 5, 1);
    const today = new Date(2026, 5, 1);
    expect(ageFromBirthDate(birth, today)).toBe(26);
  });
});
