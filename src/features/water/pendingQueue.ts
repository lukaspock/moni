/**
 * Pure queue logic for not-yet-synced water writes (see `pending.ts` for the
 * runtime). Kept separate so the merge/undo rules are unit-tested.
 */

export interface WaterLogRow {
  id: string;
  user_id: string;
  date: string; // local YYYY-MM-DD
  logged_at: string; // ISO
  ml: number;
}

export type WaterOp =
  | { kind: 'insert'; row: WaterLogRow }
  | { kind: 'delete'; id: string; userId: string; date: string };

/**
 * Undo of `id`: a queued insert that is not being sent right now is simply
 * dropped (it never reaches the server). Otherwise (already synced, or
 * in flight) a delete is appended so it runs after the insert.
 */
export function applyUndo(
  queue: readonly WaterOp[],
  id: string,
  ctx: { userId: string; date: string; inFlightId: string | null },
): WaterOp[] {
  const idx = queue.findIndex((op) => op.kind === 'insert' && op.row.id === id);
  if (idx >= 0 && ctx.inFlightId !== id) {
    return queue.filter((_, i) => i !== idx);
  }
  if (queue.some((op) => op.kind === 'delete' && op.id === id)) {
    return [...queue];
  }
  return [...queue, { kind: 'delete', id, userId: ctx.userId, date: ctx.date }];
}

/**
 * Server rows for (user, date) overlaid with queued inserts (deduped by id)
 * minus queued deletes, sorted by `logged_at`.
 */
export function mergeWaterLogs(
  server: readonly WaterLogRow[],
  queue: readonly WaterOp[],
  userId: string | null,
  date: string,
): WaterLogRow[] {
  const deleted = new Set(
    queue.filter((op) => op.kind === 'delete').map((op) => op.id),
  );
  const byId = new Map<string, WaterLogRow>();
  for (const row of server) byId.set(row.id, row);
  for (const op of queue) {
    if (op.kind !== 'insert') continue;
    if (op.row.user_id !== userId || op.row.date !== date) continue;
    if (!byId.has(op.row.id)) byId.set(op.row.id, op.row);
  }
  return [...byId.values()]
    .filter((row) => !deleted.has(row.id))
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

/** Retry delay after `failures` consecutive transient errors: 5 s doubling, max 5 min. */
export function waterRetryDelayMs(failures: number): number {
  return Math.min(300_000, 5_000 * 2 ** Math.max(0, failures - 1));
}
