/**
 * Training cycle (`training_cycles` + `training_cycle_slots` +
 * `training_plan_shifts`): the plan as a repeating cycle of N days with an
 * event log of "Heute nicht" / "Doch trainieren" shifts. All plan maths lives
 * in `src/domain/trainingCycle.ts`; this file only loads/saves and resolves
 * routine ids. Direct Supabase writes (not the outbox: the cycle tables are not
 * keyed by a single id), optimistic for shifts.
 *
 * Query key `['plannedDay', 'cycle', userId]` sits under the `['plannedDay']`
 * prefix on purpose, so every existing invalidation of the planned day
 * refreshes it too.
 */
import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import {
  anchorForSavedCycle,
  canPostpone,
  canPullForward,
  clampCycleLength,
  effectivePlanForDate,
  effectivePlanRange,
  shiftOnDate,
  type CycleSlot,
  type PlanDay,
  type PlanRangeDay,
  type PlanShift,
  type PlanShiftKind,
} from '@/domain/trainingCycle';
import { nextRoutine } from '@/domain/trainingPlan';
import { useSession } from '@/features/auth';
import { toISODate } from '@/lib/date';
import { processQueue } from '@/lib/outbox';
import { supabase } from '@/lib/supabase';

import { useWorkoutHistory } from './history';
import { useRoutines } from './routines';
import type { Routine } from './types';

export interface TrainingCycleState {
  length: number;
  anchorDate: string;
  slots: CycleSlot[];
  /** Shift log since the anchor, oldest first. */
  shifts: PlanShift[];
}

export const trainingCycleQueryKey = (userId: string | null) =>
  ['plannedDay', 'cycle', userId] as const;

async function fetchCycle(userId: string): Promise<TrainingCycleState | null> {
  const { data: cycle, error } = await supabase
    .from('training_cycles')
    .select('length, anchor_date')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!cycle) return null;
  const [slotsRes, shiftsRes] = await Promise.all([
    supabase
      .from('training_cycle_slots')
      .select('position, kind, routine_id')
      .eq('user_id', userId),
    supabase
      .from('training_plan_shifts')
      .select('id, date, kind, created_at')
      .eq('user_id', userId)
      .gte('date', cycle.anchor_date)
      .order('created_at', { ascending: true }),
  ]);
  if (slotsRes.error) throw slotsRes.error;
  if (shiftsRes.error) throw shiftsRes.error;
  const length = clampCycleLength(cycle.length);
  const slots: CycleSlot[] = Array.from({ length }, () => ({ kind: 'rest' }));
  for (const row of slotsRes.data ?? []) {
    if (row.position < 0 || row.position >= length) continue;
    slots[row.position] =
      row.kind === 'training'
        ? { kind: 'training', routineId: row.routine_id }
        : { kind: 'rest' };
  }
  return {
    length,
    anchorDate: cycle.anchor_date,
    slots,
    shifts: (shiftsRes.data ?? [])
      .filter(
        (r): r is typeof r & { kind: PlanShiftKind } =>
          r.kind === 'postpone' || r.kind === 'pullForward',
      )
      .map((r) => ({ id: r.id, date: r.date, kind: r.kind })),
  };
}

/** The signed-in user's cycle, or null when none is set up (legacy weekday plan / no plan). */
export function useTrainingCycle(): {
  cycle: TrainingCycleState | null;
  isLoading: boolean;
} {
  const { userId } = useSession();
  const query = useQuery({
    queryKey: trainingCycleQueryKey(userId),
    queryFn: () => fetchCycle(userId as string),
    enabled: !!userId,
  });
  return {
    cycle: query.data ?? null,
    // Until the first fetch settles (also while retrying an error) callers must
    // not treat "no data" as "no cycle" — the editor would start from an empty plan.
    isLoading: !!userId && !query.isFetched,
  };
}

function invalidatePlan(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['plannedDay'] });
  void queryClient.invalidateQueries({ queryKey: ['targets'] });
}

/**
 * Saves the cycle (length + slots) as a fresh start: the anchor is reset
 * (`anchorForSavedCycle`: Monday of this week for 7 days, else today) and the
 * shift log is cleared. `slots` must be in editor order (`slotsForEditor`).
 */
export function useSaveTrainingCycle(): {
  save: (slots: readonly CycleSlot[]) => Promise<void>;
  isSaving: boolean;
} {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (slots: readonly CycleSlot[]) => {
      if (!userId) throw new Error('not signed in');
      const length = clampCycleLength(slots.length);
      const anchorDate = anchorForSavedCycle(length, toISODate());
      // Routines may still sit in the outbox (FK on routine_id): flush first.
      await processQueue().catch(() => undefined);
      const { error: shiftsError } = await supabase
        .from('training_plan_shifts')
        .delete()
        .eq('user_id', userId);
      if (shiftsError) throw shiftsError;
      const { error: cycleError } = await supabase
        .from('training_cycles')
        .upsert(
          { user_id: userId, length, anchor_date: anchorDate },
          { onConflict: 'user_id' },
        );
      if (cycleError) throw cycleError;
      const rows = slots.slice(0, length).map((slot, position) => ({
        user_id: userId,
        position,
        kind: slot.kind,
        routine_id: slot.kind === 'training' ? slot.routineId : null,
      }));
      const { error: slotsError } = await supabase
        .from('training_cycle_slots')
        .upsert(rows, { onConflict: 'user_id,position' });
      if (slotsError) throw slotsError;
      const { error: cleanupError } = await supabase
        .from('training_cycle_slots')
        .delete()
        .eq('user_id', userId)
        .gte('position', length);
      if (cleanupError) throw cleanupError;
    },
    onSettled: () => invalidatePlan(queryClient),
  });
  return { save: mutation.mutateAsync, isSaving: mutation.isPending };
}

