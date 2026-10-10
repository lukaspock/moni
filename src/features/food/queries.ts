import * as ImageManipulator from 'expo-image-manipulator';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import {
  deleteFoodLogFromHealth,
  exportFoodLogToHealth,
} from '@/features/health';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';
import { isRecipeItems } from '@/domain/recipe';

import { foodKeys } from './keys';
import type { DraftFoodItem } from './draftStore';

export type FoodLogRow = Database['public']['Tables']['food_logs']['Row'];
export type FoodItemRow = Database['public']['Tables']['food_items']['Row'];
export type FavoriteMealRow =
  Database['public']['Tables']['favorite_meals']['Row'];

export type FoodLogWithItems = FoodLogRow & { items: FoodItemRow[] };

const FOOD_IMAGES_BUCKET = 'food-images';

/** All food_logs (+ their items) for a local date, newest first. */
export function useFoodLogsForDate(date: string) {
  const { userId } = useSession();

  const query = useQuery({
    queryKey: foodKeys.logsForDate(userId, date),
    enabled: !!userId,
    queryFn: async (): Promise<FoodLogWithItems[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, food_items(*)')
        .eq('user_id', userId as string)
        .eq('date', date)
        .order('logged_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { food_items, ...rest } = row as FoodLogRow & {
          food_items: FoodItemRow[];
        };
        return { ...rest, items: food_items ?? [] } as FoodLogWithItems;
      });
    },
  });

  return { logs: query.data ?? [], isLoading: query.isLoading };
}

/** Most recently logged food_logs across all dates (for "Recent" in log-food). */
export function useRecentFoodLogs(limit = 15) {
  const { userId } = useSession();

  const query = useQuery({
    queryKey: foodKeys.recent(userId),
    enabled: !!userId,
    queryFn: async (): Promise<FoodLogWithItems[]> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, food_items(*)')
        .eq('user_id', userId as string)
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { food_items, ...rest } = row as FoodLogRow & {
          food_items: FoodItemRow[];
        };
        return { ...rest, items: food_items ?? [] } as FoodLogWithItems;
      });
    },
  });

  return { logs: query.data ?? [], isLoading: query.isLoading };
}

/** Saved favorite meals, most used first. */
export function useFavoriteMeals() {
  const { userId } = useSession();

  const query = useQuery({
    queryKey: foodKeys.favorites(userId),
    enabled: !!userId,
    queryFn: async (): Promise<FavoriteMealRow[]> => {
      const { data, error } = await supabase
        .from('favorite_meals')
        .select('*')
        .eq('user_id', userId as string)
        .order('use_count', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return { favorites: query.data ?? [], isLoading: query.isLoading };
}

/** A single food_log (+ items) by id, for the "tap to edit" flow on the dashboard. */
export function useFoodLogById(id: string | null) {
  const query = useQuery({
    queryKey: ['food', 'byId', id],
    enabled: !!id,
    queryFn: async (): Promise<FoodLogWithItems | null> => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, food_items(*)')
        .eq('id', id as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { food_items, ...rest } = data as FoodLogRow & {
        food_items: FoodItemRow[];
      };
      return { ...rest, items: food_items ?? [] };
    },
  });
  return { log: query.data ?? null, isLoading: query.isLoading };
}

/** Deletes a food_log (its food_items cascade). */
export function useDeleteFoodLog() {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['targets'] });
      void queryClient.invalidateQueries({ queryKey: ['workout'] });
      void (userId && null);
      // Apple Health: remove this log's nutrition samples (fire-and-forget; no-op unless "write nutrition" is on).
      void deleteFoodLogFromHealth(id);
    },
  });
}

export interface SaveFoodDraftInput {
  id: string;
  date: string;
  loggedAt: string;
  mealType: Database['public']['Tables']['food_logs']['Row']['meal_type'];
  title: string;
  source: Database['public']['Tables']['food_logs']['Row']['source'];
  imagePath: string | null;
  aiConfidence: number | null;
  aiRaw: Json | null;
  items: DraftFoodItem[];
  saveAsFavorite: boolean;
  /** true = update an existing food_log (dashboard "tap to edit") instead of inserting a new one. */
  isEdit?: boolean;
}

