import {
  calculateSessionKcal,
  deriveSessionCategory,
  displayToStored,
  fillFromPrevious,
  formatClock,
  IDLE_CUTOFF_MINUTES,
  isIntegerUnit,
  parseNumericInput,
  resolveSessionEnd,
  sameDisplayValue,
  setInputUnit,
  storedToDisplay,
} from './workoutSession';

describe('parseNumericInput', () => {
  it('accepts comma and dot, and a trailing separator while typing', () => {
    expect(parseNumericInput('82,5')).toBe(82.5);
    expect(parseNumericInput('82.5')).toBe(82.5);
    expect(parseNumericInput('8.')).toBe(8);
    expect(parseNumericInput('.5')).toBe(0.5);
  });
  it('rejects empty, junk and negatives', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('.')).toBeNull();
    expect(parseNumericInput('abc')).toBeNull();
    expect(parseNumericInput('-5')).toBeNull();
    expect(parseNumericInput('1.2.3')).toBeNull();
  });
  it('floors for integer fields and clamps huge values', () => {
    expect(parseNumericInput('8.7', true)).toBe(8);
    expect(parseNumericInput('99999999')).toBe(9999);
  });
});

describe('units (DB is metric)', () => {
  it('picks the right unit per field', () => {
    expect(setInputUnit('weightKg', 'weight_reps', 'metric')).toBe('kg');
    expect(setInputUnit('weightKg', 'weight_reps', 'imperial')).toBe('lb');
    expect(setInputUnit('durationS', 'duration', 'metric')).toBe('sec');
    expect(setInputUnit('durationS', 'distance_duration', 'metric')).toBe(
      'min',
    );
    expect(setInputUnit('distanceM', 'distance_duration', 'imperial')).toBe(
      'mi',
    );
    expect(isIntegerUnit('reps')).toBe(true);
    expect(isIntegerUnit('kg')).toBe(false);
  });
  it('round-trips pounds without drifting the displayed number', () => {
    for (const lb of [45, 135, 222.5, 1.5]) {
      const kg = displayToStored(lb, 'lb');
      expect(storedToDisplay(kg, 'lb')).toBe(lb);
    }
  });
  it('converts minutes, km and miles to seconds / metres', () => {
    expect(displayToStored(30, 'min')).toBe(1800);
    expect(storedToDisplay(1800, 'min')).toBe(30);
    expect(displayToStored(5, 'km')).toBe(5000);
    expect(displayToStored(1, 'mi')).toBeCloseTo(1609.3, 1);
    expect(storedToDisplay(5000, 'km')).toBe(5);
  });
  it('stores whole reps and seconds', () => {
    expect(displayToStored(8.6, 'reps')).toBe(9);
    expect(displayToStored(45.4, 'sec')).toBe(45);
  });
  it('compares as displayed', () => {
    expect(sameDisplayValue(61.2349, 61.2351, 'lb')).toBe(true);
    expect(sameDisplayValue(null, null, 'kg')).toBe(true);
    expect(sameDisplayValue(null, 1, 'kg')).toBe(false);
  });
});

describe('resolveSessionEnd', () => {
  const start = Date.parse('2026-10-01T10:00:00Z');
  const min = 60_000;
  it('uses now for a normal session', () => {
    expect(resolveSessionEnd(start, start + 50 * min, start + 55 * min)).toBe(
      start + 55 * min,
    );
  });
  it('closes a forgotten session shortly after the last checked set', () => {
    const last = start + 50 * min;
    const now = last + (IDLE_CUTOFF_MINUTES + 1) * min;
    expect(resolveSessionEnd(start, last, now)).toBe(last + 5 * min);
  });
  it('keeps now when nothing was checked yet and never ends before the start', () => {
    expect(resolveSessionEnd(start, null, start + 200 * min)).toBe(
      start + 200 * min,
    );
    expect(resolveSessionEnd(start, null, start - 5)).toBe(start);
  });
});

describe('deriveSessionCategory', () => {
  it('prefers strength, then the majority, then the fallback', () => {
    expect(deriveSessionCategory(['cardio', 'strength'])).toBe('strength');
    expect(deriveSessionCategory(['cardio', 'sport', 'sport'])).toBe('sport');
    expect(deriveSessionCategory(['cardio'])).toBe('cardio');
    expect(deriveSessionCategory([], 'other')).toBe('other');
  });
});

describe('calculateSessionKcal', () => {
  it('uses density MET for strength and the given MET otherwise', () => {
    const strength = calculateSessionKcal({
      category: 'strength',
      completedSets: 18,
      durationMinutes: 60,
      bodyWeightKg: 80,
      nonStrengthMet: 7,
    });
    expect(strength).toBeGreaterThan(200);
    expect(strength).toBeLessThan(500);
    expect(
      calculateSessionKcal({
        category: 'cardio',
        completedSets: 1,
        durationMinutes: 30,
        bodyWeightKg: 70,
        nonStrengthMet: 8,
      }),
    ).toBe(280);
  });
  it('falls back to 75 kg', () => {
    expect(
      calculateSessionKcal({
        category: 'cardio',
        completedSets: 0,
        durationMinutes: 60,
        bodyWeightKg: null,
        nonStrengthMet: 4,
      }),
    ).toBe(300);
  });
});

describe('fillFromPrevious', () => {
  it('only fills empty fields', () => {
    expect(
      fillFromPrevious(
        { weightKg: 50, reps: null },
        { weightKg: 60, reps: 8 },
        ['weightKg', 'reps'],
      ),
    ).toEqual({ reps: 8 });
    expect(fillFromPrevious({ reps: null }, undefined, ['reps'])).toEqual({});
  });
});

describe('formatClock', () => {
  it('formats m:ss and h:mm:ss', () => {
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(605)).toBe('10:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(-3)).toBe('0:00');
  });
});
