/**
 * In-memory retry queue for water writes — deliberately simpler than the
 * workout outbox (`src/lib/outbox.ts`):
 *
 * - Every add/undo goes through this FIFO queue; the read hook overlays it,
 *   which is what makes the UI optimistic.
 * - Transient failures (offline, 5xx, auth refresh) keep the entry and retry
 *   with backoff (5 s doubling, max 5 min) plus on NetInfo reconnect and
 *   AppState `active`. Permanent errors (SQLSTATE 22/23/42, PostgREST schema)
 *   drop the entry with a warning.
 * - **Not persisted**: a water log that never reached the server is lost if
 *   the app is killed meanwhile. Acceptable for a 250 ml glass; move it into
 *   the outbox if that ever matters.
 * - Inserts are idempotent (`upsert … ignoreDuplicates` on the client UUID),
 *   so a retry after a lost response can't double-count.
 */
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { QueryClient } from '@tanstack/react-query';

import { isPermanentError } from '@/lib/outboxQueue';
import { supabase } from '@/lib/supabase';

import {
  applyUndo,
  waterRetryDelayMs,
  type WaterLogRow,
  type WaterOp,
} from './pendingQueue';

export const waterKeys = {
  all: ['water'] as const,
  logsForDate: (userId: string | null, date: string) =>
    ['water', 'logs', userId, date] as const,
};

let queue: WaterOp[] = [];
let inFlightId: string | null = null;
let running = false;
let rerun = false;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let client: QueryClient | null = null;
let triggersInstalled = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeWaterQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWaterQueue(): readonly WaterOp[] {
  return queue;
}

/** The hooks hand in their QueryClient so synced rows land in the cache. */
export function bindWaterQueryClient(qc: QueryClient) {
  client = qc;
  installTriggers();
}

function installTriggers() {
  if (triggersInstalled) return;
  triggersInstalled = true;
  NetInfo.addEventListener((state) => {
    if (state.isConnected && queue.length > 0) void flushWater();
  });
  AppState.addEventListener('change', (status) => {
    if (status === 'active' && queue.length > 0) void flushWater();
  });
}

function updateCache(
  userId: string,
  date: string,
  fn: (rows: WaterLogRow[]) => WaterLogRow[],
) {
  if (!client) return;
  const key = waterKeys.logsForDate(userId, date);
  if (client.getQueryData(key) === undefined) {
    void client.invalidateQueries({ queryKey: key });
    return;
  }
  client.setQueryData<WaterLogRow[]>(key, (old) => fn(old ?? []));
}

function opId(op: WaterOp) {
  return op.kind === 'insert' ? op.row.id : op.id;
}

/** Removes the head op if it is still the same object (it may have been undone). */
function dropHead(op: WaterOp) {
  if (queue[0] === op) queue = queue.slice(1);
}

async function send(op: WaterOp): Promise<void> {
  if (op.kind === 'insert') {
    const { error } = await supabase
      .from('water_logs')
      .upsert(op.row, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw error;
    updateCache(op.row.user_id, op.row.date, (rows) =>
      rows.some((r) => r.id === op.row.id) ? rows : [...rows, op.row],
    );
  } else {
    const { error } = await supabase
      .from('water_logs')
      .delete()
      .eq('id', op.id);
    if (error) throw error;
    updateCache(op.userId, op.date, (rows) =>
      rows.filter((r) => r.id !== op.id),
    );
  }
}

/** Sends queued ops in FIFO order until the queue is empty or a transient error stops it. */
export async function flushWater(): Promise<void> {
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id ?? null;
    while (queue.length > 0 && userId) {
      const op = queue[0];
      const owner = op.kind === 'insert' ? op.row.user_id : op.userId;
      if (owner !== userId) {
        // Written by another account on this device: never send it as this user.
        dropHead(op);
        emit();
        continue;
      }
      inFlightId = opId(op);
      try {
        await send(op);
        failures = 0;
        dropHead(op);
      } catch (err) {
        if (isPermanentError(err)) {
          console.warn('[water] dropping write after permanent error', err);
          dropHead(op);
        } else {
          failures += 1;
          retryTimer = setTimeout(
            () => void flushWater(),
            waterRetryDelayMs(failures),
          );
          break;
        }
      } finally {
        inFlightId = null;
        emit();
      }
    }
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      if (!retryTimer) void flushWater();
    }
  }
}

export function enqueueWaterInsert(row: WaterLogRow) {
  queue = [...queue, { kind: 'insert', row }];
  emit();
  void flushWater();
}

export function enqueueWaterUndo(
  id: string,
  ctx: { userId: string; date: string },
) {
  queue = applyUndo(queue, id, { ...ctx, inFlightId });
  emit();
  void flushWater();
}
