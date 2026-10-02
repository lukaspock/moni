import {
  appendDeadLetter,
  applyDeleteCascade,
  computeBackoffMs,
  enqueue,
  isExhausted,
  isPermanentError,
  markFailure,
  msUntilNextAttempt,
  removeEntry,
  removeSynced,
  replaceEntry,
  replaceIfUnchanged,
  selectHead,
  selectReadyEntries,
  type DeadLetter,
  type OutboxEntry,
} from './outboxQueue';

describe('computeBackoffMs', () => {
  it('is 0 for the first attempt', () => {
    expect(computeBackoffMs(0)).toBe(0);
  });

  it('doubles each attempt', () => {
    expect(computeBackoffMs(1, 1000, 300000)).toBe(1000);
    expect(computeBackoffMs(2, 1000, 300000)).toBe(2000);
    expect(computeBackoffMs(3, 1000, 300000)).toBe(4000);
    expect(computeBackoffMs(4, 1000, 300000)).toBe(8000);
  });

  it('caps at maxDelayMs', () => {
    expect(computeBackoffMs(20, 1000, 300000)).toBe(300000);
  });
});

describe('enqueue', () => {
  it('appends a new entry with attempts=0', () => {
    const queue = enqueue([], {
      id: 'a',
      table: 'workouts',
      op: 'upsert',
      payload: { name: 'Push' },
      createdAt: 100,
    });
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      id: 'a',
      attempts: 0,
      nextAttemptAt: 100,
    });
  });

  it('preserves FIFO order across different rows', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 100,
    });
    queue = enqueue(queue, {
      id: 'b',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 200,
    });
    expect(queue.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('merges two upserts of the same row, keeping the original createdAt', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 'workout_sets',
      op: 'upsert',
      payload: { reps: 10, weight_kg: 50 },
      createdAt: 100,
    });
    queue = enqueue(queue, {
      id: 'a',
      table: 'workout_sets',
      op: 'upsert',
      payload: { reps: 12 },
      createdAt: 200,
    });
    expect(queue).toHaveLength(1);
    expect(queue[0].payload).toEqual({ reps: 12, weight_kg: 50 });
    expect(queue[0].createdAt).toBe(100);
  });

  it('resets attempts/backoff when merging a new upsert onto a failed one', () => {
    let queue: OutboxEntry[] = [
      {
        id: 'a',
        table: 't',
        op: 'upsert',
        payload: { x: 1 },
        createdAt: 100,
        attempts: 3,
        nextAttemptAt: 9999,
      },
    ];
    queue = enqueue(queue, {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: { x: 2 },
      createdAt: 500,
    });
    expect(queue[0].attempts).toBe(0);
    expect(queue[0].nextAttemptAt).toBe(500);
  });

  it('an upsert followed by a delete replaces it with the delete', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 'workouts',
      op: 'upsert',
      payload: { name: 'Push' },
      createdAt: 100,
    });
    queue = enqueue(queue, {
      id: 'a',
      table: 'workouts',
      op: 'delete',
      payload: {},
      createdAt: 200,
    });
    expect(queue).toHaveLength(1);
    expect(queue[0].op).toBe('delete');
    expect(queue[0].payload).toEqual({});
  });

  it('a delete followed by a delete is a no-op', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 't',
      op: 'delete',
      payload: {},
      createdAt: 100,
    });
    const before = queue;
    queue = enqueue(queue, {
      id: 'a',
      table: 't',
      op: 'delete',
      payload: {},
      createdAt: 200,
    });
    expect(queue).toBe(before);
  });

  it('a delete followed by an upsert replaces it with the upsert (id reuse)', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 't',
      op: 'delete',
      payload: {},
      createdAt: 100,
    });
    queue = enqueue(queue, {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: { x: 1 },
      createdAt: 200,
    });
    expect(queue[0].op).toBe('upsert');
    expect(queue[0].payload).toEqual({ x: 1 });
  });

  it('keeps entries for the same id in different tables separate', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 'workouts',
      op: 'upsert',
      payload: { x: 1 },
      createdAt: 100,
    });
    queue = enqueue(queue, {
      id: 'a',
      table: 'workout_sets',
      op: 'upsert',
      payload: { y: 2 },
      createdAt: 100,
    });
    expect(queue).toHaveLength(2);
  });
});

