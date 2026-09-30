import {
  quickLogKey,
  rankQuickLogCandidates,
  type QuickLogSource,
} from './quickLog';

const NOW = new Date(2026, 8, 30, 12, 30); // 12:30 -> lunch

function log(
  id: string,
  title: string | null,
  mealType: QuickLogSource['mealType'],
  daysAgo: number,
  kcal = 500,
): QuickLogSource {
  const d = new Date(NOW.getTime() - daysAgo * 86_400_000);
  return { id, title, mealType, loggedAt: d.toISOString(), kcal };
}

describe('quickLogKey', () => {
  it('merges same title with similar kcal, case-insensitive', () => {
    expect(quickLogKey(log('a', 'Oats', 'breakfast', 0, 500))).toBe(
      quickLogKey(log('b', ' oats ', 'breakfast', 1, 505)),
    );
  });
  it('does not merge untitled meals', () => {
    expect(quickLogKey(log('a', null, 'lunch', 0))).not.toBe(
      quickLogKey(log('b', null, 'lunch', 0)),
    );
  });
});

describe('rankQuickLogCandidates', () => {
  it('merges duplicates, counts them and keeps the most recent as template', () => {
    const result = rankQuickLogCandidates(
      [log('old', 'Oats', 'lunch', 5), log('new', 'Oats', 'lunch', 1)],
      NOW,
    );
    expect(result).toHaveLength(1);
    expect(result[0].log.id).toBe('new');
    expect(result[0].count).toBe(2);
  });
  it('prefers meals eaten at the current time of day', () => {
    const result = rankQuickLogCandidates(
      [
        log('b', 'Porridge', 'breakfast', 1, 300),
        log('l', 'Pasta', 'lunch', 1, 700),
      ],
      NOW,
    );
    expect(result[0].log.id).toBe('l');
  });
  it('ranks frequent meals above one-offs and respects the limit', () => {
    const logs = [
      log('1', 'A', 'snack', 10, 100),
      log('2', 'B', 'snack', 10, 200),
      log('3', 'B', 'snack', 11, 200),
      log('4', 'B', 'snack', 12, 200),
    ];
    const result = rankQuickLogCandidates(logs, NOW, 1);
    expect(result).toHaveLength(1);
    expect(result[0].log.title).toBe('B');
  });
});
