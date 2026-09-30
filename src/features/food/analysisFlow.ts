import * as Crypto from 'expo-crypto';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { MealType } from '@/domain';
import { useSession } from '@/features/auth';
import type { Json } from '@/types/database';

import { useFoodDraftStore, type DraftFoodItem } from './draftStore';
import {
  AnalyzeFoodError,
  uploadFoodImage,
  useAnalyzeFood,
  useAnalyzeLabel,
  type AnalyzeFoodResult,
  type AnalyzeLabelResult,
} from './queries';

export type AnalysisFailure =
  'ai_limit_reached' | 'label_not_readable' | 'generic';

function failureKind(error: unknown): AnalysisFailure {
  if (error instanceof AnalyzeFoodError) {
    if (error.status === 402) return 'ai_limit_reached';
    if (error.code === 'label_not_readable') return 'label_not_readable';
  }
  return 'generic';
}

function toDraftItems(result: AnalyzeFoodResult): DraftFoodItem[] {
  return result.items.map((item) => ({
    id: Crypto.randomUUID(),
    name: item.name,
    grams: item.grams,
    kcal: item.kcal,
    proteinG: item.protein_g,
    carbsG: item.carbs_g,
    fatG: item.fat_g,
  }));
}

/**
 * Orchestrates the AI calls of the log-food chain. The draft must already be `start()`ed and
 * the review screen open in `analyzing` state; results are only applied while that same draft
 * is still current (the user may have cancelled the review in the meantime).
 */
export function useFoodAnalysis() {
  const { i18n } = useTranslation();
  const { userId } = useSession();
  const analyzeFood = useAnalyzeFood();
  const analyzeLabel = useAnalyzeLabel();

  /** Analyzes free text into the current draft. Resolves with a failure kind or null on success. */
  const analyzeText = useCallback(
    async (text: string): Promise<AnalysisFailure | null> => {
      const draftId = useFoodDraftStore.getState().id;
      try {
        const result = await analyzeFood.mutateAsync({
          text,
          locale: i18n.language,
        });
        if (useFoodDraftStore.getState().id !== draftId) return null;
        useFoodDraftStore.getState().applyAiResult({
          title: result.title,
          mealType: (result.meal_guess as MealType | null) ?? null,
          items: toDraftItems(result),
          confidence: result.confidence,
          aiRaw: result as unknown as Json,
          clarification: result.clarification ?? null,
        });
        return null;
      } catch (error) {
        return failureKind(error);
      }
    },
    [analyzeFood, i18n.language],
  );

  /** Uploads + analyzes a meal photo into the current draft. */
  const analyzePhoto = useCallback(
    async (localUri: string): Promise<AnalysisFailure | null> => {
      if (!userId) return 'generic';
      const draftId = useFoodDraftStore.getState().id;
      try {
        const path = await uploadFoodImage({
          userId,
          foodLogId: draftId,
          localUri,
        });
        if (useFoodDraftStore.getState().id !== draftId) return null;
        useFoodDraftStore.getState().setImagePath(path);
        const result = await analyzeFood.mutateAsync({
          imagePath: path,
          locale: i18n.language,
        });
        if (useFoodDraftStore.getState().id !== draftId) return null;
        useFoodDraftStore.getState().applyAiResult({
          title: result.title,
          mealType: (result.meal_guess as MealType | null) ?? null,
          items: toDraftItems(result),
          confidence: result.confidence,
          aiRaw: result as unknown as Json,
          clarification: result.clarification ?? null,
        });
        return null;
      } catch (error) {
        return failureKind(error);
      }
    },
    [analyzeFood, i18n.language, userId],
  );

  /** Reads a nutrition table photo. Does not touch the draft; returns the label or a failure. */
  const analyzeLabelPhoto = useCallback(
    async (
      localUri: string,
    ): Promise<
      { label: AnalyzeLabelResult['label'] } | { failure: AnalysisFailure }
    > => {
      if (!userId) return { failure: 'generic' };
      try {
        const path = await uploadFoodImage({
          userId,
          foodLogId: `label-${Crypto.randomUUID()}`,
          localUri,
          width: 1600,
        });
        const result = await analyzeLabel.mutateAsync({
          imagePath: path,
          locale: i18n.language,
        });
        return { label: result.label };
      } catch (error) {
        return { failure: failureKind(error) };
      }
    },
    [analyzeLabel, i18n.language, userId],
  );

  return { analyzeText, analyzePhoto, analyzeLabelPhoto };
}
