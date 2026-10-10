import {
  applyUndo,
  mergeWaterLogs,
  waterRetryDelayMs,
  type WaterLogRow,
  type WaterOp,
} from './pendingQueue';

const row = (
  id: string,
  at: string,
  ml = 250,
  date = '2026-10-10',
  user = 'u1',
): WaterLogRow => ({
  id,
  user_id: user,
  date,
  logged_at: `2026-10-10T${at}:00.000Z`,
  ml,
});

const ctx = { userId: 'u1', date: '2026-10-10', inFlightId: null };

describe('applyUndo', () => {
  it('drops a queued insert that is not in flight', () => {
    const queue: WaterOp[] = [{ kind: 'insert', row: row('a', '08:00') }];
    expect(applyUndo(queue, 'a', ctx)).toEqual([]);
  });

  it('appends a delete for an in-flight insert', () => {
    const queue: WaterOp[] = [{ kind: 'insert', row: row('a', '08:00') }];
    const next = applyUndo(queue, 'a', { ...ctx, inFlightId: 'a' });
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({
      kind: 'delete',
      id: 'a',
      userId: 'u1',
      date: '2026-10-10',
    });
  });

  it('appends a delete for a synced row, once', () => {
    const once = applyUndo([], 'b', ctx);
    expect(once).toEqual([
      { kind: 'delete', id: 'b', userId: 'u1', date: '2026-10-10' },
    ]);
    expect(applyUndo(once, 'b', ctx)).toEqual(once);
  });
});

describe('mergeWaterLogs', () => {
  it('overlays queued inserts, removes queued deletes, sorts by time', () => {
    const server = [row('s1', '09:00'), row('s2', '07:00')];
    const queue: WaterOp[] = [
      { kind: 'insert', row: row('p1', '08:00') },
      { kind: 'insert', row: row('s1', '09:00', 500) }, // already synced: server wins
      { kind: 'insert', row: row('other-day', '08:00', 250, '2026-10-09') },
      {
        kind: 'insert',
        row: row('other-user', '08:00', 250, '2026-10-10', 'u2'),
      },
      { kind: 'delete', id: 's2', userId: 'u1', date: '2026-10-10' },
    ];
    const merged = mergeWaterLogs(server, queue, 'u1', '2026-10-10');
    expect(merged.map((r) => r.id)).toEqual(['p1', 's1']);
    expect(merged[1].ml).toBe(250);
  });
});

describe('waterRetryDelayMs', () => {
  it('doubles from 5 s and caps at 5 min', () => {
    expect(waterRetryDelayMs(1)).toBe(5_000);
    expect(waterRetryDelayMs(3)).toBe(20_000);
    expect(waterRetryDelayMs(20)).toBe(300_000);
  });
});
