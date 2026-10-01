import * as Crypto from 'expo-crypto';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import {
  loggedAtForDate,
  rankQuickLogCandidates,
  resolveLogDate,
  suggestMealType,
  type MealType,
} from '@/domain';
import { toISODate } from '@/lib/date';

import type { DraftFoodItem } from './draftStore';
import {
  useBumpFavoriteUseCount,
  useFavoriteMeals,
  useRecentFoodLogs,
  useSaveFoodDraft,
  type FavoriteMealRow,
  type FoodLogWithItems,
} from './queries';

type ItemTemplate = Omit<DraftFoodItem, 'id'>;

/** Favorites store items as snake_case JSON; map them to draft items (fresh ids). */
export function favoriteToItems(favorite: FavoriteMealRow): DraftFoodItem[] {
  const raw =
    (favorite.items as unknown as
      | {
          name: string;
          grams: number;
          kcal: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        }[]
      | null) ?? [];
  return raw.map((item) => ({
    id: Crypto.randomUUID(),
    name: item.name,
    grams: item.grams,
    kcal: item.kcal,
    proteinG: item.protein_g,
    carbsG: item.carbs_g,
    fatG: item.fat_g,
  }));
}

export function logToItems(log: FoodLogWithItems): DraftFoodItem[] {
  return log.items.map((item) => ({
    id: Crypto.randomUUID(),
    name: item.name,
    grams: item.grams ?? 0,
    kcal: item.kcal,
    proteinG: item.protein_g,
    carbsG: item.carbs_g,
    fatG: item.fat_g,
    barcode: item.barcode,
  }));
}

export interface QuickLogEntry {
  /** Stable key for lists. */
  key: string;
  title: string;
  kcal: number;
  /** How often it was logged (recent entries only). */
  count: number;
  kind: 'favorite' | 'recent';
  favorite?: FavoriteMealRow;
  log?: FoodLogWithItems;
}

/**
 * Favorites (most used first) + recent/frequent meals ranked for the current time of day.
 * Recents that are already a favorite (same title) are dropped to avoid duplicates.
 */
export function useQuickLogEntries(): {
  favorites: QuickLogEntry[];
  recents: QuickLogEntry[];
  suggestedMealType: MealType;
  isLoading: boolean;
} {
  const { favorites, isLoading: favLoading } = useFavoriteMeals();
  const { logs, isLoading: logsLoading } = useRecentFoodLogs(60);

  return useMemo(() => {
    const now = new Date();
    const favoriteEntries: QuickLogEntry[] = favorites.map((favorite) => {
      const items =
        (favorite.items as unknown as { kcal: number }[] | null) ?? [];
      return {
        key: `fav:${favorite.id}`,
        title: favorite.title,
        kcal: items.reduce((sum, item) => sum + (item.kcal ?? 0), 0),
        count: favorite.use_count,
        kind: 'favorite',
        favorite,
      };
    });
    const favoriteTitles = new Set(
      favorites.map((f) => f.title.trim().toLowerCase()),
    );

    const ranked = rankQuickLogCandidates(
      logs
        .filter((log) => log.items.length > 0)
        .map((log) => ({
          id: log.id,
          title: log.title,
          mealType: log.meal_type as MealType,
          loggedAt: log.logged_at,
          kcal: log.kcal,
          raw: log,
        })),
      now,
      12,
    );
    const recentEntries: QuickLogEntry[] = ranked
      .filter(
        (c) => !favoriteTitles.has((c.log.title ?? '').trim().toLowerCase()),
      )
      .slice(0, 8)
      .map((c) => ({
        key: `log:${c.log.id}`,
        title: c.log.title ?? '',
        kcal: c.log.kcal,
        count: c.count,
        kind: 'recent',
        log: c.log.raw,
      }));

    return {
      favorites: favoriteEntries,
      recents: recentEntries,
      suggestedMealType: suggestMealType(now),
      isLoading: favLoading || logsLoading,
    };
  }, [favorites, logs, favLoading, logsLoading]);
}

/**
 * One-tap re-log: saves a copy of a favorite / recent meal for *now* with the meal type
 * picked by `suggestMealType`, on `date` (default today), without going through the review screen.
 */
export function useQuickLogMeal() {
  const save = useSaveFoodDraft();
  const bump = useBumpFavoriteUseCount();

  return useMutation({
    mutationFn: async ({
      entry,
      date,
    }: {
      entry: QuickLogEntry;
      /** Local YYYY-MM-DD to log on (the viewed day); default today. */
      date?: string;
    }) => {
      const now = new Date();
      const items: ItemTemplate[] = entry.favorite
        ? favoriteToItems(entry.favorite)
        : entry.log
          ? logToItems(entry.log)
          : [];
      if (items.length === 0) throw new Error('nothing_to_log');

      const logDate = resolveLogDate(date, toISODate(now));
      const id = Crypto.randomUUID();
      await save.mutateAsync({
        id,
        date: logDate,
        loggedAt: loggedAtForDate(logDate, now),
        mealType: suggestMealType(now),
        title: entry.title,
        source: 'favorite',
        imagePath: null,
        aiConfidence: null,
        aiRaw: null,
        items: items as DraftFoodItem[],
        saveAsFavorite: false,
      });
      if (entry.favorite) {
        bump.mutate({
          id: entry.favorite.id,
          useCount: entry.favorite.use_count,
        });
      }
      return id;
    },
  });
}
