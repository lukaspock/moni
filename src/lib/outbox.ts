/**
 * Offline outbox (PLAN §7.7): persists mutations to MMKV so a killed app
 * doesn't lose them, and syncs them to Supabase in order once online.
 *
 * Pure ordering/merge/backoff/cascade logic lives in `outboxQueue.ts` (no RN
 * imports, unit-tested). This module is the side-effecting wrapper: MMKV
 * storage, NetInfo connectivity, AppState foreground, auth session, and the
 * actual Supabase upsert/delete calls.
 *
 * Usage: call `enqueueUpsert(table, id, payload)` / `enqueueDelete(table, id)`
 * from feature code right after writing to local/MMKV state, then let the
 * outbox sync in the background — never await it for the UI to feel instant.
 *
 * Failure handling: transient errors (offline, 5xx, auth refresh) are retried
 * forever with capped exponential backoff and never lose data. Permanent
 * errors (the server rejects the row: constraint / RLS / validation) are
 * retried a few times and then moved to a persisted dead-letter list
 * (`getDeadLetters()` / `requeueDeadLetters()`) instead of being discarded, so
 * one poisoned row can't block the queue and no write is silently lost.
 */
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { supabase } from './supabase';
import { storage } from './storage';
import {
  appendDeadLetter,
  applyDeleteCascade,
  enqueue as enqueuePure,
  isExhausted,
  isPermanentError,
  markFailure,
  msUntilNextAttempt,
  removeEntry,
  removeSynced,
  replaceIfUnchanged,
  selectHead,
  type DeadLetter,
  type NewOutboxEntry,
  type OutboxEntry,
  type OutboxOp,
} from './outboxQueue';

const STORAGE_KEY = 'outbox:queue';
const CORRUPT_KEY = 'outbox:queue:corrupt';
const DEAD_KEY = 'outbox:dead';

/**
 * Tables the outbox is allowed to write. All of them use `id` as their sole
 * primary key (unlike e.g. `training_plan_days`, which is keyed on
 * `(user_id, weekday)` and is upserted directly via Supabase instead).
 */
export type OutboxTable =
  'workouts' | 'workout_sets' | 'routines' | 'routine_exercises' | 'exercises';

type Listener = (queue: OutboxEntry[]) => void;
const listeners = new Set<Listener>();

function readQueue(): OutboxEntry[] {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  } catch {
    // Keep the unreadable blob for forensics instead of overwriting it silently on the next write.
    storage.set(CORRUPT_KEY, raw);
    return [];
  }
}

function writeQueue(queue: OutboxEntry[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(queue));
  for (const l of listeners) {
    try {
      l(queue);
    } catch (err) {
      console.warn('[outbox] listener failed', err);
    }
  }
}

export function getQueue(): OutboxEntry[] {
  return readQueue();
}

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function enqueueMutation(
  table: OutboxTable,
  op: OutboxOp,
  id: string,
  payload: Record<string, unknown>,
): void {
  const entry: NewOutboxEntry = {
    id,
    table,
    op,
    payload,
    createdAt: Date.now(),
  };
  let next = enqueuePure(readQueue(), entry);
  if (op === 'delete') next = applyDeleteCascade(next, table, id);
  writeQueue(next);
  void processQueue();
}

export function enqueueUpsert(
  table: OutboxTable,
  id: string,
  payload: Record<string, unknown>,
): void {
  enqueueMutation(table, 'upsert', id, { id, ...payload });
}

export function enqueueDelete(table: OutboxTable, id: string): void {
  enqueueMutation(table, 'delete', id, {});
}

/** Rows still pending sync for a table (used to overlay unsynced data onto server reads). */
export function pendingUpsertsForTable(
  table: OutboxTable,
): Record<string, unknown>[] {
  return readQueue()
    .filter((e) => e.table === table && e.op === 'upsert')
    .map((e) => e.payload);
}

export function pendingDeleteIdsForTable(table: OutboxTable): Set<string> {
  return new Set(
    readQueue()
      .filter((e) => e.table === table && e.op === 'delete')
      .map((e) => e.id),
  );
}

export function hasPendingWrites(): boolean {
  return readQueue().length > 0;
}

// ---------------------------------------------------------------------------
// Dead letters
// ---------------------------------------------------------------------------

export function getDeadLetters(): DeadLetter[] {
  const raw = storage.getString(DEAD_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DeadLetter[]) : [];
  } catch {
    return [];
  }
}

function addDeadLetter(entry: OutboxEntry, err: unknown): void {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : String(err);
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  storage.set(
    DEAD_KEY,
    JSON.stringify(
      appendDeadLetter(getDeadLetters(), {
        entry,
        error: code ? `${code}: ${message}` : message,
        failedAt: Date.now(),
      }),
    ),
  );
}

