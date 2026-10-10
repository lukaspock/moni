import {
  largestMacroGap,
  pickFitSuggestions,
  shouldShowFitCard,
  type FitCandidate,
  type FitMacros,
} from './fitSuggestions';

const TARGETS: FitMacros = { kcal: 2400, proteinG: 150, carbsG: 280, fatG: 75 };

function cand(
  key: string,
  kcal: number,
  proteinG: number,
  carbsG = 0,
  fatG = 0,
): FitCandidate<string> {
  return { key, kcal, proteinG, carbsG, fatG, ref: key };
}

describe('largestMacroGap', () => {
  it('picks the macro with the largest relative gap', () => {
    // protein 90/150 missing 40 %, carbs 250/280 ~11 %, fat 70/75 ~7 %
    const gap = largestMacroGap(TARGETS, {
      kcal: 1800,
      proteinG: 90,
      carbsG: 250,
      fatG: 70,
    });
    expect(gap).toEqual({ macro: 'protein', missingG: 60 });
  });

  it('returns null when every target is met', () => {
    expect(
      largestMacroGap(TARGETS, {
        kcal: 2000,
        proteinG: 160,
        carbsG: 300,
        fatG: 80,
      }),
    ).toBeNull();
  });
});

describe('pickFitSuggestions', () => {
  const consumed: FitMacros = {
    kcal: 1800,
    proteinG: 90,
    carbsG: 250,
    fatG: 70,
  };
  // 600 kcal left, 60 g protein missing

  it('prefers entries that close the protein gap and fit the kcal', () => {
    const result = pickFitSuggestions({
      candidates: [
        cand('skyr', 200, 30, 12, 1),
        cand('pasta', 550, 18, 90, 12),
        cand('chicken', 450, 55, 20, 12),
        cand('pizza', 900, 40, 100, 35), // does not fit
        cand('apple', 80, 0, 20, 0),
      ],
      targets: TARGETS,
      consumed,
      careFlagged: false,
    });
    expect(result.map((s) => s.candidate.key)).toEqual([
      'chicken',
      'skyr',
      'pasta',
    ]);
    expect(result[0].focus).toBe('protein');
    expect(result[0].kcalAfter).toBe(150);
    // chicken: coverage 55/60, density 220/450, fill 450/600
    expect(result[0].parts.coverage).toBeCloseTo(55 / 60);
    expect(result[0].parts.density).toBeCloseTo(220 / 450);
    expect(result[0].parts.fill).toBeCloseTo(0.75);
    expect(result[0].score).toBeCloseTo(
      0.6 * (55 / 60) + 0.3 * (220 / 450) + 0.1 * 0.75,
    );
  });

  it('does not reward overshooting the gap', () => {
    const result = pickFitSuggestions({
      candidates: [cand('big', 500, 100)],
      targets: TARGETS,
      consumed,
      careFlagged: false,
    });
    expect(result[0].parts.coverage).toBe(1);
  });

  it('returns at most three, ignores duplicates and zero-kcal entries', () => {
    const result = pickFitSuggestions({
      candidates: [
        cand('a', 100, 10),
        cand('a', 100, 10),
        cand('b', 100, 12),
        cand('c', 100, 14),
        cand('d', 100, 16),
        cand('water', 0, 0),
      ],
      targets: TARGETS,
      consumed,
      careFlagged: false,
    });
    expect(result.map((s) => s.candidate.key)).toEqual(['d', 'c', 'b']);
  });

  it('suggests nothing with fewer than 150 kcal left', () => {
    expect(
      pickFitSuggestions({
        candidates: [cand('skyr', 100, 15)],
        targets: TARGETS,
        consumed: { ...consumed, kcal: 2260 },
        careFlagged: false,
      }),
    ).toEqual([]);
  });

  it('suggests nothing while the care signal is active', () => {
    expect(
      pickFitSuggestions({
        candidates: [cand('skyr', 200, 30)],
        targets: TARGETS,
        consumed,
        careFlagged: true,
      }),
    ).toEqual([]);
  });

  it('ranks by fill when no macro gap is left', () => {
    const result = pickFitSuggestions({
      candidates: [cand('small', 100, 5), cand('large', 400, 5)],
      targets: TARGETS,
      consumed: { kcal: 1800, proteinG: 160, carbsG: 300, fatG: 80 },
      careFlagged: false,
    });
    expect(result[0].candidate.key).toBe('large');
    expect(result[0].focus).toBeNull();
  });
});

describe('shouldShowFitCard', () => {
  it('shows from 14:00 or with at least 400 kcal left', () => {
    expect(shouldShowFitCard({ hour: 9, remainingKcal: 300 })).toBe(false);
    expect(shouldShowFitCard({ hour: 9, remainingKcal: 400 })).toBe(true);
    expect(shouldShowFitCard({ hour: 14, remainingKcal: 200 })).toBe(true);
  });
});
