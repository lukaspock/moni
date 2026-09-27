/**
 * Offline outbox (PLAN §7.7): persists mutations to MMKV so a killed app
 * doesn't lose them, and syncs them to Supabase in order once online.
 *
 * Pure ordering/merge/backoff logic lives in `outboxQueue.ts` (no RN
 * imports, unit-tested). This module is the side-effecting wrapper: MMKV
 * storage, NetInfo connectivity, AppState foreground, and the actual
 * Supabase upsert/delete calls.
 *
 * Usage: call `enqueueUpsert(table, id, payload)` / `enqueueDelete(table, id)`
 * from feature code right after writing to local/MMKV state, then let the
 * outbox sync in the background — never await it for the UI to feel instant.
 */
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { supabase } from './supabase';
import { storage } from './storage';
import {
  enqueue as enqueuePure,
  markFailure,
  removeEntry,
  replaceEntry,
  selectReadyEntries,
  isExhausted,
  type NewOutboxEntry,
  type OutboxEntry,
  type OutboxOp,
} from './outboxQueue';

const STORAGE_KEY = 'outbox:queue';

/**
 * Tables the outbox is allowed to write. All of them use `id` as their sole
 * primary key (unlike e.g. `training_plan_days`, which is keyed on
 * `(user_id, weekday)` and is upserted directly via Supabase instead).
 */
export type OutboxTable = 'workouts' | 'workout_sets' | 'routines' | 'routine_exercises' | 'exercises';

type Listener = (queue: OutboxEntry[]) => void;
const listeners = new Set<Listener>();

function readQueue(): OutboxEntry[] {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxEntry[];
  } catch {
    return [];
  }
}

function writeQueue(queue: OutboxEntry[]): void {
  storage.set(STORAGE_KEY, JSON.stringify(queue));
  listeners.forEach((l) => l(queue));
}

export function getQueue(): OutboxEntry[] {
  return readQueue();
}

export function subscribeOutbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function enqueueMutation(table: OutboxTable, op: OutboxOp, id: string, payload: Record<string, unknown>): void {
  const entry: NewOutboxEntry = { id, table, op, payload, createdAt: Date.now() };
  const next = enqueuePure(readQueue(), entry);
  writeQueue(next);
  void processQueue();
}

export function enqueueUpsert(table: OutboxTable, id: string, payload: Record<string, unknown>): void {
  enqueueMutation(table, 'upsert', id, { id, ...payload });
}

export function enqueueDelete(table: OutboxTable, id: string): void {
  enqueueMutation(table, 'delete', id, {});
}

/** Rows still pending sync for a table (used to overlay unsynced data onto server reads). */
export function pendingUpsertsForTable(table: OutboxTable): Record<string, unknown>[] {
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

let isProcessing = false;

/**
 * Processes ready entries in FIFO order. Stops at the first failure (rather
 * than skipping ahead) so FK-dependent rows queued later — e.g. workout_sets
 * that reference a not-yet-synced workout — don't get synced out of order.
 * Exhausted entries (too many failures, e.g. a permanent validation error)
 * are logged and skipped so they don't block everything behind them forever.
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) return;

    let queue = readQueue();
    const ready = selectReadyEntries(queue, Date.now());

    for (const entry of ready) {
      const ok = await syncEntry(entry);
      queue = readQueue();
      if (ok) {
        queue = removeEntry(queue, entry.table, entry.id);
        writeQueue(queue);
        continue;
      }

      const failed = markFailure(entry, Date.now());
      if (isExhausted(failed)) {
        console.warn(`[outbox] giving up on ${entry.table}/${entry.id} after ${failed.attempts} attempts`);
        queue = removeEntry(queue, entry.table, entry.id);
        writeQueue(queue);
        continue;
      }
      queue = replaceEntry(queue, failed);
      writeQueue(queue);
      break; // preserve order: stop so later rows don't sync ahead of this one
    }
  } finally {
    isProcessing = false;
  }
}

async function syncEntry(entry: OutboxEntry): Promise<boolean> {
  try {
    if (entry.op === 'delete') {
      const { error } = await supabase.from(entry.table as OutboxTable).delete().eq('id', entry.id);
      if (error) throw error;
      return true;
    }
    // Client-generated UUIDs make this idempotent: safe to retry after a partial failure.
    // (every outbox table's primary key is `id`, so the default upsert conflict target is already correct.)
    const { error } = await supabase.from(entry.table as OutboxTable).upsert(entry.payload as never);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn(`[outbox] sync failed for ${entry.table}/${entry.id}:`, err);
    return false;
  }
}

let initialized = false;

/**
 * Wires up the triggers PLAN §7.7 asks for: sync when connectivity returns,
 * and when the app comes to the foreground. Idempotent — safe to call from
 * multiple screens; only the first call attaches listeners. There's no
 * central app-start hook this feature owns (`app/_layout.tsx` is off-limits),
 * so this runs as a side effect the first time any workout screen imports
 * the outbox, which in practice covers both "app start" and "foreground".
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
}

initOutbox();