describe('removeEntry', () => {
  it('removes only the matching table+id', () => {
    let queue = enqueue([], {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 1,
    });
    queue = enqueue(queue, {
      id: 'b',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 2,
    });
    queue = removeEntry(queue, 't', 'a');
    expect(queue.map((e) => e.id)).toEqual(['b']);
  });
});

describe('selectReadyEntries', () => {
  it('returns only entries whose nextAttemptAt has passed, sorted by createdAt', () => {
    const queue: OutboxEntry[] = [
      {
        id: 'b',
        table: 't',
        op: 'upsert',
        payload: {},
        createdAt: 200,
        attempts: 0,
        nextAttemptAt: 0,
      },
      {
        id: 'a',
        table: 't',
        op: 'upsert',
        payload: {},
        createdAt: 100,
        attempts: 1,
        nextAttemptAt: 5000,
      },
      {
        id: 'c',
        table: 't',
        op: 'upsert',
        payload: {},
        createdAt: 300,
        attempts: 0,
        nextAttemptAt: 0,
      },
    ];
    const ready = selectReadyEntries(queue, 1000);
    expect(ready.map((e) => e.id)).toEqual(['b', 'c']);
  });
});

describe('markFailure / replaceEntry', () => {
  it('increments attempts and sets a future nextAttemptAt', () => {
    const entry: OutboxEntry = {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 0,
      attempts: 0,
      nextAttemptAt: 0,
    };
    const failed = markFailure(entry, 1000, 1000, 300000);
    expect(failed.attempts).toBe(1);
    expect(failed.nextAttemptAt).toBe(2000);

    let queue = [entry];
    queue = replaceEntry(queue, failed);
    expect(queue[0]).toBe(failed);
  });

  it('isExhausted only counts permanent failures, never transient ones', () => {
    const entry: OutboxEntry = {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 0,
      attempts: 50,
      nextAttemptAt: 0,
    };
    expect(isExhausted(entry)).toBe(false); // 50 transient failures: keep retrying
    expect(isExhausted({ ...entry, permanentFailures: 3 })).toBe(false);
    expect(isExhausted({ ...entry, permanentFailures: 4 })).toBe(true);
  });

  it('markFailure counts permanent failures separately', () => {
    const entry = mk('a', 0);
    const t = markFailure(entry, 0, 1000, 300000, false);
    const p = markFailure(t, 0, 1000, 300000, true);
    expect(p.attempts).toBe(2);
    expect(p.permanentFailures).toBe(1);
  });
});

function mk(
  id: string,
  createdAt: number,
  extra: Partial<OutboxEntry> = {},
): OutboxEntry {
  return {
    id,
    table: 't',
    op: 'upsert',
    payload: {},
    createdAt,
    attempts: 0,
    nextAttemptAt: createdAt,
    ...extra,
  };
}

describe('selectHead (strict FIFO)', () => {
  it('does not skip a backing-off head to sync later entries', () => {
    const queue = [
      mk('a', 100, { nextAttemptAt: 5000, attempts: 1 }),
      mk('b', 200, { nextAttemptAt: 0 }),
    ];
    const head = selectHead(queue, 1000);
    expect(head?.entry.id).toBe('a');
    expect(head?.ready).toBe(false);
    expect(msUntilNextAttempt(queue, 1000)).toBe(4000);
  });

  it('skips entries that belong to another user', () => {
    const queue = [
      mk('a', 100, { payload: { user_id: 'u1' } }),
      mk('b', 200, { payload: { user_id: 'u2' } }),
      mk('c', 300, { payload: {} }),
    ];
    expect(selectHead(queue, 1000, 'u2')?.entry.id).toBe('b');
    expect(selectHead([queue[0]], 1000, 'u2')).toBeNull();
    expect(selectHead(queue, 1000, null)?.entry.id).toBe('a');
  });

  it('returns null / null wait for an empty queue', () => {
    expect(selectHead([], 0)).toBeNull();
    expect(msUntilNextAttempt([], 0)).toBeNull();
  });
});