/** Effective plan for a date (null = no cycle set up). */
export function usePlanForDate(date: string): {
  day: PlanDay | null;
  isLoading: boolean;
} {
  const { cycle, isLoading } = useTrainingCycle();
  const day = useMemo(
    () =>
      cycle
        ? effectivePlanForDate(
            cycle.slots,
            cycle.anchorDate,
            cycle.shifts,
            date,
          )
        : null,
    [cycle, date],
  );
  return { day, isLoading };
}

/** Effective plan for `days` days from `from` (default today); empty without a cycle. */
export function useUpcomingPlan(
  days: number,
  from?: string,
): { days: PlanRangeDay[]; isLoading: boolean } {
  const { cycle, isLoading } = useTrainingCycle();
  const start = from ?? toISODate();
  const range = useMemo(
    () =>
      cycle
        ? effectivePlanRange(
            cycle.slots,
            cycle.anchorDate,
            cycle.shifts,
            start,
            days,
          )
        : [],
    [cycle, start, days],
  );
  return { days: range, isLoading };
}

/**
 * Routine for a planned training day: the slot's routine, or (no routine
 * linked / routine deleted) the next one in the rotation. Null on rest days.
 */
export function resolvePlannedRoutine(
  day: PlanDay | null,
  routines: readonly Routine[],
  rotationNext: Routine | null,
): Routine | null {
  if (!day || day.kind !== 'training') return null;
  if (day.routineId) {
    const linked = routines.find((r) => r.id === day.routineId);
    if (linked) return linked;
  }
  return rotationNext;
}

/** Today's plan with the routine resolved (cycle first, rotation fallback without a cycle). */
export function useTodayPlan(): {
  hasCycle: boolean;
  day: PlanDay | null;
  /** Routine for today: the planned one (rotation for unlinked slots); null on a planned rest day; without a cycle the rotation's next routine. */
  routine: Routine | null;
  isLoading: boolean;
} {
  const today = toISODate();
  const { cycle, isLoading } = useTrainingCycle();
  const { routines, isLoading: routinesLoading } = useRoutines();
  const { workouts: history } = useWorkoutHistory(20);
  const rotationNext = nextRoutine(routines, history);
  const day = cycle
    ? effectivePlanForDate(cycle.slots, cycle.anchorDate, cycle.shifts, today)
    : null;
  const routine = day
    ? resolvePlannedRoutine(day, routines, rotationNext)
    : rotationNext;
  return {
    hasCycle: !!cycle,
    day,
    routine,
    isLoading: isLoading || routinesLoading,
  };
}

export interface PlanShiftActions {
  /** "Heute nicht" is offered (training day, no shift today). Callers also check "not done yet". */
  canPostpone: boolean;
  /** "Doch trainieren" is offered (rest day with a training ahead, no shift today). */
  canPullForward: boolean;
  /** Today's shift (→ offer undo instead). */
  todayShift: PlanShift | null;
}

/** What today allows (all false without a cycle). */
export function usePlanShiftState(): PlanShiftActions {
  const { cycle } = useTrainingCycle();
  const today = toISODate();
  return useMemo(() => {
    if (!cycle) {
      return { canPostpone: false, canPullForward: false, todayShift: null };
    }
    const { slots, anchorDate, shifts } = cycle;
    return {
      canPostpone: canPostpone(slots, anchorDate, shifts, today),
      canPullForward: canPullForward(slots, anchorDate, shifts, today),
      todayShift: shiftOnDate(shifts, today),
    };
  }, [cycle, today]);
}

function useAddShift(kind: PlanShiftKind) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (shift: PlanShift) => {
      if (!userId) throw new Error('not signed in');
      const { error } = await supabase.from('training_plan_shifts').upsert(
        {
          id: shift.id,
          user_id: userId,
          date: shift.date,
          kind: shift.kind,
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
    },
    onMutate: async (shift) => {
      const key = trainingCycleQueryKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TrainingCycleState | null>(key);
      if (previous) {
        queryClient.setQueryData<TrainingCycleState>(key, {
          ...previous,
          shifts: [...previous.shifts, shift],
        });
      }
      return { previous };
    },
    onError: (_error, _shift, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          trainingCycleQueryKey(userId),
          context.previous,
        );
      }
    },
    onSettled: () => invalidatePlan(queryClient),
  });
  /** Records the shift for today; resolves with its id (for undo). */
  return async (): Promise<string> => {
    const shift: PlanShift = {
      id: Crypto.randomUUID(),
      date: toISODate(),
      kind,
    };
    await mutation.mutateAsync(shift);
    return shift.id;
  };
}

/** "Heute nicht": today becomes rest, the plan shifts +1 until the next rest day. */
export function usePostponeToday(): () => Promise<string> {
  return useAddShift('postpone');
}

/** "Doch trainieren": today gets the next training, the plan moves 1 day earlier. */
export function usePullForwardToday(): () => Promise<string> {
  return useAddShift('pullForward');
}

/** Undo a shift (deletes the event; the replay then yields the plan without it). */
export function useUndoPlanShift(): (shiftId: string) => Promise<void> {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (shiftId: string) => {
      if (!userId) throw new Error('not signed in');
      const { error } = await supabase
        .from('training_plan_shifts')
        .delete()
        .eq('id', shiftId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onMutate: async (shiftId) => {
      const key = trainingCycleQueryKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TrainingCycleState | null>(key);
      if (previous) {
        queryClient.setQueryData<TrainingCycleState>(key, {
          ...previous,
          shifts: previous.shifts.filter((s) => s.id !== shiftId),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(
          trainingCycleQueryKey(userId),
          context.previous,
        );
      }
    },
    onSettled: () => invalidatePlan(queryClient),
  });
  return mutation.mutateAsync;
}
