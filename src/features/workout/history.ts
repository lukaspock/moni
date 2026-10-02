/**
 * Workout history, finishing an active session, and "previous values as
 * placeholders" / PR tracking — all offline-first (PLAN §7.4/§7.7).
 */
import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { localDayBoundsUtc } from '@/lib/date';
import { pendingDeleteIdsForTable, pendingUpsertsForTable } from '@/lib/outbox';
import { useSession } from '@/features/auth';
import type { WorkoutSummary } from './index';
import type { WorkoutCategory } from './types';
import {
  mergeWorkoutRows,
  rowsForLocalDate,
  type WorkoutListRow,
} from './historyMerge';
import { useOutboxTick } from './useOutboxTick';

// -------------------------------------------------------------------------
// History reads (contract: useWorkoutsForDate)
// -------------------------------------------------------------------------

function rowToSummary(
  row: WorkoutListRow,
  routineNameById: Map<string, string>,
): WorkoutSummary {
  return {
    isFromHealth: !!row.healthkit_uuid,
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    category: row.category as WorkoutCategory,
    kcalBurned: row.kcal_burned,
    routineName: row.routine_id
      ? (routineNameById.get(row.routine_id) ?? null)
      : null,
  };
}

const WORKOUT_COLUMNS =
  'id, started_at, ended_at, category, kcal_burned, routine_id, healthkit_uuid';

/** Names of the routines referenced by `routineIds`: server rows plus not-yet-synced local ones. */
async function fetchRoutineNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return names;
  const { data } = await supabase
    .from('routines')
    .select('id, name')
    .in('id', uniqueIds);
  for (const r of data ?? []) names.set(r.id, r.name);
  for (const p of pendingUpsertsForTable('routines')) {
    if (typeof p.name === 'string') names.set(p.id as string, p.name);
  }
  for (const id of pendingDeleteIdsForTable('routines')) names.delete(id);
  return names;
}

/**
 * Server read + outbox overlay. On a failed read (offline) the last successful
 * server rows are reused (`fallback`) so synced history doesn't vanish and the
 * Today budget doesn't lose its workout bonus while offline.
 */
async function loadMergedWorkouts(params: {
  userId: string;
  fetchServer: () => Promise<WorkoutListRow[] | null>;
  fallback: WorkoutListRow[] | null;
}): Promise<{ rows: WorkoutListRow[]; server: WorkoutListRow[] | null }> {
  const server = await params.fetchServer();
  const base = server ?? params.fallback ?? [];
  const rows = mergeWorkoutRows(
    base,
    pendingUpsertsForTable('workouts'),
    pendingDeleteIdsForTable('workouts'),
    params.userId,
  );
  return { rows, server };
}

export function useWorkoutsForDateImpl(
  userId: string | null,
  date: string,
): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const outboxTick = useOutboxTick();
  const lastServer = useRef<{ key: string; rows: WorkoutListRow[] } | null>(
    null,
  );

  useEffect(() => {
    // No signed-in user: nothing to load. Don't setState here (nothing has
    // changed to synchronize) — the hook returns the "logged out" result
    // below instead, independent of this effect's internal state.
    if (!userId) return;

    let cancelled = false;
    const uid = userId;
    const key = `${uid}|${date}`;

    async function load() {
      setIsLoading(true);
      // Local-day bounds (not UTC) so late-evening workouts stay on their local date.
      const { start: dayStart, end: dayEnd } = localDayBoundsUtc(date);
      const { rows, server } = await loadMergedWorkouts({
        userId: uid,
        fallback:
          lastServer.current?.key === key ? lastServer.current.rows : null,
        fetchServer: async () => {
          const { data, error } = await supabase
            .from('workouts')
            .select(WORKOUT_COLUMNS)
            .eq('user_id', uid)
            .gte('started_at', dayStart)
            .lt('started_at', dayEnd);
          if (error) {
            console.warn('[workout] day read failed', error.message);
            return null;
          }
          return data ?? [];
        },
      });
      if (server) lastServer.current = { key, rows: server };

      // Queued edits may move a row to/from this day: filter the merged result by local date.
      const dayRows = rowsForLocalDate(rows, date);
      const routineNameById = await fetchRoutineNames(
        dayRows.map((r) => r.routine_id).filter((x): x is string => !!x),
      ).catch(() => new Map<string, string>());

      if (!cancelled) {
        setWorkouts(dayRows.map((r) => rowToSummary(r, routineNameById)));
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // outboxTick forces a refresh once pending entries sync or new ones are queued.
  }, [userId, date, outboxTick]);

  if (!userId) return { workouts: [], isLoading: false };
  return { workouts, isLoading };
}

/**
 * Recent workout history (all dates, newest first), for the training tab and
 * its history screen. Pagination: pass a growing `limit`; `hasMore` says the
 * server may have older rows beyond it.
 */
export function useWorkoutHistory(limit: number = 50): {
  workouts: WorkoutSummary[];
  isLoading: boolean;
  hasMore: boolean;
} {
  const { userId } = useSession();
  return useWorkoutHistoryImpl(userId, limit);
}

/** Internal implementation of `useWorkoutHistory`. */
export function useWorkoutHistoryImpl(
  userId: string | null,
  limit: number = 50,
): { workouts: WorkoutSummary[]; isLoading: boolean; hasMore: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const outboxTick = useOutboxTick();
  const lastServer = useRef<{ key: string; rows: WorkoutListRow[] } | null>(
    null,
  );

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const uid = userId;
    const key = uid;

    async function load() {
      setIsLoading(true);
      // limit + 1: the extra row only tells us whether older workouts exist.
      const { rows, server } = await loadMergedWorkouts({
        userId: uid,
        fallback:
          lastServer.current?.key === key ? lastServer.current.rows : null,
        fetchServer: async () => {
          const { data, error } = await supabase
            .from('workouts')
            .select(WORKOUT_COLUMNS)
            .eq('user_id', uid)
            .order('started_at', { ascending: false })
            .limit(limit + 1);
          if (error) {
            console.warn('[workout] history read failed', error.message);
            return null;
          }
          return data ?? [];
        },
      });
      if (server) lastServer.current = { key, rows: server };

      const visible = rows.slice(0, limit);
      const routineNameById = await fetchRoutineNames(
        visible.map((r) => r.routine_id).filter((x): x is string => !!x),
      ).catch(() => new Map<string, string>());

      if (!cancelled) {
        setWorkouts(visible.map((r) => rowToSummary(r, routineNameById)));
        setHasMore(rows.length > limit);
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, limit, outboxTick]);

  if (!userId) return { workouts: [], isLoading: false, hasMore: false };
  return { workouts, isLoading, hasMore };
}
