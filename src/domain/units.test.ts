import {
  kgToLb,
  lbToKg,
  cmToInches,
  inchesToCm,
  cmToFeetInches,
  feetInchesToCm,
  kmToMiles,
  milesToKm,
  roundTo,
} from './units';

describe('kg <-> lb', () => {
  it('converts kg to lb', () => {
    expect(kgToLb(1)).toBeCloseTo(2.20462, 4);
  });

  it('round-trips lb -> kg -> lb', () => {
    const lb = 165;
    expect(kgToLb(lbToKg(lb))).toBeCloseTo(lb, 6);
  });
});

describe('cm <-> inches', () => {
  it('converts cm to inches', () => {
    expect(cmToInches(2.54)).toBeCloseTo(1, 6);
  });

  it('round-trips inches -> cm -> inches', () => {
    expect(cmToInches(inchesToCm(70))).toBeCloseTo(70, 6);
  });
});

describe('cmToFeetInches / feetInchesToCm', () => {
  it('splits a height into feet and inches', () => {
    // 180cm ~= 70.87in -> rounds to 71in -> 5ft 11in
    const result = cmToFeetInches(180);
    expect(result).toEqual({ feet: 5, inches: 11 });
  });

  it('converts feet/inches back to cm approximately', () => {
    expect(feetInchesToCm(5, 11)).toBeCloseTo(180.34, 1);
  });
});

describe('km <-> mi', () => {
  it('converts km to miles', () => {
    expect(kmToMiles(1.609344)).toBeCloseTo(1, 6);
  });

  it('round-trips miles -> km -> miles', () => {
    expect(kmToMiles(milesToKm(5))).toBeCloseTo(5, 6);
  });
});

describe('roundTo', () => {
  it('rounds to whole numbers by default', () => {
    expect(roundTo(2.6)).toBe(3);
  });

  it('rounds to a given number of decimals', () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(1.2355, 2)).toBe(1.24);
  });
});
