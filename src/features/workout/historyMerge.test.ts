import {
  localDateOf,
  mergeWorkoutRows,
  rowsForLocalDate,
  type WorkoutListRow,
} from './historyMerge';

function row(
  id: string,
  started_at: string,
  extra: Partial<WorkoutListRow> = {},
): WorkoutListRow {
  return {
    id,
    started_at,
    ended_at: null,
    category: 'strength',
    kcal_burned: null,
    routine_id: null,
    healthkit_uuid: null,
    ...extra,
  };
}

describe('mergeWorkoutRows', () => {
  it('hides rows with a queued delete', () => {
    const out = mergeWorkoutRows(
      [
        row('a', '2026-10-01T10:00:00+00:00'),
        row('b', '2026-10-02T10:00:00+00:00'),
      ],
      [],
      new Set(['a']),
      'u',
    );
    expect(out.map((r) => r.id)).toEqual(['b']);
  });

  it('applies queued upserts over server rows (e.g. a Health merge changes kcal)', () => {
    const out = mergeWorkoutRows(
      [row('a', '2026-10-01T10:00:00+00:00', { kcal_burned: 100 })],
      [{ id: 'a', user_id: 'u', kcal_burned: 250, healthkit_uuid: 'hk' }],
      new Set(),
      'u',
    );
    expect(out[0].kcal_burned).toBe(250);
    expect(out[0].healthkit_uuid).toBe('hk');
    expect(out[0].started_at).toBe('2026-10-01T10:00:00+00:00');
  });

  it('adds offline-finished workouts and ignores other users / incomplete patches', () => {
    const out = mergeWorkoutRows(
      [],
      [
        {
          id: 'n',
          user_id: 'u',
          started_at: '2026-10-02T08:00:00.000Z',
          category: 'cardio',
        },
        {
          id: 'x',
          user_id: 'other',
          started_at: '2026-10-02T08:00:00.000Z',
          category: 'cardio',
        },
        { id: 'p', user_id: 'u', kcal_burned: 5 },
      ],
      new Set(),
      'u',
    );
    expect(out.map((r) => r.id)).toEqual(['n']);
    expect(out[0].kcal_burned).toBeNull();
  });

  it('sorts by real instant even when the ISO formats differ', () => {
    // string order would put '...10:00:00+00:00' after '...10:00:00.000Z' wrongly and mis-order mixed offsets
    const out = mergeWorkoutRows(
      [row('server', '2026-10-02T10:00:00+00:00')],
      [
        {
          id: 'local',
          user_id: 'u',
          started_at: '2026-10-02T10:30:00.000Z',
          category: 'strength',
        },
      ],
      new Set(),
      'u',
    );
    expect(out.map((r) => r.id)).toEqual(['local', 'server']);
    const mixed = mergeWorkoutRows(
      [
        row('a', '2026-10-02T12:00:00+02:00'),
        row('b', '2026-10-02T09:30:00+00:00'),
      ],
      [],
      new Set(),
      'u',
    );
    // a = 10:00Z is newer than b = 09:30Z although '09…' < '12…' as strings
    expect(mixed.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('rowsForLocalDate', () => {
  it('keeps rows of the local date, oldest first', () => {
    const noon = new Date(2026, 9, 2, 12, 0).toISOString();
    const evening = new Date(2026, 9, 2, 19, 0).toISOString();
    const other = new Date(2026, 9, 3, 1, 0).toISOString();
    const rows = mergeWorkoutRows(
      [row('e', evening), row('n', noon), row('o', other)],
      [],
      new Set(),
      'u',
    );
    expect(rowsForLocalDate(rows, '2026-10-02').map((r) => r.id)).toEqual([
      'n',
      'e',
    ]);
    expect(localDateOf(other)).toBe('2026-10-03');
  });
});
