import * as Crypto from 'expo-crypto';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  buildIngredientCatalog,
  findCatalogEntry,
  ingredientFromCatalog,
  loggedAtForDate,
  parseFavoriteItems,
  parseIngredientLine,
  resolveLogDate,
  scaleRecipeForLog,
  serializeRecipeItems,
  suggestMealType,
  sumRecipe,
  type FoodItemMacros,
  type IngredientCatalogEntry,
  type MealType,
  type RecipeIngredient,
} from '@/domain';
import { useSession } from '@/features/auth';
import { toISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/types/database';

import type { DraftFoodItem } from './draftStore';
import { foodKeys } from './keys';
import {
  AnalyzeFoodError,
  useAnalyzeFood,
  useBumpFavoriteUseCount,
  useFavoriteMeals,
  useRecentFoodLogs,
  useSaveFoodDraft,
  type FavoriteMealRow,
} from './queries';

/**
 * Own dishes ("Meine Gerichte"). Stored as `favorite_meals` rows whose items are normalised
 * per serving and carry `recipe: { servings, totalGrams? }` (see `src/domain/recipe.ts`).
 */
export interface Recipe {
  id: string;
  title: string;
  servings: number;
  totalGrams: number | null;
  /** Stored items = one serving. */
  perServingItems: RecipeIngredient[];
  perServingTotals: FoodItemMacros;
  useCount: number;
  favorite: FavoriteMealRow;
}

export function favoriteToRecipe(favorite: FavoriteMealRow): Recipe | null {
  const { items, recipe } = parseFavoriteItems(favorite.items);
  if (!recipe) return null;
  return {
    id: favorite.id,
    title: favorite.title,
    servings: recipe.servings,
    totalGrams: recipe.totalGrams ?? null,
    perServingItems: items,
    perServingTotals: sumRecipe(items),
    useCount: favorite.use_count,
    favorite,
  };
}

/** True for favorites saved through the recipe editor. */
export function isRecipeFavorite(favorite: FavoriteMealRow): boolean {
  return parseFavoriteItems(favorite.items).recipe != null;
}

/** All recipes, most used first (same order as favorites). */
export function useRecipes(): { recipes: Recipe[]; isLoading: boolean } {
  const { favorites, isLoading } = useFavoriteMeals();
  const recipes = useMemo(
    () => favorites.map(favoriteToRecipe).filter((r): r is Recipe => r != null),
    [favorites],
  );
  return { recipes, isLoading };
}

/** One recipe by id (from the favorites query). */
export function useRecipe(id: string | null | undefined): {
  recipe: Recipe | null;
  isLoading: boolean;
} {
  const { recipes, isLoading } = useRecipes();
  return {
    recipe: id ? (recipes.find((r) => r.id === id) ?? null) : null,
    isLoading,
  };
}

export interface SaveRecipeInput {
  /** Client UUID; pass the existing id when editing. */
  id: string;
  title: string;
  servings: number;
  totalGrams?: number | null;
  /** Whole-recipe ingredient amounts (divided per serving on save). */
  ingredients: RecipeIngredient[];
}

/** Inserts or updates a recipe (`favorite_meals` upsert on the client id; use_count untouched). */
export function useSaveRecipe() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveRecipeInput) => {
      if (!userId) throw new Error('not_authenticated');
      const items = serializeRecipeItems(
        input.ingredients.filter((i) => i.name.trim() || i.kcal > 0),
        {
          servings: input.servings,
          totalGrams: input.totalGrams ?? undefined,
        },
      ) as unknown as Json;
      const { error } = await supabase.from('favorite_meals').upsert(
        {
          id: input.id,
          user_id: userId,
          title: input.title.trim(),
          items,
        },
        { onConflict: 'id' },
      );
      if (error) throw error;
      return input.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('favorite_meals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
    },
  });
}

/**
 * One-tap log of `portions` servings (0.25–4) of a recipe on `date` (default today),
 * meal type = `mealType` or the time-of-day suggestion. Bumps the recipe's use_count.
 */
