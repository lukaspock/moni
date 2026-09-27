import {
  computeBackoffMs,
  enqueue,
  isExhausted,
  markFailure,
  removeEntry,
  replaceEntry,
  selectReadyEntries,
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
    expect(queue[0]).toMatchObject({ id: 'a', attempts: 0, nextAttemptAt: 100 });
  });

  it('preserves FIFO order across different rows', () => {
    let queue = enqueue([], { id: 'a', table: 't', op: 'upsert', payload: {}, createdAt: 100 });
    queue = enqueue(queue, { id: 'b', table: 't', op: 'upsert', payload: {}, createdAt: 200 });
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
    queue = enqueue(queue, { id: 'a', table: 't', op: 'upsert', payload: { x: 2 }, createdAt: 500 });
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
    queue = enqueue(queue, { id: 'a', table: 'workouts', op: 'delete', payload: {}, createdAt: 200 });
    expect(queue).toHaveLength(1);
    expect(queue[0].op).toBe('delete');
    expect(queue[0].payload).toEqual({});
  });

  it('a delete followed by a delete is a no-op', () => {
    let queue = enqueue([], { id: 'a', table: 't', op: 'delete', payload: {}, createdAt: 100 });
    const before = queue;
    queue = enqueue(queue, { id: 'a', table: 't', op: 'delete', payload: {}, createdAt: 200 });
    expect(queue).toBe(before);
  });

  it('a delete followed by an upsert replaces it with the upsert (id reuse)', () => {
    let queue = enqueue([], { id: 'a', table: 't', op: 'delete', payload: {}, createdAt: 100 });
    queue = enqueue(queue, { id: 'a', table: 't', op: 'upsert', payload: { x: 1 }, createdAt: 200 });
    expect(queue[0].op).toBe('upsert');
    expect(queue[0].payload).toEqual({ x: 1 });
  });

  it('keeps entries for the same id in different tables separate', () => {
    let queue = enqueue([], { id: 'a', table: 'workouts', op: 'upsert', payload: { x: 1 }, createdAt: 100 });
    queue = enqueue(queue, { id: 'a', table: 'workout_sets', op: 'upsert', payload: { y: 2 }, createdAt: 100 });
    expect(queue).toHaveLength(2);
  });
});

describe('removeEntry', () => {
  it('removes only the matching table+id', () => {
    let queue = enqueue([], { id: 'a', table: 't', op: 'upsert', payload: {}, createdAt: 1 });
    queue = enqueue(queue, { id: 'b', table: 't', op: 'upsert', payload: {}, createdAt: 2 });
    queue = removeEntry(queue, 't', 'a');
    expect(queue.map((e) => e.id)).toEqual(['b']);
  });
});

describe('selectReadyEntries', () => {
  it('returns only entries whose nextAttemptAt has passed, sorted by createdAt', () => {
    const queue: OutboxEntry[] = [
      { id: 'b', table: 't', op: 'upsert', payload: {}, createdAt: 200, attempts: 0, nextAttemptAt: 0 },
      { id: 'a', table: 't', op: 'upsert', payload: {}, createdAt: 100, attempts: 1, nextAttemptAt: 5000 },
      { id: 'c', table: 't', op: 'upsert', payload: {}, createdAt: 300, attempts: 0, nextAttemptAt: 0 },
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

  it('isExhausted is true once attempts reaches the max', () => {
    const entry: OutboxEntry = {
      id: 'a',
      table: 't',
      op: 'upsert',
      payload: {},
      createdAt: 0,
      attempts: 8,
      nextAttemptAt: 0,
    };
    expect(isExhausted(entry)).toBe(true);
    expect(isExhausted({ ...entry, attempts: 7 })).toBe(false);
  });
});
