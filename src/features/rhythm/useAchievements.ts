import { useCallback, useEffect, useMemo } from 'react';

import {
  buildWeeklyReview,
  computeWeekRings,
  deriveStrengthFacts,
  evaluateAchievements,
  mergeUnlocked,
  planUnlockPresentation,
  shiftIsoDate,
  weekStartFor,
  type AchievementFacts,
  type AchievementStatus,
  type Goal,
  type UnlockPresentation,
  type WeeklyReview,
} from '@/domain';
import { useHealthSettings } from '@/features/health';
import { useAdaptiveTdee, useProfile } from '@/features/targets';

import {
  bodyFactsFromWeights,
  hasTrainingPattern,
  trainingComparisonUntil,
  trendDeltaInRange,
  weeklyPrs,
} from './derive';
import { patchUserLocal, useUserLocal } from './localStore';
import {
  useExerciseProgressRows,
  useLifetimeCounts,
  useWeightPoints,
} from './useRhythmData';
import { useRhythmCore } from './useRhythm';

/** Celebrations shown since the app process started (max 1 per app open). */
let celebratedThisOpen = 0;

export interface AchievementsResult {
  /** every evaluated stamp (release-1 set), persisted unlocks included */
  statuses: AchievementStatus[];
  unlockedCount: number;
  total: number;
  /** celebrate these now (max 1 per open, 2 per day); call `acknowledge` afterwards */
  celebrate: AchievementStatus[];
  /** unlocked, but throttled: show in the profile / review */
  stacked: AchievementStatus[];
  /** "N stamps found again" after a reinstall; null = nothing to say */
  restoreNotice: number | null;
  /** all inputs were loaded at least once (no celebrations before that) */
  isReady: boolean;
  presentation: UnlockPresentation;
  /** mark stamps as seen; `celebrated` counts towards the throttle (default true) */
  acknowledge: (
    ids: readonly string[],
    opts?: { celebrated?: boolean },
  ) => void;
  dismissRestoreNotice: () => void;
  /** a review was viewed to the end (stamp "reviews4") */
  recordReviewViewed: (weekStart: string) => void;
  /** the share sheet was completed (stamp "sharedFirst") */
  recordShared: () => void;
}

/**
 * Stamps derived from the ledger + counters (docs/05 §2.6). "Seen" and "unlocked" records are
 * persisted locally; nothing is ever revoked. While inputs are still loading nothing new unlocks.
 */