/** Inserts (or, with `isEdit`, updates) food_logs + food_items and optionally favorite_meals. */
export function useSaveFoodDraft() {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveFoodDraftInput) => {
      if (!userId) throw new Error('not_authenticated');

      const totals = input.items.reduce(
        (acc, item) => ({
          kcal: acc.kcal + item.kcal,
          proteinG: acc.proteinG + item.proteinG,
          carbsG: acc.carbsG + item.carbsG,
          fatG: acc.fatG + item.fatG,
        }),
        { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      );

      const logPayload = {
        user_id: userId,
        date: input.date,
        logged_at: input.loggedAt,
        meal_type: input.mealType,
        title: input.title || null,
        source: input.source,
        image_path: input.imagePath,
        kcal: Math.round(totals.kcal),
        protein_g: round1(totals.proteinG),
        carbs_g: round1(totals.carbsG),
        fat_g: round1(totals.fatG),
        ai_confidence: input.aiConfidence,
        ai_raw: input.aiRaw,
      };

      // Upsert + clear items makes a retry after a half-failed save (log written, items not)
      // idempotent instead of hitting a duplicate-key error on the client-generated id.
      const { error: logError } = await supabase
        .from('food_logs')
        .upsert({ id: input.id, ...logPayload }, { onConflict: 'id' });
      if (logError) throw logError;

      const { error: clearItemsError } = await supabase
        .from('food_items')
        .delete()
        .eq('food_log_id', input.id);
      if (clearItemsError) throw clearItemsError;

      if (input.items.length > 0) {
        const { error: itemsError } = await supabase.from('food_items').insert(
          input.items.map((item) => ({
            food_log_id: input.id,
            name: item.name,
            grams: item.grams,
            kcal: Math.round(item.kcal),
            protein_g: round1(item.proteinG),
            carbs_g: round1(item.carbsG),
            fat_g: round1(item.fatG),
            barcode: item.barcode ?? null,
          })),
        );
        if (itemsError) throw itemsError;
      }

      if (input.saveAsFavorite) {
        const favoriteTitle = input.title || 'Meal';
        const { data: existingFavorite } = await supabase
          .from('favorite_meals')
          .select('id, items')
          .eq('user_id', userId)
          .eq('title', favoriteTitle)
          .limit(1)
          .maybeSingle();
        const favoriteItems = input.items.map((item) => ({
          name: item.name,
          grams: item.grams,
          kcal: item.kcal,
          protein_g: item.proteinG,
          carbs_g: item.carbsG,
          fat_g: item.fatG,
        })) as unknown as Json;
        // Same title again -> refresh that favorite instead of piling up duplicates.
        // A self-built dish (recipe) with that title is never overwritten.
        const { error: favError } = existingFavorite
          ? isRecipeItems(existingFavorite.items)
            ? { error: null }
            : await supabase
                .from('favorite_meals')
                .update({ items: favoriteItems })
                .eq('id', existingFavorite.id)
          : await supabase.from('favorite_meals').insert({
              user_id: userId,
              title: favoriteTitle,
              items: favoriteItems,
            });
        if (favError) throw favError;
      }

      // Apple Health: write/replace kcal + macros (fire-and-forget; no-op unless "write nutrition" is on).
      void exportFoodLogToHealth({
        id: input.id,
        loggedAt: input.loggedAt,
        title: logPayload.title,
        kcal: logPayload.kcal,
        proteinG: logPayload.protein_g,
        carbsG: logPayload.carbs_g,
        fatG: logPayload.fat_g,
      });

      return input.id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['targets'] });
    },
  });
}

