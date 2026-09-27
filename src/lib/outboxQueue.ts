/**
 * Pure logic for the offline outbox (PLAN §7.7): ordering, merging repeated
 * upserts of the same row, and backoff calculation.
 *
 * Deliberately has NO React Native / MMKV / NetInfo imports so it can be
 * unit-tested with plain Jest. `src/lib/outbox.ts` wraps this with the actual
 * MMKV persistence + NetInfo trigger + Supabase calls.
 */

export type OutboxOp = 'upsert' | 'delete';

export interface OutboxEntry {
  /** Client-generated row UUID (also the outbox entry's own identity, scoped by table). */
  id: string;
  table: string;
  op: OutboxOp;
  payload: Record<string, unknown>;
  /** epoch ms when the entry was first queued (preserved across merges -> stable FIFO order). */
  createdAt: number;
  /** how many sync attempts have failed so far. */
  attempts: number;
  /** epoch ms before which this entry should not be retried. */
  nextAttemptAt: number;
}

export type NewOutboxEntry = {
  id: string;
  table: string;
  op: OutboxOp;
  payload: Record<string, unknown>;
  createdAt: number;
};

export const DEFAULT_BASE_DELAY_MS = 1000;
export const DEFAULT_MAX_DELAY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_ATTEMPTS = 8;

/**
 * Exponential backoff, deterministic (no jitter) so it stays unit-testable:
 * attempt 0 -> 0 (first try happens immediately), attempt 1 -> base, attempt 2 -> 2*base, ...
 * capped at `maxDelayMs`.
 */
export function computeBackoffMs(
  attempts: number,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  maxDelayMs: number = DEFAULT_MAX_DELAY_MS,
): number {
  if (attempts <= 0) return 0;
  const delay = baseDelayMs * 2 ** (attempts - 1);
  return Math.min(delay, maxDelayMs);
}

function findIndex(queue: OutboxEntry[], table: string, id: string): number {
  return queue.findIndex((e) => e.table === table && e.id === id);
}

/**
 * Adds an entry to the queue, merging with any pending entry for the same
 * `table` + row `id`:
 * - upsert followed by upsert: payloads are shallow-merged (new fields win),
 *   the original `createdAt` (and therefore FIFO position) is kept, and the
 *   retry state is reset since there's new data worth syncing sooner.
 * - upsert followed by delete: the delete replaces the upsert outright (no
 *   point pushing data for a row that's about to be deleted).
 * - delete followed by upsert: treated as a new row reusing the id (rare) ->
 *   the upsert replaces the delete.
 * - delete followed by delete: no-op, the existing pending delete stands.
 */
export function enqueue(queue: OutboxEntry[], entry: NewOutboxEntry): OutboxEntry[] {
  const idx = findIndex(queue, entry.table, entry.id);
  if (idx === -1) {
    const next: OutboxEntry = {
      ...entry,
      attempts: 0,
      nextAttemptAt: entry.createdAt,
    };
    return [...queue, next];
  }

  const existing = queue[idx];
  let merged: OutboxEntry;

  if (existing.op === 'delete' && entry.op === 'delete') {
    return queue; // already queued for deletion, nothing to do
  } else if (existing.op === 'upsert' && entry.op === 'upsert') {
    merged = {
      ...existing,
      payload: { ...existing.payload, ...entry.payload },
      attempts: 0,
      nextAttemptAt: entry.createdAt,
    };
  } else {
    // upsert->delete or delete->upsert: the newer op wins outright.
    merged = {
      id: entry.id,
      table: entry.table,
      op: entry.op,
      payload: entry.op === 'delete' ? {} : entry.payload,
      createdAt: existing.createdAt,
      attempts: 0,
      nextAttemptAt: entry.createdAt,
    };
  }

  const next = [...queue];
  next[idx] = merged;
  return next;
}

/** Removes an entry (after it has synced successfully). */
export function removeEntry(queue: OutboxEntry[], table: string, id: string): OutboxEntry[] {
  return queue.filter((e) => !(e.table === table && e.id === id));
}

/** Entries due for (re)processing now, in FIFO (`createdAt`) order. */
export function selectReadyEntries(queue: OutboxEntry[], now: number): OutboxEntry[] {
  return queue
    .filter((e) => e.nextAttemptAt <= now)
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** Whether an entry has exceeded the retry budget and should be treated as permanently failed. */
export function isExhausted(entry: OutboxEntry, maxAttempts: number = MAX_ATTEMPTS): boolean {
  return entry.attempts >= maxAttempts;
}

/** Returns the entry updated after a failed sync attempt (increments attempts, sets backoff). */
export function markFailure(
  entry: OutboxEntry,
  now: number,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  maxDelayMs: number = DEFAULT_MAX_DELAY_MS,
): OutboxEntry {
  const attempts = entry.attempts + 1;
  return {
    ...entry,
    attempts,
    nextAttemptAt: now + computeBackoffMs(attempts, baseDelayMs, maxDelayMs),
  };
}

/** Replaces an entry in the queue by table+id (used to persist markFailure's result). */
export function replaceEntry(queue: OutboxEntry[], updated: OutboxEntry): OutboxEntry[] {
  const idx = findIndex(queue, updated.table, updated.id);
  if (idx === -1) return queue;
  const next = [...queue];
  next[idx] = updated;
  return next;
}
