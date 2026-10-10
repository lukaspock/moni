import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import type { FoodSource } from '@/domain';
import {
  useFoodAnalysis,
  useFoodDraftStore,
  type AnalysisFailure,
} from '@/features/food';
import { haptic } from '@/lib/haptics';

/**
 * Starts the photo / text logging flows straight from Today (same draft + analysis path as
 * `app/log-food.tsx`), then opens the review sheet. Barcode/label go to the scanner route.
 */
export function useQuickCapture(date: string) {
  const { t } = useTranslation();
  const { analyzeText, analyzePhoto } = useFoodAnalysis();
  const [busy, setBusy] = useState(false);

  const begin = useCallback(
    (source: FoodSource) => {
      const store = useFoodDraftStore.getState();
      store.start({ date, source });
      store.setStatus('analyzing');
      haptic.aiStart();
      router.push('/food-review');
    },
    [date],
  );

  const finish = useCallback((failure: AnalysisFailure | null) => {
    if (failure)
      useFoodDraftStore
        .getState()
        .setStatus(
          'error',
          failure === 'ai_limit_reached' ? 'ai_limit_reached' : 'generic',
        );
  }, []);

  const photo = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('food.logFood.permissionDeniedTitle'),
          t('food.logFood.permissionDeniedBody'),
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
      if (result.canceled || !result.assets?.[0]) return;
      begin('photo');
      void analyzePhoto(result.assets[0].uri).then(finish);
    } finally {
      setBusy(false);
    }
  }, [busy, t, begin, analyzePhoto, finish]);

  const text = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      begin('text');
      void analyzeText(trimmed).then(finish);
    },
    [begin, analyzeText, finish],
  );

  const scanner = useCallback(
    (mode: 'barcode' | 'label') =>
      router.push({
        pathname: '/barcode-scanner',
        params: mode === 'label' ? { mode, date } : { date },
      }),
    [date],
  );

  return { photo, text, scanner, busy };
}
