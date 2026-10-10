import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  applyRestConfirmations,
  ledgerDaysSorted,
  type LedgerDay,
} from '@/domain';
import { useSession } from '@/features/auth';
import { toISODate } from '@/lib/date';
import { subscribeOutbox } from '@/lib/outbox';

import {
  getLedgerCache,
  setLedgerCache,
  subscribeLedgerCache,
} from './cacheStore';
import { syncLedgerCache } from './ledgerSource';
import { useUserLocal } from './localStore';

export const rhythmKeys = {
  all: ['rhythm'] as const,
  ledger: (userId: string | null) => ['rhythm', 'ledger', userId] as const,
  counts: (userId: string | null) => ['rhythm', 'counts', userId] as const,
  progress: (userId: string | null) =>
    ['rhythm', 'exerciseProgress', userId] as const,
  weights: (userId: string | null) => ['rhythm', 'weights', userId] as const,
};

/** Re-sync after a mutation in another feature (food/workout/weight). Fire-and-forget. */
export function invalidateLedger(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: rhythmKeys.all });
}

/** Local `YYYY-MM-DD`, refreshed when the app returns to the foreground (day rollover). */
export function useToday(): string {
  const [today, setToday] = useState(() => toISODate());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toISODate());
    });
    return () => sub.remove();
  }, []);
  return today;
}

const WATCHED_QUERY_ROOTS = new Set([
  'food',
  'workout',
  'latestWeight',
  'weightLogs',
]);
const MIN_SYNC_GAP_MS = 8_000;
const SYNC_DEBOUNCE_MS = 1_200;
let lastSyncFinishedAt = 0;

export interface LedgerResult {
  /** all known days, oldest first, with local rest-day confirmations applied */
  days: LedgerDay[];
  today: string;
  /** the cache holds at least one successful sync (it may still be refreshing) */
  isReady: boolean;
  /** first-ever load without any cache */
  isLoading: boolean;
  isSyncing: boolean;
  /** newest day the cache is complete up to */
  lastSyncedDate: string | null;
  refresh: () => Promise<void>;
}

/**
 * Client-side ledger (docs/05 §2.0): one compact record per day derived from `food_logs`,
 * `workouts` (incl. unsynced outbox rows) and `weight_logs`. Offline-first: the MMKV cache is
 * shown immediately and refreshed incrementally (from `lastSyncedDate - 7 days`).
 */
export function useLedger(): LedgerResult {
  const { userId } = useSession();
  const today = useToday();
  const queryClient = useQueryClient();
  const local = useUserLocal(userId);
  const cache = useSyncExternalStore(
    subscribeLedgerCache,
    () => getLedgerCache(userId),
    () => getLedgerCache(userId),
  );

  const query = useQuery({
    queryKey: rhythmKeys.ledger(userId),
    enabled: !!userId,
    staleTime: 30_000,
    retry: 1,
    queryFn: async (): Promise<string | null> => {
      const uid = userId as string;
      const next = await syncLedgerCache(uid, getLedgerCache(uid), toISODate());
      setLedgerCache(uid, next);
      lastSyncFinishedAt = Date.now();
      return next.lastSyncedDate;
    },
  });

  // Keep the ledger fresh: outbox changes, successful food/workout/weight fetches, app foreground.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (Date.now() - lastSyncFinishedAt < MIN_SYNC_GAP_MS) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => invalidateLedger(queryClient), SYNC_DEBOUNCE_MS);
    };
    const unsubOutbox = subscribeOutbox(schedule);
    const unsubQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'success') return;
      const root = event.query.queryKey[0];
      if (typeof root === 'string' && WATCHED_QUERY_ROOTS.has(root)) schedule();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') schedule();
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubOutbox();
      unsubQueries();
      sub.remove();
    };
  }, [userId, queryClient]);

  const days = useMemo(
    () =>
      applyRestConfirmations(ledgerDaysSorted(cache), new Set(local.restDays)),
    [cache, local.restDays],
  );
  const isReady = cache.lastSyncedDate !== null;

  return {
    days,
    today,
    isReady,
    isLoading: !!userId && !isReady && (query.isLoading || query.isFetching),
    isSyncing: query.isFetching,
    lastSyncedDate: cache.lastSyncedDate,
    refresh: async () => {
      await query.refetch();
    },
  };
}
