/**
 * Pure logic for the offline outbox (PLAN §7.7): ordering, merging repeated
 * upserts of the same row, backoff calculation, error classification and
 * delete cascades.
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
  /**
   * How many of the failed attempts were *permanent* (the server rejected the
   * row: constraint/RLS/validation). Only these count towards the retry
   * budget; transient failures (offline, 5xx, timeouts) are retried forever.
   * Optional so queues persisted by older builds keep loading.
   */
  permanentFailures?: number;
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
/** Permanent (server-rejected) failures tolerated before an entry moves to the dead-letter list. */
export const MAX_PERMANENT_ATTEMPTS = 4;
export const MAX_DEAD_LETTERS = 50;

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
  // 2 ** (attempts - 1) overflows to Infinity for huge counts; min() still caps it.
  const delay = baseDelayMs * 2 ** Math.min(attempts - 1, 30);
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
export function enqueue(
  queue: OutboxEntry[],
  entry: NewOutboxEntry,
): OutboxEntry[] {
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
      permanentFailures: 0,
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
export function removeEntry(
  queue: OutboxEntry[],
  table: string,
  id: string,
): OutboxEntry[] {
  return queue.filter((e) => !(e.table === table && e.id === id));
}

/** Entries in strict FIFO (`createdAt`) order. */
export function sortFifo(queue: OutboxEntry[]): OutboxEntry[] {
  return queue.slice().sort((a, b) => a.createdAt - b.createdAt);
}

/** Entries due for (re)processing now, in FIFO (`createdAt`) order. */
export function selectReadyEntries(
  queue: OutboxEntry[],
  now: number,
): OutboxEntry[] {
  return sortFifo(queue.filter((e) => e.nextAttemptAt <= now));
}

/**
 * The entry to sync next: the oldest one (strict FIFO, so a child row never
 * syncs ahead of its parent — also not while the parent is backing off).
 * Entries that explicitly belong to another user (`payload.user_id`) are
 * skipped; they wait until that user signs in again. `ready: false` means the
 * head is still inside its backoff window.
 */
export function selectHead(
  queue: OutboxEntry[],
  now: number,
  userId: string | null = null,
): { entry: OutboxEntry; ready: boolean } | null {
  const head = sortFifo(queue).find((e) => {
    const owner = e.payload.user_id;
    return userId === null || typeof owner !== 'string' || owner === userId;
  });
  if (!head) return null;
  return { entry: head, ready: head.nextAttemptAt <= now };
}

/** Milliseconds until the head entry may be retried (0 = now), or null for an empty queue. */
export function msUntilNextAttempt(
  queue: OutboxEntry[],
  now: number,
  userId: string | null = null,
): number | null {
  const head = selectHead(queue, now, userId);
  return head ? Math.max(0, head.entry.nextAttemptAt - now) : null;
}

/** Whether an entry has exceeded the permanent-failure budget and must leave the queue (-> dead letters). */
export function isExhausted(
  entry: OutboxEntry,
  maxPermanent: number = MAX_PERMANENT_ATTEMPTS,
): boolean {
  return (entry.permanentFailures ?? 0) >= maxPermanent;
}

/**
 * Classifies a Supabase/PostgREST/Postgres error. Permanent = the server
 * understood and rejected the row (SQLSTATE class 22 data exception, 23
 * integrity violation, 42 syntax/privilege, or a PostgREST schema error);
 * retrying the identical payload can't help. Everything else (no `code`,
 * network errors, 5xx, JWT/auth hiccups `PGRST3xx`, timeouts) is transient.
 */
export function isPermanentError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code !== 'string') return false;
  if (/^(22|23|42)/.test(code)) return true;
  return code === 'PGRST204' || code === 'PGRST116' || code === 'PGRST102';
}