export function useLogRecipe() {
  const save = useSaveFoodDraft();
  const bump = useBumpFavoriteUseCount();
  return useMutation({
    mutationFn: async ({
      recipe,
      portions,
      date,
      mealType,
    }: {
      recipe: Recipe;
      portions: number;
      date?: string;
      mealType?: MealType;
    }) => {
      if (recipe.perServingItems.length === 0) throw new Error('empty_recipe');
      const now = new Date();
      const logDate = resolveLogDate(date, toISODate(now));
      const items: DraftFoodItem[] = scaleRecipeForLog(
        recipe.perServingItems,
        portions,
      ).map((item) => ({ ...item, id: Crypto.randomUUID() }));
      const id = Crypto.randomUUID();
      await save.mutateAsync({
        id,
        date: logDate,
        loggedAt: loggedAtForDate(logDate, now),
        mealType: mealType ?? suggestMealType(now),
        title: recipe.title,
        source: 'favorite',
        imagePath: null,
        aiConfidence: null,
        aiRaw: null,
        items,
        saveAsFavorite: false,
      });
      bump.mutate({ id: recipe.id, useCount: recipe.useCount });
      return id;
    },
  });
}

/** Ingredients the user has logged before (recent food items + favorite items), deduped. */
export function useIngredientCatalog(): {
  catalog: IngredientCatalogEntry[];
  isLoading: boolean;
} {
  // Same limit as useQuickLogEntries: the recent query key is shared.
  const { logs, isLoading: logsLoading } = useRecentFoodLogs(60);
  const { favorites, isLoading: favLoading } = useFavoriteMeals();
  const catalog = useMemo(() => {
    const fromLogs: RecipeIngredient[] = logs.flatMap((log) =>
      log.items.map((item) => ({
        name: item.name,
        grams: item.grams ?? 0,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
        barcode: item.barcode,
      })),
    );
    const fromFavorites = favorites.flatMap(
      (f) => parseFavoriteItems(f.items).items,
    );
    return buildIngredientCatalog([...fromLogs, ...fromFavorites]);
  }, [logs, favorites]);
  return { catalog, isLoading: logsLoading || favLoading };
}

export type IngredientLookupResult =
  | { ok: true; items: RecipeIngredient[]; fromCatalog: boolean }
  | { ok: false; failure: 'ai_limit_reached' | 'generic' };

/**
 * Resolves one free-text line ("200 g Haferflocken") into ingredient(s). An exact match in the
 * user's own catalog is used directly (no AI call); otherwise `analyze-food` estimates it.
 * Does not touch the food draft.
 */
export function useIngredientLookup(catalog: IngredientCatalogEntry[]) {
  const { i18n } = useTranslation();
  const analyze = useAnalyzeFood();

  const lookup = useCallback(
    async (text: string): Promise<IngredientLookupResult> => {
      const parsed = parseIngredientLine(text);
      const known = parsed ? findCatalogEntry(catalog, parsed.name) : null;
      if (parsed && known) {
        return {
          ok: true,
          items: [ingredientFromCatalog(known, parsed.grams)],
          fromCatalog: true,
        };
      }
      try {
        const result = await analyze.mutateAsync({
          text,
          locale: i18n.language,
        });
        return {
          ok: true,
          fromCatalog: false,
          items: result.items.map((item) => ({
            name: item.name,
            grams: item.grams,
            kcal: item.kcal,
            proteinG: item.protein_g,
            carbsG: item.carbs_g,
            fatG: item.fat_g,
          })),
        };
      } catch (error) {
        console.warn('analyze ingredient failed', error);
        return {
          ok: false,
          failure:
            error instanceof AnalyzeFoodError && error.status === 402
              ? 'ai_limit_reached'
              : 'generic',
        };
      }
    },
    [analyze, catalog, i18n.language],
  );

  return { lookup, isPending: analyze.isPending };
}