/** Bumps a favorite meal's use_count (best-effort, e.g. after "use again"). */
export function useBumpFavoriteUseCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, useCount }: { id: string; useCount: number }) => {
      const { error } = await supabase
        .from('favorite_meals')
        .update({ use_count: useCount + 1 })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.all });
    },
  });
}

export interface AnalyzeFoodInput {
  imagePath?: string;
  text?: string;
  locale?: string;
}

export interface AnalyzeFoodResult {
  title: string;
  meal_guess: string | null;
  items: {
    name: string;
    grams: number;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }[];
  confidence: number;
  clarification?: string;
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  usage: { used: number; limit: number | null };
}

export class AnalyzeFoodError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public code: string | null,
  ) {
    super(message);
    this.name = 'AnalyzeFoodError';
  }
}

/** The edge function gives up on Gemini after ~60 s; never let the UI spin longer than this. */
const ANALYZE_CLIENT_TIMEOUT_MS = 75_000;

async function invokeAnalyze<T>(body: Record<string, unknown>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AnalyzeFoodError('timeout', 504, 'client_timeout')),
      ANALYZE_CLIENT_TIMEOUT_MS,
    );
  });
  const { data, error } = await Promise.race([
    supabase.functions.invoke('analyze-food', { body }),
    timeout,
  ]).finally(() => clearTimeout(timer));

  if (error) {
    // supabase-js FunctionsHttpError exposes the response on `context`.
    const context = (error as { context?: Response }).context;
    const status = context?.status ?? null;
    let code: string | null = null;
    try {
      const errBody = context ? await context.clone().json() : null;
      code = errBody?.error ?? null;
      if (code && errBody?.detail) code = `${code} (${errBody.detail})`;
    } catch {
      // ignore parse failures, fall back to generic error
    }
    throw new AnalyzeFoodError(error.message, status, code);
  }

  if (!data) throw new AnalyzeFoodError('empty_response', null, null);
  return data as T;
}

/** Calls the `analyze-food` Edge Function (PLAN §7.3). Throws `AnalyzeFoodError` on failure. */
export function useAnalyzeFood() {
  return useMutation({
    mutationFn: (input: AnalyzeFoodInput): Promise<AnalyzeFoodResult> =>
      invokeAnalyze<AnalyzeFoodResult>({
        image_path: input.imagePath,
        text: input.text,
        locale: input.locale ?? 'en',
      }),
  });
}

export interface NutritionLabelMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface AnalyzeLabelResult {
  mode: 'label';
  label: {
    product_name: string | null;
    serving_size_g: number | null;
    per_100g: NutritionLabelMacros;
    per_serving: NutritionLabelMacros | null;
    confidence: number;
  };
  usage: { used: number; limit: number | null };
}

/**
 * Reads a photographed nutrition table via `analyze-food` (mode "label"). Counts toward the
 * AI limit (402 = limit reached); an unreadable table is a 422 `label_not_readable` and is free.
 */
export function useAnalyzeLabel() {
  return useMutation({
    mutationFn: (input: {
      imagePath: string;
      locale?: string;
    }): Promise<AnalyzeLabelResult> =>
      invokeAnalyze<AnalyzeLabelResult>({
        mode: 'label',
        image_path: input.imagePath,
        locale: input.locale ?? 'en',
      }),
  });
}

/** Compresses a photo to ~1024px / JPEG 0.7 and uploads it to `food-images/{userId}/{foodLogId}.jpg`. */
export async function uploadFoodImage(opts: {
  userId: string;
  foodLogId: string;
  localUri: string;
  /** Output width in px (default 1024; nutrition labels need more, e.g. 1600, to stay legible). */
  width?: number;
}): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    opts.localUri,
    [{ resize: { width: opts.width ?? 1024 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(manipulated.uri);
  const arrayBuffer = await response.arrayBuffer();
  const path = `${opts.userId}/${opts.foodLogId}.jpg`;

  const { error } = await supabase.storage
    .from(FOOD_IMAGES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;

  return path;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
