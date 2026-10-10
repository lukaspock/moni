import {
  fetchAllPages,
  overlayWorkoutRows,
  type WorkoutLedgerRow,
} from './overlay';

describe('fetchAllPages', () => {
  const makeFetcher = (total: number) =>
    jest.fn(async (from: number, to: number) =>
      Array.from(
        { length: Math.max(0, Math.min(to + 1, total) - from) },
        (_, i) => from + i,
      ),
    );

  it('returns a single short page without a second request', async () => {
    const fetcher = makeFetcher(3);
    expect(await fetchAllPages(fetcher, 5)).toEqual([0, 1, 2]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('walks through all pages with inclusive ranges', async () => {
    const fetcher = makeFetcher(12);
    const rows = await fetchAllPages(fetcher, 5);
    expect(rows).toHaveLength(12);
    expect(fetcher.mock.calls).toEqual([
      [0, 4],
      [5, 9],
      [10, 14],
    ]);
  });

  it('needs one extra request when the total is an exact multiple', async () => {
    const fetcher = makeFetcher(10);
    expect(await fetchAllPages(fetcher, 5)).toHaveLength(10);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('handles an empty result and propagates errors', async () => {
    expect(await fetchAllPages(async () => [], 5)).toEqual([]);
    await expect(
      fetchAllPages(async () => {
        throw new Error('offline');
      }),
    ).rejects.toThrow('offline');
  });
});

describe('overlayWorkoutRows', () => {
  const server: WorkoutLedgerRow[] = [
    {
      id: 'a',
      started_at: '2026-01-05T17:00:00Z',
      ended_at: '2026-01-05T18:00:00Z',
      category: 'strength',
      kcal_burned: 300,
    },
    {
      id: 'b',
      started_at: '2026-01-06T17:00:00Z',
      ended_at: '2026-01-06T18:00:00Z',
      category: 'cardio',
      kcal_burned: null,
    },
  ];

  it('returns server rows unchanged without pending mutations', () => {
    expect(overlayWorkoutRows(server, [], new Set(), 'u')).toEqual(server);
  });

  it('hides rows with a queued delete', () => {
    const out = overlayWorkoutRows(server, [], new Set(['a']), 'u');
    expect(out.map((r) => r.id)).toEqual(['b']);
  });

  it('patches existing rows with queued upserts (e.g. a Health merge)', () => {
    const out = overlayWorkoutRows(
      server,
      [{ id: 'b', kcal_burned: 250, user_id: 'u' }],
      new Set(),
      'u',
    );
    expect(out.find((r) => r.id === 'b')?.kcal_burned).toBe(250);
    expect(out.find((r) => r.id === 'b')?.category).toBe('cardio');
  });

  it('shows offline-finished workouts and ignores incomplete or foreign patches', () => {
    const out = overlayWorkoutRows(
      server,
      [
        {
          id: 'c',
          started_at: '2026-01-07T17:00:00Z',
          ended_at: '2026-01-07T18:00:00Z',
          category: 'strength',
          user_id: 'u',
        },
        { id: 'd', kcal_burned: 5, user_id: 'u' }, // partial patch of an unknown row
        {
          id: 'e',
          started_at: '2026-01-08T17:00:00Z',
          category: 'strength',
          user_id: 'other',
        },
      ],
      new Set(),
      'u',
    );
    expect(out.map((r) => r.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not resurrect a row that is queued for deletion', () => {
    const out = overlayWorkoutRows(
      [],
      [{ id: 'z', started_at: '2026-01-07T17:00:00Z', category: 'strength' }],
      new Set(['z']),
      'u',
    );
    expect(out).toEqual([]);
  });

  it('can mark a running workout as finished', () => {
    const running: WorkoutLedgerRow[] = [{ ...server[0], ended_at: null }];
    const out = overlayWorkoutRows(
      running,
      [{ id: 'a', ended_at: '2026-01-05T18:30:00Z' }],
      new Set(),
      'u',
    );
    expect(out[0].ended_at).toBe('2026-01-05T18:30:00Z');
  });
});
