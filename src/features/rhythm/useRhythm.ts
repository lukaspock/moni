import { useCallback, useEffect, useMemo } from 'react';

import {
  addPauseDetailed,
  classifyDay,
  computeRhythm,
  computeWeekRings,
  dayGlyph,
  detectLowIntakePattern,
  displayedStage,
  isPausedOn,
  isPlannedRestDay,
  pauseDateSet,
  removePause,
  stageAscent,
  weekDates,
  weekStartFor,
  type AddPauseResult,
  type DayContext,
  type DayGlyph,
  type DayState,
  type LedgerDay,
  type PauseRange,
  type RhythmState,
  type Stage,
  type StageProgress,
  type TrainingExperience,
  type WeekGoals,
  type WeekRings,
} from '@/domain';
import { useSession } from '@/features/auth';
import { useProfile } from '@/features/targets';
import { useWeeklyPlan } from '@/features/workout';

import { makeGoalsForWeek, type GoalOverrides } from './derive';
import { patchUserLocal, useUserLocal } from './localStore';
import { useLedger, type LedgerResult } from './useLedger';

interface RhythmCore {
  userId: string | null;
  ledger: LedgerResult;
  plannedWeekdays: ReadonlySet<number>;
  pausedDates: ReadonlySet<string>;
  goalsForWeek: (weekStart: string) => WeekGoals;
  dayContext: DayContext;
  rhythm: RhythmState;
  careFlagged: boolean;
  profileCreatedAt: string | null;
}

/** Newest non-null value of a ledger field (current targets as fallback for older days). */
function latestOf(
  days: readonly LedgerDay[],
  pick: (d: LedgerDay) => number | null,
): number | null {
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const v = pick(days[i]);
    if (v !== null && v > 0) return v;
  }
  return null;
}

/** Shared, memoised inputs of the rhythm hooks (ledger + profile + plan + local state). */
export function useRhythmCore(): RhythmCore {
  const { userId } = useSession();
  const ledger = useLedger();
  const local = useUserLocal(userId);
  const { profile } = useProfile();
  const { planByWeekday } = useWeeklyPlan();

  const plannedWeekdays = useMemo<ReadonlySet<number>>(
    () => new Set(planByWeekday.keys()),
    [planByWeekday],
  );
  const pausedDates = useMemo(() => pauseDateSet(local.pauses), [local.pauses]);
  const profileCreatedAt = profile?.created_at ?? null;
  const goalsForWeek = useMemo(
    () =>
      makeGoalsForWeek({
        workoutsPerWeek: profile?.workouts_per_week ?? null,
        experience: (profile?.training_experience ??
          null) as TrainingExperience | null,
        accountCreatedAt: profileCreatedAt,
        overrides: local.goalOverrides,
      }),
    [
      profile?.workouts_per_week,
      profile?.training_experience,
      profileCreatedAt,
      local.goalOverrides,
    ],
  );
  const proteinFallback = useMemo(
    () => latestOf(ledger.days, (d) => d.targetProteinG),
    [ledger.days],
  );
  const dayContext = useMemo<DayContext>(
    () => ({
      today: ledger.today,
      plannedWeekdays,
      pausedDates,
      fallbackProteinTargetG: proteinFallback,
    }),
    [ledger.today, plannedWeekdays, pausedDates, proteinFallback],
  );
  const rhythm = useMemo(
    () =>
      computeRhythm({
        days: ledger.days,
        today: ledger.today,
        plannedWeekdays,
        goalsForWeek,
        pauses: local.pauses,
        fallbackProteinTargetG: proteinFallback,
      }),
    [
      ledger.days,
      ledger.today,
      plannedWeekdays,
      goalsForWeek,
      local.pauses,
      proteinFallback,
    ],
  );
  const careFlagged = useMemo(() => {
    const base = latestOf(ledger.days, (d) => d.baseKcal);
    return base === null
      ? false
      : detectLowIntakePattern(ledger.days, base, ledger.today).flagged;
  }, [ledger.days, ledger.today]);

  return {
    userId,
    ledger,
    plannedWeekdays,
    pausedDates,
    goalsForWeek,
    dayContext,
    rhythm,
    careFlagged,
    profileCreatedAt,
  };
}

export interface RhythmResult {
  state: RhythmState;
  /** stage to display (never lower than the highest acknowledged one) */
  stage: StageProgress;
  /** a stage reached but not acknowledged yet -> show the ascent moment, then `acknowledgeStage()` */
  ascent: Stage | null;
  /** rings goals of the current week */
  goals: WeekGoals;
  pauses: PauseRange[];
  isPausedToday: boolean;
  /** user switch for the rhythm number ("Rhythmus-Anzeige") */
  showRhythm: boolean;
  /** care signal: celebrations/body stamps/sharing are switched off */
  careFlagged: boolean;
  today: string;
  isReady: boolean;
  addPause: (range: PauseRange) => AddPauseResult;
  removePause: (range: PauseRange) => void;
  /** "enjoy rest day" (default today) */
  confirmRestDay: (date?: string) => void;
  setGoalOverrides: (overrides: GoalOverrides | null) => void;
  setShowRhythm: (show: boolean) => void;
  acknowledgeStage: () => void;
}