/** Returns the entry updated after a failed sync attempt (increments attempts, sets backoff). */
export function markFailure(
  entry: OutboxEntry,
  now: number,
  baseDelayMs: number = DEFAULT_BASE_DELAY_MS,
  maxDelayMs: number = DEFAULT_MAX_DELAY_MS,
  permanent: boolean = false,
): OutboxEntry {
  const attempts = entry.attempts + 1;
  return {
    ...entry,
    attempts,
    permanentFailures: (entry.permanentFailures ?? 0) + (permanent ? 1 : 0),
    nextAttemptAt: now + computeBackoffMs(attempts, baseDelayMs, maxDelayMs),
  };
}

/** Replaces an entry in the queue by table+id (used to persist markFailure's result). */
export function replaceEntry(
  queue: OutboxEntry[],
  updated: OutboxEntry,
): OutboxEntry[] {
  const idx = findIndex(queue, updated.table, updated.id);
  if (idx === -1) return queue;
  const next = [...queue];
  next[idx] = updated;
  return next;
}

/**
 * True when `a` and `b` describe the same mutation (same op and payload).
 * While a sync request is in flight the app can merge newer data into the
 * same row; that newer data must not be dropped by the completion handler.
 */
export function isSameMutation(a: OutboxEntry, b: OutboxEntry): boolean {
  return (
    a.op === b.op && JSON.stringify(a.payload) === JSON.stringify(b.payload)
  );
}

/**
 * Removes `synced` after a successful sync — unless it was changed in the
 * meantime (then it stays queued and goes out again with the newer data).
 */
export function removeSynced(
  queue: OutboxEntry[],
  synced: OutboxEntry,
): OutboxEntry[] {
  const idx = findIndex(queue, synced.table, synced.id);
  if (idx === -1) return queue;
  if (isSameMutation(queue[idx], synced))
    return removeEntry(queue, synced.table, synced.id);
  return queue;
}

/** Persists a failure result, but only if the queued entry is still the one that failed. */
export function replaceIfUnchanged(
  queue: OutboxEntry[],
  original: OutboxEntry,
  failed: OutboxEntry,
): OutboxEntry[] {
  const idx = findIndex(queue, original.table, original.id);
  if (idx === -1 || !isSameMutation(queue[idx], original)) return queue;
  return replaceEntry(queue, failed);
}

/**
 * Cleanup that has to accompany a queued delete. The server cascades / nulls
 * the children, but still-pending local writes for them would violate a
 * foreign key and block the queue:
 * - deleting a `routines` row drops its pending `routine_exercises` upserts
 *   and detaches pending `workouts` upserts (`routine_id` -> null; the DB does
 *   `on delete set null` for already synced ones)
 * - deleting a `workouts` row drops its pending `workout_sets` upserts
 */
export function applyDeleteCascade(
  queue: OutboxEntry[],
  table: string,
  id: string,
): OutboxEntry[] {
  if (table === 'routines') {
    return queue
      .filter(
        (e) =>
          !(
            e.table === 'routine_exercises' &&
            e.op === 'upsert' &&
            e.payload.routine_id === id
          ),
      )
      .map((e) =>
        e.table === 'workouts' &&
        e.op === 'upsert' &&
        e.payload.routine_id === id
          ? { ...e, payload: { ...e.payload, routine_id: null } }
          : e,
      );
  }
  if (table === 'workouts') {
    return queue.filter(
      (e) =>
        !(
          e.table === 'workout_sets' &&
          e.op === 'upsert' &&
          e.payload.workout_id === id
        ),
    );
  }
  return queue;
}

export interface DeadLetter {
  entry: OutboxEntry;
  error: string;
  failedAt: number;
}

/** Appends to the dead-letter list (newest last, capped so storage can't grow unbounded). */
export function appendDeadLetter(
  dead: DeadLetter[],
  letter: DeadLetter,
  cap: number = MAX_DEAD_LETTERS,
): DeadLetter[] {
  const next = [...dead, letter];
  return next.length > cap ? next.slice(next.length - cap) : next;
}
