import { useMemo } from 'react';

import {
  daySentence,
  greetingSlot,
  nextBestStep,
  type DaySentence,
  type GreetingSlot,
  type MealType,
  type NextStep,
} from '@/domain';
import type { FoodLogWithItems, FoodTotals } from '@/features/food';
import { useHealthSettings } from '@/features/health';
import { useWeightEntries } from '@/features/insights';
import { useLedger, useRhythm } from '@/features/rhythm';
import { useProfile, type DailyTargets } from '@/features/targets';
import type { WorkoutSummary } from '@/features/workout';

import {
  dayOfYear,
  daysAwayFromLedger,
  daysBetween,
  hoursSince,
  startChecklist,
} from './model';

export interface TodayRituals {
  slot: GreetingSlot;
  displayName: string | null;
  sentence: DaySentence | null;
  nextStep: NextStep;
  careFlagged: boolean;
  showRhythm: boolean;
  hasWeight: boolean;
  weightsLoaded: boolean;
  checklist: ReturnType<typeof startChecklist>;
  hasAnyFood: boolean;
  workoutDone: boolean;
}

/** Wires domain ritual functions (`daySentence`, `nextBestStep`) to the screen's data. */
export function useTodayRituals(args: {
  today: string;
  now: Date;
  targets: DailyTargets | null;
  totals: FoodTotals;
  logs: FoodLogWithItems[];
  workouts: WorkoutSummary[];
}): TodayRituals {
  const { today, now, targets, totals, logs, workouts } = args;
  const { profile } = useProfile();
  const rhythm = useRhythm();
  const ledger = useLedger();
  const { entries, isLoading: weightsLoading } = useWeightEntries();
  const { enabled: healthConnected } = useHealthSettings();

  return useMemo((): TodayRituals => {
    const hour = now.getHours();
    const weekday = now.getDay();
    const slot = greetingSlot(hour);
    const completed = workouts.filter((w) => w.endedAt);
    const workoutDone = completed.length > 0;
    const lastEnd = completed.reduce<string | null>(
      (acc, w) => (w.endedAt && (!acc || w.endedAt > acc) ? w.endedAt : acc),
      null,
    );
    const meals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } as Record<
      MealType,
      number
    >;
    for (const l of logs) meals[(l.meal_type as MealType) ?? 'snack'] += 1;

    const lastWeight = entries.length ? entries[entries.length - 1].date : null;
    const hasWeight = entries.length > 0;
    const isTrainingDay = targets?.isTrainingDay ?? false;
    const proteinTarget = targets?.proteinG ?? 0;
    const flagged = rhythm.careFlagged;
    const todayDay = ledger.days.find((d) => d.date === today);

    const sentence = daySentence({
      slot,
      weekday,
      dayOfYear: dayOfYear(today),
      isTrainingDay,
      workoutDone,
      eatenKcal: totals.kcal,
      limitKcal: targets?.totalKcal ?? 0,
      proteinEaten: totals.proteinG,
      proteinTarget,
      rhythmJustReached:
        rhythm.state.thisWeek === 'in-rhythm' &&
        (todayDay?.foodLogCount ?? 0) >= 2,
      daysAway: daysAwayFromLedger(ledger.days, today),
      flagged,
    });

    const nextStep = nextBestStep({
      flagged,
      hasWeight,
      daysSinceWeight: lastWeight ? daysBetween(lastWeight, today) : null,
      // no settings hook for the weigh-in nudge here; Monday rule stays off
      weighInReminderEnabled: false,
      hour,
      weekday,
      isTrainingDay,
      workoutDoneToday: workoutDone,
      hoursSinceWorkoutEnd: hoursSince(lastEnd, now),
      proteinEaten: totals.proteinG,
      proteinTarget,
      foodLogCount: logs.length,
      meals: { breakfast: meals.breakfast, lunch: meals.lunch },
      // no "close day" sheet or review route exists yet -> never offer a dead-end card
      dayClosed: true,
      weeklyReviewUnseen: false,
    });

    const created = profile?.created_at?.slice(0, 10) ?? null;
    const checklist = startChecklist({
      hasFood: ledger.days.some((d) => d.foodLogCount > 0),
      hasWeight,
      hasTraining: ledger.days.some((d) => d.workoutCount > 0),
      healthConnected,
      accountAgeDays: created ? daysBetween(created, today) : null,
    });

    return {
      slot,
      displayName: profile?.display_name ?? null,
      sentence,
      nextStep,
      careFlagged: flagged,
      showRhythm: rhythm.showRhythm,
      hasWeight,
      weightsLoaded: !weightsLoading,
      checklist,
      hasAnyFood: ledger.days.some((d) => d.foodLogCount > 0),
      workoutDone,
    };
  }, [
    now,
    today,
    targets,
    totals,
    logs,
    workouts,
    profile,
    rhythm.careFlagged,
    rhythm.showRhythm,
    rhythm.state.thisWeek,
    ledger.days,
    entries,
    weightsLoading,
    healthConnected,
  ]);
}