export function useRhythm(): RhythmResult {
  const core = useRhythmCore();
  const { userId, ledger, rhythm } = core;
  const local = useUserLocal(userId);
  const stage = useMemo(
    () => displayedStage(rhythm.lifetimeWeeks, local.stageHighest),
    [rhythm.lifetimeWeeks, local.stageHighest],
  );
  const ascent = useMemo(
    () =>
      local.stageHighest === null || !ledger.isReady
        ? null
        : stageAscent(local.stageHighest, rhythm.lifetimeWeeks),
    [local.stageHighest, rhythm.lifetimeWeeks, ledger.isReady],
  );

  // First evaluation on this device: take the current stage silently (no ascent for veterans).
  useEffect(() => {
    if (!userId || !ledger.isReady || local.stageHighest !== null) return;
    patchUserLocal(userId, () => ({ stageHighest: stage.stage.index }));
  }, [userId, ledger.isReady, local.stageHighest, stage.stage.index]);

  const addPause = useCallback(
    (range: PauseRange): AddPauseResult => {
      const result = addPauseDetailed(local.pauses, range, ledger.today);
      if (userId) patchUserLocal(userId, () => ({ pauses: result.pauses }));
      return result;
    },
    [userId, local.pauses, ledger.today],
  );
  const removePauseRange = useCallback(
    (range: PauseRange) => {
      if (userId)
        patchUserLocal(userId, (c) => ({
          pauses: removePause(c.pauses, range),
        }));
    },
    [userId],
  );
  const confirmRestDay = useCallback(
    (date?: string) => {
      const day = date ?? ledger.today;
      if (!userId) return;
      patchUserLocal(userId, (c) =>
        c.restDays.includes(day)
          ? {}
          : { restDays: [...c.restDays, day].sort() },
      );
    },
    [userId, ledger.today],
  );
  const setGoalOverrides = useCallback(
    (overrides: GoalOverrides | null) => {
      if (userId) patchUserLocal(userId, () => ({ goalOverrides: overrides }));
    },
    [userId],
  );
  const setShowRhythm = useCallback(
    (show: boolean) => {
      if (userId) patchUserLocal(userId, () => ({ showRhythm: show }));
    },
    [userId],
  );
  const acknowledgeStage = useCallback(() => {
    if (userId) {
      patchUserLocal(userId, (c) => ({
        stageHighest: Math.max(c.stageHighest ?? 1, stage.stage.index),
      }));
    }
  }, [userId, stage.stage.index]);

  return {
    state: rhythm,
    stage,
    ascent,
    goals: core.goalsForWeek(weekStartFor(ledger.today)),
    pauses: local.pauses,
    isPausedToday: isPausedOn(local.pauses, ledger.today),
    showRhythm: local.showRhythm,
    careFlagged: core.careFlagged,
    today: ledger.today,
    isReady: ledger.isReady,
    addPause,
    removePause: removePauseRange,
    confirmRestDay,
    setGoalOverrides,
    setShowRhythm,
    acknowledgeStage,
  };
}

export interface WeekTallyDay {
  date: string;
  state: DayState;
  glyph: DayGlyph;
  isToday: boolean;
  isPlannedRestDay: boolean;
}

export interface WeekTallyResult {
  weekStart: string;
  rings: WeekRings;
  goals: WeekGoals;
  /** the seven days (Mon..Sun) */
  days: WeekTallyDay[];
  isReady: boolean;
}

/** The weekly triad (food / training / protein) and the seven day glyphs; default = this week. */
export function useWeekTally(weekStart?: string): WeekTallyResult {
  const core = useRhythmCore();
  const { ledger, goalsForWeek, dayContext } = core;
  const start = weekStart ?? weekStartFor(ledger.today);
  return useMemo(() => {
    const goals = goalsForWeek(start);
    const byDate = new Map(ledger.days.map((d) => [d.date, d]));
    const days = weekDates(start).map((date): WeekTallyDay => {
      const day = byDate.get(date);
      const rest = isPlannedRestDay(date, dayContext.plannedWeekdays);
      return {
        date,
        state: classifyDay(day, date, dayContext),
        glyph: dayGlyph(day, { isRestDay: rest }),
        isToday: date === ledger.today,
        isPlannedRestDay: rest,
      };
    });
    return {
      weekStart: start,
      rings: computeWeekRings(ledger.days, start, goals, dayContext),
      goals,
      days,
      isReady: ledger.isReady,
    };
  }, [
    start,
    goalsForWeek,
    dayContext,
    ledger.days,
    ledger.today,
    ledger.isReady,
  ]);
}

/** Care signal on its own (for the calm hint card on Today). */
export function useCareSignal(): { flagged: boolean; isReady: boolean } {
  const core = useRhythmCore();
  return { flagged: core.careFlagged, isReady: core.ledger.isReady };
}
