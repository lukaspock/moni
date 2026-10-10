/**
 * Share-card models (docs/05 §7). Cards are rendered locally; this builder decides WHAT may appear.
 * Privacy by construction — a card never contains calorie values, body weight (kg/lb), target
 * weight, BMI, meal names, photos, location or exact times. Optional extras (first name, weight
 * trend delta, absolute protein grams) only appear when the user switched them on. While the care
 * signal is active, body/rhythm cards are not offered at all (`null`).
 * Pure; strings in the model are i18n keys or neutral numbers (the UI formats them).
 */

import type { AchievementCategory, AchievementId } from './achievements';
import type { DayGlyph } from './rhythm';
import type { StageKey } from './stage';
import type { WeekTitleKey } from './weeklyReview';

export type ShareCardKind = 'week' | 'workout' | 'achievement' | 'rhythm';

export interface ShareCardOptions {
  showName: boolean;
  showDetails: boolean;
}

export interface WeekShareSource {
  name: string | null;
  weekStart: string;
  titleKey: WeekTitleKey;
  days: DayGlyph[];
  foodDays: number;
  trainingDays: number;
  proteinDays: number;
  avgProteinG: number | null;
  rhythm: { current: number; stageKey: StageKey } | null;
  /** change of the weight trend over the week; only used when details are on */
  weightTrendDeltaKg: number | null;
}

export interface WorkoutShareSource {
  name: string | null;
  routineName: string | null;
  durationMin: number;
  /** lifted volume (kg*reps), strength */
  volume: number | null;
  distanceKm: number | null;
  prExerciseName: string | null;
}

export interface AchievementShareSource {
  name: string | null;
  id: AchievementId;
  category: AchievementCategory;
  unlockedOn: string | null;
}

export interface RhythmShareSource {
  name: string | null;
  current: number;
  lifetimeWeeks: number;
  stageKey: StageKey;
}

export interface ShareSourceMap {
  week: WeekShareSource;
  workout: WorkoutShareSource;
  achievement: AchievementShareSource;
  rhythm: RhythmShareSource;
}

export interface ShareStat {
  key: string;
  value: string;
}

export interface ShareCardModel {
  kind: ShareCardKind;
  /** i18n key of the card title */
  titleKey: string;
  /** first name, only with `showName` */
  name: string | null;
  stats: ShareStat[];
  days?: DayGlyph[];
  stageKey?: StageKey;
  achievementId?: AchievementId;
  /** YYYY-MM-DD (week start or unlock date) */
  date?: string;
}

/** Stat keys that must never be produced (guarded by tests). */
export const FORBIDDEN_SHARE_KEYS: readonly string[] = [
  'kcal',
  'calories',
  'weight',
  'weightKg',
  'targetWeight',
  'bmi',
  'meal',
  'mealName',
  'photo',
  'location',
  'time',
];

function cleanName(name: string | null, opts: ShareCardOptions): string | null {
  if (!opts.showName || !name) return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function num(n: number): string {
  return String(Math.round(n));
}

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r > 0 ? `+${r}` : String(r);
}

export function buildShareCardModel<K extends ShareCardKind>(
  kind: K,
  source: ShareSourceMap[K],
  opts: ShareCardOptions,
  flagged: boolean,
): ShareCardModel | null {
  switch (kind) {
    case 'week': {
      const s = source as WeekShareSource;
      const stats: ShareStat[] = [
        { key: 'trainingDays', value: num(s.trainingDays) },
        { key: 'foodDays', value: num(s.foodDays) },
        { key: 'proteinDays', value: num(s.proteinDays) },
      ];
      if (opts.showDetails && s.avgProteinG !== null && !flagged) {
        stats.push({ key: 'avgProteinG', value: num(s.avgProteinG) });
      }
      if (opts.showDetails && s.weightTrendDeltaKg !== null && !flagged) {
        stats.push({ key: 'trendDelta', value: signed(s.weightTrendDeltaKg) });
      }
      const model: ShareCardModel = {
        kind,
        titleKey: `shareCard.week.${s.titleKey}`,
        name: cleanName(s.name, opts),
        stats,
        days: s.days,
        date: s.weekStart,
      };
      if (s.rhythm && !flagged) {
        stats.push({ key: 'rhythmWeeks', value: num(s.rhythm.current) });
        model.stageKey = s.rhythm.stageKey;
      }
      return model;
    }
    case 'workout': {
      const s = source as WorkoutShareSource;
      const stats: ShareStat[] = [
        { key: 'durationMin', value: num(s.durationMin) },
      ];
      if (opts.showDetails) {
        if (s.volume !== null)
          stats.push({ key: 'volume', value: num(s.volume) });
        if (s.distanceKm !== null) {
          stats.push({
            key: 'distance',
            value: String(Math.round(s.distanceKm * 10) / 10),
          });
        }
      }
      if (s.prExerciseName)
        stats.push({ key: 'prExercise', value: s.prExerciseName });
      if (opts.showDetails && s.routineName) {
        stats.push({ key: 'routine', value: s.routineName });
      }
      return {
        kind,
        titleKey: 'shareCard.workout.title',
        name: cleanName(s.name, opts),
        stats,
      };
    }
    case 'achievement': {
      const s = source as AchievementShareSource;
      if (flagged && s.category === 'body') return null;
      return {
        kind,
        titleKey: `achievements.${s.id}.name`,
        name: cleanName(s.name, opts),
        stats: [],
        achievementId: s.id,
        date: s.unlockedOn ?? undefined,
      };
    }
    case 'rhythm': {
      if (flagged) return null;
      const s = source as RhythmShareSource;
      return {
        kind,
        titleKey: 'shareCard.rhythm.title',
        name: cleanName(s.name, opts),
        stats: [
          { key: 'rhythmWeeks', value: num(s.current) },
          { key: 'lifetimeWeeks', value: num(s.lifetimeWeeks) },
        ],
        stageKey: s.stageKey,
      };
    }
    default:
      return null;
  }
}