export function useAchievements(): AchievementsResult {
  const core = useRhythmCore();
  const { userId, ledger, rhythm } = core;
  const local = useUserLocal(userId);
  const { profile } = useProfile();
  const { enabled: healthEnabled } = useHealthSettings();
  const { estimate } = useAdaptiveTdee();
  const counts = useLifetimeCounts();
  const progress = useExerciseProgressRows();
  const weights = useWeightPoints();

  const isReady =
    ledger.isReady && !!counts.data && !!progress.data && !!weights.data;

  const facts = useMemo((): AchievementFacts | null => {
    if (!counts.data || !progress.data || !weights.data) return null;
    const body = bodyFactsFromWeights(weights.data);
    return {
      today: ledger.today,
      days: ledger.days,
      rhythm,
      dayContext: core.dayContext,
      pauses: local.pauses,
      counts: counts.data.counts,
      strength: deriveStrengthFacts(progress.data, body.trendWeightKg),
      body: {
        startWeightKg: body.startWeightKg,
        trendWeightKg: body.trendWeightKg,
        targetWeightKg: profile?.target_weight_kg ?? null,
        goal: (profile?.goal ?? null) as Goal | null,
        heightCm: profile?.height_cm ?? null,
      },
      flags: {
        healthConnected: healthEnabled,
        healthWorkoutImported: counts.data.healthWorkoutImported,
        adaptiveTdeeAvailable: estimate !== null,
        patternFound: hasTrainingPattern(ledger.days),
        sharedCount: local.sharedCount,
        reviewsViewed: local.reviewsViewed.length,
        accountCreatedAt: profile?.created_at ?? ledger.today,
      },
      careFlagged: core.careFlagged,
    };
  }, [
    counts.data,
    progress.data,
    weights.data,
    ledger.today,
    ledger.days,
    rhythm,
    core.dayContext,
    core.careFlagged,
    local.pauses,
    local.sharedCount,
    local.reviewsViewed.length,
    profile?.target_weight_kg,
    profile?.goal,
    profile?.height_cm,
    profile?.created_at,
    healthEnabled,
    estimate,
  ]);

  const merged = useMemo(() => {
    const evaluated = facts ? evaluateAchievements(facts) : [];
    // Without loaded inputs only persisted unlocks are shown (never a half-evaluated state).
    return mergeUnlocked(local.achvUnlocked, evaluated, ledger.today);
  }, [facts, local.achvUnlocked, ledger.today]);

  const seen = useMemo(
    () => (local.achvSeen ? new Set(local.achvSeen) : null),
    [local.achvSeen],
  );
  const celebratedToday =
    local.celebrations.date === ledger.today ? local.celebrations.count : 0;
  const presentation = useMemo(
    () =>
      isReady
        ? planUnlockPresentation({
            seen,
            statuses: merged.statuses,
            celebratedToday,
            celebratedThisOpen,
          })
        : {
            celebrate: [],
            stacked: [],
            silent: [],
            restoredCount: 0,
            markSeen: [],
          },
    // celebratedThisOpen is a module counter; it changes together with `local.celebrations`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isReady, seen, merged.statuses, celebratedToday, local.celebrations.count],
  );

  // Persist new unlocks (no revocation) and initialise the seen set once everything is loaded.
  useEffect(() => {
    if (!userId || !isReady) return;
    const changed =
      Object.keys(merged.record).length !==
      Object.keys(local.achvUnlocked).length;
    if (changed)
      patchUserLocal(userId, () => ({ achvUnlocked: merged.record }));
    if (local.achvSeen === null) {
      patchUserLocal(userId, () => ({
        achvSeen: presentation.markSeen,
        restoreNotice:
          presentation.restoredCount > 0 ? presentation.restoredCount : null,
      }));
    }
  }, [
    userId,
    isReady,
    merged.record,
    local.achvUnlocked,
    local.achvSeen,
    presentation,
  ]);

  const acknowledge = useCallback(
    (ids: readonly string[], opts?: { celebrated?: boolean }) => {
      if (!userId || ids.length === 0) return;
      const celebrated = opts?.celebrated ?? true;
      if (celebrated) celebratedThisOpen += ids.length;
      patchUserLocal(userId, (c) => ({
        achvSeen: [...new Set([...(c.achvSeen ?? []), ...ids])],
        celebrations: celebrated
          ? {
              date: ledger.today,
              count:
                (c.celebrations.date === ledger.today
                  ? c.celebrations.count
                  : 0) + ids.length,
            }
          : c.celebrations,
      }));
    },
    [userId, ledger.today],
  );
  const dismissRestoreNotice = useCallback(() => {
    if (userId) patchUserLocal(userId, () => ({ restoreNotice: null }));
  }, [userId]);
  const recordReviewViewed = useCallback(
    (weekStart: string) => {
      if (!userId) return;
      patchUserLocal(userId, (c) =>
        c.reviewsViewed.includes(weekStart)
          ? {}
          : { reviewsViewed: [...c.reviewsViewed, weekStart] },
      );
    },
    [userId],
  );
  const recordShared = useCallback(() => {
    if (userId)
      patchUserLocal(userId, (c) => ({ sharedCount: c.sharedCount + 1 }));
  }, [userId]);

  return {
    statuses: merged.statuses,
    unlockedCount: merged.statuses.filter((s) => s.unlocked).length,
    total: merged.statuses.length,
    celebrate: presentation.celebrate,
    stacked: presentation.stacked,
    restoreNotice: local.restoreNotice,
    isReady,
    presentation,
    acknowledge,
    dismissRestoreNotice,
    recordReviewViewed,
    recordShared,
  };
}

/**
 * The weekly review ("Gezeitentafel") for a week (default: the current one), built from the ledger,
 * rhythm replay, exercise progress and weight history. `review` is null until the ledger is ready.
 */
export function useWeeklyReview(weekStart?: string): {
  review: WeeklyReview | null;
  weekStart: string;
  isReady: boolean;
} {
  const core = useRhythmCore();
  const {
    ledger,
    rhythm,
    goalsForWeek,
    dayContext,
    careFlagged,
    plannedWeekdays,
  } = core;
  const progress = useExerciseProgressRows();
  const weights = useWeightPoints();
  const start = weekStart ?? weekStartFor(ledger.today);

  const review = useMemo(() => {
    if (!ledger.isReady) return null;
    const end = shiftIsoDate(start, 6);
    return buildWeeklyReview({
      weekStart: start,
      days: ledger.days,
      rings: computeWeekRings(
        ledger.days,
        start,
        goalsForWeek(start),
        dayContext,
      ),
      rhythm,
      plannedWeekdays,
      prs: weeklyPrs(progress.data ?? [], start),
      comparison: trainingComparisonUntil(ledger.days, end),
      weight: trendDeltaInRange(weights.data ?? [], start, end),
      nextGoals: goalsForWeek(shiftIsoDate(start, 7)),
      careFlagged,
    });
  }, [
    ledger.isReady,
    ledger.days,
    start,
    goalsForWeek,
    dayContext,
    rhythm,
    plannedWeekdays,
    progress.data,
    weights.data,
    careFlagged,
  ]);

  return { review, weekStart: start, isReady: ledger.isReady };
}
