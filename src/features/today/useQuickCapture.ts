import { useCallback } from 'react';
import { router, type Href } from 'expo-router';

import type { FoodSource, MealType } from '@/domain';
import {
  useFoodAnalysis,
  useFoodDraftStore,
  type AnalysisFailure,
} from '@/features/food';
import { haptic } from '@/lib/haptics';

const markFailure = (failure: AnalysisFailure | null) => {
  // Success is applied to the draft by the analysis hook; only failures need handling here.
  if (failure)
    useFoodDraftStore
      .getState()
      .setStatus(
        'error',
        failure === 'ai_limit_reached' ? 'ai_limit_reached' : 'generic',
      );
};

const openAnalyzingDraft = (
  source: FoodSource,
  date: string,
  options: { meal?: MealType; replace?: boolean } = {},
) => {
  const store = useFoodDraftStore.getState();
  store.start({ date, source });
  if (options.meal) store.setMealType(options.meal);
  store.setStatus('analyzing');
  haptic.aiStart();
  if (options.replace) router.replace('/food-review');
  else router.push('/food-review');
};

/**
 * Shared photo path (Today bar, `app/food-camera.tsx`): opens a fresh photo
 * draft in "analyzing" state, shows the review sheet and runs `analyzePhoto`.
 * `replace` swaps the current route (the camera) for the review sheet.
 */
export function useStartPhotoAnalysis() {
  const { analyzePhoto } = useFoodAnalysis();
  return useCallback(
    (
      uri: string,
      options: { date: string; meal?: MealType; replace?: boolean },
    ) => {
      openAnalyzingDraft('photo', options.date, options);
      void analyzePhoto(uri).then(markFailure);
    },
    [analyzePhoto],
  );
}

/** Opens the own camera screen (`app/food-camera.tsx`) for a given day. */
export function openFoodCamera(date: string, meal?: MealType): void {
  // Cast until the route is registered in app/_layout.tsx / typed routes regenerate.
  router.push({
    pathname: '/food-camera',
    params: meal ? { date, meal } : { date },
  } as Href);
}

/**
 * Starts the logging flows straight from Today (same draft + analysis path as
 * `app/log-food.tsx`). Photo opens the møni camera, text analyzes inline and
 * opens the review sheet, barcode/label go to the scanner route.
 */
export function useQuickCapture(date: string) {
  const { analyzeText } = useFoodAnalysis();
  const photo = useCallback(() => openFoodCamera(date), [date]);

  const text = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      openAnalyzingDraft('text', date);
      void analyzeText(trimmed).then(markFailure);
    },
    [date, analyzeText],
  );

  const scanner = useCallback(
    (mode: 'barcode' | 'label') =>
      router.push({
        pathname: '/barcode-scanner',
        params: mode === 'label' ? { mode, date } : { date },
      }),
    [date],
  );

  return { photo, text, scanner };
}
