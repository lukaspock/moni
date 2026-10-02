/**
 * Workout history reads, offline-first (PLAN §7.4/§7.7). Finishing a live
 * session + previous values / PR cache live in `finish.ts`.
 */
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { localDayBoundsUtc } from '@/lib/date';
import { pendingUpsertsForTable, subscribeOutbox } from '@/lib/outbox';
import { useSession } from '@/features/auth';
import type { WorkoutSummary } from './index';
import type { WorkoutCategory } from './types';

// -------------------------------------------------------------------------
// History reads (contract: useWorkoutsForDate)
// -------------------------------------------------------------------------

function rowToSummary(
  row: {
    id: string;
    started_at: string;
    ended_at: string | null;
    category: string;
    kcal_burned: number | null;
    healthkit_uuid?: string | null;
  },
  routineNameById: Map<string, string>,
  routineId: string | null,
): WorkoutSummary {
  return {
    isFromHealth: !!row.healthkit_uuid,
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    category: row.category as WorkoutCategory,
    kcalBurned: row.kcal_burned,
    routineName: routineId ? (routineNameById.get(routineId) ?? null) : null,
  };
}

function localDateOf(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchRoutineNames(ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
  if (uniqueIds.length === 0) return new Map();
  const { data } = await supabase
    .from('routines')
    .select('id, name')
    .in('id', uniqueIds);
  return new Map((data ?? []).map((r) => [r.id, r.name]));
}

export function useWorkoutsForDateImpl(
  userId: string | null,
  date: string,
): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outboxTick, setOutboxTick] = useState(0);

  useEffect(() => subscribeOutbox(() => setOutboxTick((t) => t + 1)), []);

  useEffect(() => {
    // No signed-in user: nothing to load. Don't setState here (nothing has
    // changed to synchronize) — the hook returns the "logged out" result
    // below instead, independent of this effect's internal state.
    if (!userId) return;

    let cancelled = false;
    const uid = userId;

    async function load() {
      setIsLoading(true);
      // Local-day bounds (not UTC) so late-evening workouts stay on their local date.
      const { start: dayStart, end: dayEnd } = localDayBoundsUtc(date);
      const { data } = await supabase
        .from('workouts')
        .select(
          'id, started_at, ended_at, category, kcal_burned, routine_id, healthkit_uuid',
        )
        .eq('user_id', uid)
        .gte('started_at', dayStart)
        .lt('started_at', dayEnd)
        .order('started_at', { ascending: true });

      const serverRows = data ?? [];

      // Overlay unsynced local workouts for this date (offline-finished sessions still in the outbox).
      const pending = pendingUpsertsForTable('workouts').filter((p) => {
        const startedAt = p.started_at as string | undefined;
        return (
          p.user_id === uid && startedAt && localDateOf(startedAt) === date
        );
      });

      const serverIds = new Set(serverRows.map((r) => r.id));
      const pendingRows = pending
        .filter((p) => !serverIds.has(p.id as string))
        .map((p) => ({
          id: p.id as string,
          started_at: p.started_at as string,
          ended_at: (p.ended_at as string) ?? null,
          category: p.category as string,
          kcal_burned: (p.kcal_burned as number) ?? null,
          routine_id: (p.routine_id as string) ?? null,
          healthkit_uuid: (p.healthkit_uuid as string) ?? null,
        }));

      const allRows = [...serverRows, ...pendingRows];
      const routineNameById = await fetchRoutineNames(
        allRows.map((r) => r.routine_id).filter((x): x is string => !!x),
      );

      if (!cancelled) {
        setWorkouts(
          allRows.map((r) => rowToSummary(r, routineNameById, r.routine_id)),
        );
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

/** Recent workout history (all dates, newest first), for the training tab's history screen. */
export function useWorkoutHistory(limit: number = 50): {
  workouts: WorkoutSummary[];
  isLoading: boolean;
} {
  const { userId } = useSession();
  return useWorkoutHistoryImpl(userId, limit);
}

/** Internal implementation of `useWorkoutHistory`. */
export function useWorkoutHistoryImpl(
  userId: string | null,
  limit: number = 50,
): { workouts: WorkoutSummary[]; isLoading: boolean } {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outboxTick, setOutboxTick] = useState(0);

  useEffect(() => subscribeOutbox(() => setOutboxTick((t) => t + 1)), []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const uid = userId;

    async function load() {
      setIsLoading(true);
      const { data } = await supabase
        .from('workouts')
        .select(
          'id, started_at, ended_at, category, kcal_burned, routine_id, healthkit_uuid',
        )
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(limit);

      const serverRows = data ?? [];
      const serverIds = new Set(serverRows.map((r) => r.id));
      const pendingRows = pendingUpsertsForTable('workouts')
        .filter((p) => p.user_id === uid && !serverIds.has(p.id as string))
        .map((p) => ({
          id: p.id as string,
          started_at: p.started_at as string,
          ended_at: (p.ended_at as string) ?? null,
          category: p.category as string,
          kcal_burned: (p.kcal_burned as number) ?? null,
          routine_id: (p.routine_id as string) ?? null,
          healthkit_uuid: (p.healthkit_uuid as string) ?? null,
        }));

      const allRows = [...serverRows, ...pendingRows].sort((a, b) =>
        a.started_at < b.started_at ? 1 : -1,
      );
      const routineNameById = await fetchRoutineNames(
        allRows.map((r) => r.routine_id).filter((x): x is string => !!x),
      );

      if (!cancelled) {
        setWorkouts(
          allRows.map((r) => rowToSummary(r, routineNameById, r.routine_id)),
        );
        setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, limit, outboxTick]);

  if (!userId) return { workouts: [], isLoading: false };
  return { workouts, isLoading };
}
