// CONTRACT (owner: `water`, identity N1). Other features import only from here.
//
//   useWaterForDate(date, opts?)  logs (incl. not-yet-synced), total, goal, progress, unit system
//   useAddWater()                 addWater(ml, date?) → id; optimistic, retried in memory when offline
//   useUndoWater()                undoWater(id, date) → removes a log (also a still-queued one)
//
// Offline handling is a small in-memory retry queue (`pending.ts`), not the workout outbox:
// a glass that never reached the server is lost when the app is killed. Health write-back
// (`dietaryWater`) is fire-and-forget and only runs with Health + "write nutrition" enabled.
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  calculateWaterGoalMl,
  isValidWaterAmount,
  loggedAtForDate,
  resolveLogDate,
  sumWaterMl,
  waterProgress,
  type UnitSystem,
  type WaterProgress,
} from '@/domain';
import { useSession } from '@/features/auth';
import {
  deleteWaterLogFromHealth,
  exportWaterLogToHealth,
} from '@/features/health';
import { useLatestWeightKg, useProfile } from '@/features/targets';
import { toISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';

import {
  bindWaterQueryClient,
  enqueueWaterInsert,
  enqueueWaterUndo,
  getWaterQueue,
  subscribeWaterQueue,
  waterKeys,
} from './pending';
import { mergeWaterLogs, type WaterLogRow } from './pendingQueue';

export type { WaterLogRow } from './pendingQueue';
export { waterKeys } from './pending';

function useBoundQueryClient() {
  const queryClient = useQueryClient();
  useEffect(() => bindWaterQueryClient(queryClient), [queryClient]);
  return queryClient;
}

export interface WaterForDate {
  logs: WaterLogRow[];
  totalMl: number;
  goalMl: number;
  progress: WaterProgress;
  unitSystem: UnitSystem;
  isLoading: boolean;
}

/**
 * Water logs of a local date (server rows + queued offline writes), the day's
 * total and goal (`calculateWaterGoalMl`: latest weight, +500 ml when
 * `isTrainingDay` — pass `useDailyTargets(date).targets?.isTrainingDay`).
 */
export function useWaterForDate(
  date: string,
  opts: { isTrainingDay?: boolean } = {},
): WaterForDate {
  useBoundQueryClient();
  const { userId } = useSession();
  const { profile } = useProfile();
  const weight = useLatestWeightKg(userId, date);
  const queue = useSyncExternalStore(subscribeWaterQueue, getWaterQueue);

  const query = useQuery({
    queryKey: waterKeys.logsForDate(userId, date),
    enabled: !!userId,
    queryFn: async (): Promise<WaterLogRow[]> => {
      const { data, error } = await supabase
        .from('water_logs')
        .select('id, user_id, date, logged_at, ml')
        .eq('user_id', userId as string)
        .eq('date', date)
        .order('logged_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isTrainingDay = !!opts.isTrainingDay;
  return useMemo(() => {
    const logs = mergeWaterLogs(query.data ?? [], queue, userId, date);
    const totalMl = sumWaterMl(logs);
    const goalMl = calculateWaterGoalMl({
      weightKg: weight.data ?? null,
      isTrainingDay,
    });
    return {
      logs,
      totalMl,
      goalMl,
      progress: waterProgress(totalMl, goalMl),
      unitSystem: (profile?.unit_system === 'imperial'
        ? 'imperial'
        : 'metric') as UnitSystem,
      isLoading: !!userId && query.isLoading,
    };
  }, [
    query.data,
    query.isLoading,
    queue,
    userId,
    date,
    weight.data,
    isTrainingDay,
    profile?.unit_system,
  ]);
}

/**
 * `addWater(ml, date?)` logs a drink on `date` (default today) at the current
 * time of day (`loggedAtForDate`). Returns the new id (for
 * undo), or null when signed out / the amount is invalid. Never throws.
 */
export function useAddWater(): {
  addWater: (ml: number, date?: string) => string | null;
} {
  useBoundQueryClient();
  const { userId } = useSession();
  const addWater = useCallback(
    (ml: number, date?: string) => {
      if (!userId || !isValidWaterAmount(ml)) return null;
      const now = new Date();
      const logDate = resolveLogDate(date, toISODate(now));
      const row: WaterLogRow = {
        id: Crypto.randomUUID(),
        user_id: userId,
        date: logDate,
        logged_at: loggedAtForDate(logDate, now),
        ml,
      };
      enqueueWaterInsert(row);
      void exportWaterLogToHealth({
        id: row.id,
        loggedAt: row.logged_at,
        ml,
      });
      return row.id;
    },
    [userId],
  );
  return { addWater };
}

/** `undoWater(id, date)` removes a water log (optimistic; Health sample too). */
export function useUndoWater(): {
  undoWater: (id: string, date: string) => void;
} {
  useBoundQueryClient();
  const { userId } = useSession();
  const undoWater = useCallback(
    (id: string, date: string) => {
      if (!userId) return;
      enqueueWaterUndo(id, { userId, date });
      void deleteWaterLogFromHealth(id);
    },
    [userId],
  );
  return { undoWater };
}
