/**
 * MMKV-backed ledger cache (`ledger:v1:<userId>`), exposed as an external store so hooks
 * re-render when a sync finished (useSyncExternalStore) without any setState-in-effect.
 */
import { emptyLedgerCache, parseLedgerCache, type LedgerCache } from '@/domain';
import { storage } from '@/lib/storage';

const EMPTY: LedgerCache = emptyLedgerCache();
const memory = new Map<string, LedgerCache>();
const listeners = new Set<() => void>();

export const ledgerCacheKey = (userId: string) => `ledger:v1:${userId}`;

export function getLedgerCache(userId: string | null): LedgerCache {
  if (!userId) return EMPTY;
  const hit = memory.get(userId);
  if (hit) return hit;
  let parsed: LedgerCache | null = null;
  try {
    parsed = parseLedgerCache(storage.getString(ledgerCacheKey(userId)));
  } catch {
    parsed = null;
  }
  const cache = parsed ?? emptyLedgerCache();
  memory.set(userId, cache);
  return cache;
}

export function setLedgerCache(userId: string, cache: LedgerCache): void {
  memory.set(userId, cache);
  try {
    storage.set(ledgerCacheKey(userId), JSON.stringify(cache));
  } catch (error) {
    console.warn('[rhythm] could not persist ledger cache', error);
  }
  for (const l of listeners) l();
}

/** Drops the cache (e.g. sign-out or "rebuild"); the next sync rebuilds it from the server. */
export function clearLedgerCache(userId: string): void {
  memory.delete(userId);
  try {
    storage.remove(ledgerCacheKey(userId));
  } catch {
    // ignore: nothing to clear
  }
  for (const l of listeners) l();
}

export function subscribeLedgerCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