/** Puts every dead-lettered mutation back into the queue (e.g. after a fix) and clears the list. */
export function requeueDeadLetters(): number {
  const dead = getDeadLetters();
  if (dead.length === 0) return 0;
  storage.remove(DEAD_KEY);
  let queue = readQueue();
  for (const { entry } of dead) {
    queue = enqueuePure(queue, {
      id: entry.id,
      table: entry.table,
      op: entry.op,
      payload: entry.payload,
      createdAt: Date.now(),
    });
  }
  writeQueue(queue);
  void processQueue();
  return dead.length;
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

let isProcessing = false;
let rerunRequested = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Processes the queue in strict FIFO order and stops at the first entry that
 * cannot be synced (offline, backing off, failing) so FK-dependent rows queued
 * later — e.g. workout_sets that reference a not-yet-synced workout — never
 * overtake their parent. Calls that arrive while a run is in progress set a
 * flag so the run repeats instead of leaving newly queued rows waiting for the
 * next connectivity/foreground event. After each run a timer is armed for the
 * head entry's backoff, so retries don't depend on an external trigger.
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) {
    rerunRequested = true;
    return;
  }
  isProcessing = true;
  try {
    do {
      rerunRequested = false;
      await runOnce();
    } while (rerunRequested);
  } catch (err) {
    console.warn('[outbox] processing failed', err);
  } finally {
    isProcessing = false;
  }
  void scheduleRetry();
}

async function runOnce(): Promise<void> {
  if (readQueue().length === 0) return;
  const netState = await NetInfo.fetch();
  if (!netState.isConnected || netState.isInternetReachable === false) return;
  // Without a session RLS would reject every write (a permanent-looking error); wait for sign-in instead.
  const userId = await currentUserId();
  if (!userId) return;

  for (;;) {
    const head = selectHead(readQueue(), Date.now(), userId);
    if (!head || !head.ready) return;
    const entry = head.entry;

    const result = await syncEntry(entry);
    if (result.ok) {
      writeQueue(removeSynced(readQueue(), entry));
      continue;
    }

    const permanent = isPermanentError(result.error);
    const failed = markFailure(
      entry,
      Date.now(),
      undefined,
      undefined,
      permanent,
    );
    if (isExhausted(failed)) {
      console.warn(
        `[outbox] ${entry.table}/${entry.id} rejected permanently, moved to dead letters`,
      );
      addDeadLetter(entry, result.error);
      writeQueue(removeEntry(readQueue(), entry.table, entry.id));
      continue;
    }
    writeQueue(replaceIfUnchanged(readQueue(), entry, failed));
    return; // preserve order: later rows must not sync ahead of this one
  }
}

async function scheduleRetry(): Promise<void> {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  const userId = await currentUserId();
  const wait = msUntilNextAttempt(readQueue(), Date.now(), userId);
  // Only back-off waits need a timer; "ready now" means we were offline/signed out,
  // which the NetInfo / auth / AppState triggers cover.
  if (wait === null || wait <= 0) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processQueue();
  }, wait + 50);
}

async function syncEntry(
  entry: OutboxEntry,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    if (entry.op === 'delete') {
      const { error } = await supabase
        .from(entry.table as OutboxTable)
        .delete()
        .eq('id', entry.id);
      if (error) throw error;
      return { ok: true };
    }
    // Client-generated UUIDs make this idempotent: safe to retry after a partial failure.
    // (every outbox table's primary key is `id`, so the default upsert conflict target is already correct.)
    const { error } = await supabase
      .from(entry.table as OutboxTable)
      .upsert(entry.payload as never);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.warn(`[outbox] sync failed for ${entry.table}/${entry.id}:`, err);
    return { ok: false, error: err };
  }
}

let initialized = false;

/**
 * Wires up the triggers PLAN §7.7 asks for: sync when connectivity returns,
 * when the app comes to the foreground and when a user signs in. Idempotent —
 * safe to call from multiple screens; only the first call attaches listeners.
 * There's no central app-start hook this feature owns (`app/_layout.tsx` is
 * off-limits), so this runs as a side effect the first time any workout screen
 * imports the outbox.
 */
export function initOutbox(): void {
  if (initialized) return;
  initialized = true;

  void processQueue();

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void processQueue();
    }
  });

  AppState.addEventListener('change', (status: AppStateStatus) => {
    if (status === 'active') {
      void processQueue();
    }
  });

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // Don't call supabase from inside the auth callback (deadlock risk): defer.
      setTimeout(() => void processQueue(), 0);
    }
  });
}

initOutbox();