describe('isPermanentError', () => {
  it('classifies constraint, RLS and validation errors as permanent', () => {
    expect(isPermanentError({ code: '23503' })).toBe(true); // FK
    expect(isPermanentError({ code: '23505' })).toBe(true); // unique
    expect(isPermanentError({ code: '42501' })).toBe(true); // RLS / privilege
    expect(isPermanentError({ code: '22P02' })).toBe(true); // bad uuid text
    expect(isPermanentError({ code: 'PGRST204' })).toBe(true);
  });

  it('treats network, auth-refresh and unknown errors as transient', () => {
    expect(isPermanentError(new Error('Network request failed'))).toBe(false);
    expect(isPermanentError({ code: '' })).toBe(false);
    expect(isPermanentError({ code: 'PGRST301' })).toBe(false); // JWT
    expect(isPermanentError({ code: '57014' })).toBe(false); // timeout
    expect(isPermanentError(null)).toBe(false);
  });
});

describe('removeSynced / replaceIfUnchanged (in-flight merge race)', () => {
  it('removes an entry that was not touched while syncing', () => {
    const e = mk('a', 1, { payload: { x: 1 } });
    expect(removeSynced([e], e)).toEqual([]);
  });

  it('keeps an entry that got newer data while its request was in flight', () => {
    const synced = mk('a', 1, { payload: { x: 1 } });
    const merged = enqueue([synced], {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: { y: 2 },
      createdAt: 5,
    });
    const after = removeSynced(merged, synced);
    expect(after).toHaveLength(1);
    expect(after[0].payload).toEqual({ x: 1, y: 2 });
  });

  it('does not overwrite merged data with a stale failure result', () => {
    const original = mk('a', 1, { payload: { x: 1 } });
    const failed = markFailure(original, 10);
    const merged = enqueue([original], {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: { y: 2 },
      createdAt: 5,
    });
    const after = replaceIfUnchanged(merged, original, failed);
    expect(after[0].payload).toEqual({ x: 1, y: 2 });
    expect(after[0].attempts).toBe(0);
    // untouched entry does get the failure state
    expect(replaceIfUnchanged([original], original, failed)[0].attempts).toBe(
      1,
    );
  });
});

describe('applyDeleteCascade', () => {
  const routineChild = mk('re1', 2, {
    table: 'routine_exercises',
    payload: { routine_id: 'r1' },
  });
  const otherChild = mk('re2', 3, {
    table: 'routine_exercises',
    payload: { routine_id: 'r2' },
  });
  const childDelete = mk('re3', 4, {
    table: 'routine_exercises',
    op: 'delete',
    payload: {},
  });
  const workout = mk('w1', 5, {
    table: 'workouts',
    payload: { routine_id: 'r1', user_id: 'u' },
  });

  it('deleting a routine drops its pending exercises and detaches pending workouts', () => {
    const out = applyDeleteCascade(
      [routineChild, otherChild, childDelete, workout],
      'routines',
      'r1',
    );
    expect(out.map((e) => e.id)).toEqual(['re2', 're3', 'w1']);
    expect(out.find((e) => e.id === 'w1')?.payload.routine_id).toBeNull();
  });

  it('deleting a workout drops its pending sets only', () => {
    const set1 = mk('s1', 1, {
      table: 'workout_sets',
      payload: { workout_id: 'w1' },
    });
    const set2 = mk('s2', 2, {
      table: 'workout_sets',
      payload: { workout_id: 'w2' },
    });
    expect(
      applyDeleteCascade([set1, set2], 'workouts', 'w1').map((e) => e.id),
    ).toEqual(['s2']);
  });

  it('ignores other tables', () => {
    const q = [routineChild];
    expect(applyDeleteCascade(q, 'exercises', 'x')).toBe(q);
  });
});

describe('appendDeadLetter', () => {
  it('caps the list, dropping the oldest', () => {
    let dead: DeadLetter[] = [];
    for (let i = 0; i < 5; i++)
      dead = appendDeadLetter(
        dead,
        { entry: mk(String(i), i), error: 'x', failedAt: i },
        3,
      );
    expect(dead.map((d) => d.entry.id)).toEqual(['2', '3', '4']);
  });
});
