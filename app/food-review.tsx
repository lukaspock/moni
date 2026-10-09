import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Illustration } from '@/components/brand';
import { RollingNumber, Reveal } from '@/components/motion';
import {
  Card,
  Chip,
  GlassActionButton,
  SectionHeader,
  SheetScreen,
} from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';

import type { FoodSource, MealType } from '@/domain';
import {
  PORTION_PRESETS,
  clampPortionMultiplier,
  scaleFoodItems,
  sumFoodItems,
} from '@/domain';
import {
  useFoodDraftStore,
  useFoodLogById,
  useSaveFoodDraft,
  useMealFlightBridge,
} from '@/features/food';
import {
  AnalysisProgress,
  type AnalysisKind,
} from '@/features/food/ui/AnalysisProgress';
import { FieldInput } from '@/features/food/ui/FieldInput';
import { IngredientList } from '@/features/food/ui/IngredientList';
import { MacroLine } from '@/features/food/ui/MacroLine';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const PORTION_STEP = 0.25;

function analysisKind(source: FoodSource): AnalysisKind {
  switch (source) {
    case 'photo':
      return 'photo';
    case 'text':
      return 'text';
    case 'barcode':
      return 'barcode';
    case 'label':
      return 'label';
    default:
      return 'other';
  }
}

export default function FoodReviewScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ editFoodLogId?: string }>();
  const editFoodLogId = params.editFoodLogId ?? null;

  const draft = useFoodDraftStore();
  const start = useFoodDraftStore((s) => s.start);
  const setTitle = useFoodDraftStore((s) => s.setTitle);
  const setMealType = useFoodDraftStore((s) => s.setMealType);
  const setItems = useFoodDraftStore((s) => s.setItems);
  const setStatus = useFoodDraftStore((s) => s.setStatus);
  const setPortionMultiplier = useFoodDraftStore((s) => s.setPortionMultiplier);
  const setSaveAsFavorite = useFoodDraftStore((s) => s.setSaveAsFavorite);

  const { log: existingLog, isLoading: existingLoading } =
    useFoodLogById(editFoodLogId);

  const saveDraft = useSaveFoodDraft();
  const [isSaving, setIsSaving] = useState(false);
  const saveButtonRef = useRef<View>(null);

  // Load an existing food_log into the draft once (edit flow from the dashboard). Guarded via
  // the (Zustand, not React) draft store's own id rather than a React state setter, so no
  // React setState is called from inside this effect.
  useEffect(() => {
    if (!editFoodLogId || !existingLog) return;
    if (useFoodDraftStore.getState().id === editFoodLogId) return;
    start({ date: existingLog.date, source: existingLog.source as never });
    useFoodDraftStore.setState({
      id: existingLog.id,
      title: existingLog.title ?? '',
      mealType: existingLog.meal_type as MealType,
      imagePath: existingLog.image_path,
      aiConfidence: existingLog.ai_confidence,
      aiRaw: existingLog.ai_raw,
      loggedAt: existingLog.logged_at,
      items: existingLog.items.map((item) => ({
        id: item.id,
        name: item.name,
        grams: item.grams ?? 0,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
        barcode: item.barcode,
      })),
      status: 'ready',
      portionMultiplier: 1,
    });
  }, [editFoodLogId, existingLog, start]);

  // Haptics for the analysis outcome (only for a fresh analysis, not the edit flow).
  const previousStatus = useRef(draft.status);
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = draft.status;
    if (editFoodLogId || before !== 'analyzing') return;
    if (draft.status === 'ready') haptic.aiDone();
    else if (draft.status === 'error') haptic.aiFail();
  }, [draft.status, editFoodLogId]);

  const isAnalyzing = draft.status === 'analyzing' && !editFoodLogId;
  const multiplier = draft.portionMultiplier;
  // Rows show (and save) the portion-scaled values; edits are divided back into base values.
  const scaledItems = scaleFoodItems(draft.items, multiplier);
  const totals = sumFoodItems(scaledItems);
  const isAiSource = draft.source === 'photo' || draft.source === 'text';
  const lowConfidence = draft.aiConfidence != null && draft.aiConfidence < 0.6;
  const showEstimateNote =
    draft.status === 'ready' && !editFoodLogId && (lowConfidence || isAiSource);

  const enterManually = () => {
    setItems([
      {
        id: Crypto.randomUUID(),
        name: '',
        grams: 100,
        kcal: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
    ]);
    setStatus('ready');
  };

  const stepPortion = (direction: 1 | -1) => {
    haptic.select();
    setPortionMultiplier(
      clampPortionMultiplier(
        Math.round((multiplier + direction * PORTION_STEP) * 100) / 100,
      ),
    );
  };

  const handleSave = () => {
    if (draft.items.length === 0) {
      Alert.alert(t('food.review.noItemsTitle'), t('food.review.noItemsBody'));
      return;
    }
    setIsSaving(true);
    // Start point of the "+kcal" flight on Today: the centre of the save button.
    let from: { x: number; y: number } | undefined;
    saveButtonRef.current?.measureInWindow((x, y, w, h) => {
      from = { x: x + w / 2, y: y + h / 2 };
    });
    saveDraft.mutate(
      {
        id: draft.id,
        date: draft.date,
        loggedAt: draft.loggedAt,
        mealType: draft.mealType,
        title: draft.title,
        source: draft.source,
        imagePath: draft.imagePath,
        aiConfidence: draft.aiConfidence,
        aiRaw: draft.aiRaw as never,
        items: scaledItems,
        saveAsFavorite: draft.saveAsFavorite,
        isEdit: !!editFoodLogId,
      },
      {
        onSuccess: () => {
          haptic.mealSaved();
          if (!editFoodLogId) {
            useMealFlightBridge.getState().queue(totals.kcal, from);
          }
          useFoodDraftStore.getState().reset();
          router.dismissAll();
        },
        onError: (error) => {
          setIsSaving(false);
          Alert.alert(
            t('food.review.saveErrorTitle'),
            (error as Error).message,
          );
        },
      },
    );
  };

  const title = t('food.review.title');

  if (editFoodLogId && existingLoading && draft.id !== editFoodLogId) {
    return (
      <SheetScreen title={title}>
        <AnalysisProgress kind="other" size={96} />
      </SheetScreen>
    );
  }

  if (isAnalyzing) {
    return (
      <SheetScreen title={title}>
        <AnalysisProgress kind={analysisKind(draft.source)} />
      </SheetScreen>
    );
  }

  if (draft.status === 'error') {
    const limit = draft.errorKind === 'ai_limit_reached';
    return (
      <SheetScreen title={title}>
        <View className="items-center gap-4 pt-4">
          <Illustration name="error" size={160} />
          <Text
            accessibilityRole="header"
            className="text-label text-center font-display-bold text-[20px]"
            maxFontSizeMultiplier={1.3}
          >
            {limit
              ? t('food.paywall.title')
              : t('food.logFood.analyzeErrorTitle')}
          </Text>
          <Text className="text-label-secondary text-center text-base">
            {limit
              ? t('food.review.limitReachedBody')
              : t('food.logFood.analyzeErrorBody')}
          </Text>
          {draft.errorCode && !limit && (
            <Text
              selectable
              className="text-label-tertiary text-center text-xs"
            >
              {t('food.review.errorCode', { code: draft.errorCode })}
            </Text>
          )}
        </View>
        {limit && (
          <GlassActionButton
            label={t('food.review.getPremium')}
            symbol="sparkles"
            onPress={() => router.push('/paywall')}
          />
        )}
        <Pressable
          onPress={enterManually}
          className="bg-surface-raised h-14 items-center justify-center rounded-full"
          accessibilityRole="button"
        >
          <Text className="text-tint text-base font-semibold">
            {t('food.logFood.enterManually')}
          </Text>
        </Pressable>
      </SheetScreen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-bg flex-1"
    >
      <SheetScreen title={title}>
        <Reveal once="food-review-hero">
          <Card variant="tinted" className="gap-3">
            <Text
              className="text-label-secondary text-[13px] font-medium"
              maxFontSizeMultiplier={1.3}
            >
              {t('food.review.totals')}
            </Text>
            <View className="flex-row items-end gap-2">
              <RollingNumber
                value={Math.round(totals.kcal)}
                fontSize={40}
                accessibilityLabel={`${Math.round(totals.kcal)} ${t('food.dashboard.kcalUnit')}`}
              />
              <Text
                className="text-label-secondary pb-1.5 text-[15px] font-medium"
                maxFontSizeMultiplier={1.3}
              >
                {t('food.dashboard.kcalUnit')}
              </Text>
            </View>
            <MacroLine
              proteinG={totals.proteinG}
              carbsG={totals.carbsG}
              fatG={totals.fatG}
            />
          </Card>
        </Reveal>

        <FieldInput
          value={draft.title}
          onChangeText={setTitle}
          placeholder={t('food.review.titlePlaceholder')}
          accessibilityLabel={t('food.review.titlePlaceholder')}
          display
        />

        {showEstimateNote && (
          <View className="flex-row items-start gap-2 px-1">
            <SymbolView
              name="sparkles"
              size={16}
              tintColor={themeColor('labelSecondary')}
            />
            <Text className="text-label-secondary flex-1 text-sm">
              {lowConfidence
                ? t('food.review.lowConfidenceNote')
                : t('identity.ai.estimate')}
            </Text>
          </View>
        )}

        {draft.clarification && (
          <View className="flex-row items-start gap-2 px-1">
            <SymbolView
              name="questionmark.circle"
              size={16}
              tintColor={themeColor('labelSecondary')}
            />
            <Text className="text-label-secondary flex-1 text-sm">
              {draft.clarification}
            </Text>
          </View>
        )}

        <View className="gap-2">
          <SectionHeader title={t('food.review.mealCategory')} />
          <View className="flex-row flex-wrap gap-2">
            {MEAL_TYPES.map((mt) => (
              <Chip
                key={mt}
                label={t(`food.mealType.${mt}`)}
                selected={draft.mealType === mt}
                onPress={() => {
                  haptic.select();
                  setMealType(mt);
                }}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <SectionHeader title={t('food.review.portion')} />
          <Card className="gap-4">
            <View className="flex-row items-center justify-between">
              <StepButton
                symbol="minus"
                label={t('food.review.portionMinus')}
                disabled={multiplier <= 0.25}
                onPress={() => stepPortion(-1)}
              />
              <Text
                className="text-label font-display-bold"
                style={{ fontSize: 28, fontVariant: ['tabular-nums'] }}
                accessibilityLabel={`${t('food.review.portion')} ${multiplier.toFixed(2)}×`}
                maxFontSizeMultiplier={1.2}
              >
                {multiplier.toFixed(2)}×
              </Text>
              <StepButton
                symbol="plus"
                label={t('food.review.portionPlus')}
                disabled={multiplier >= 3}
                onPress={() => stepPortion(1)}
              />
            </View>
            <View className="flex-row flex-wrap gap-2">
              {PORTION_PRESETS.map((preset) => (
                <Chip
                  key={preset}
                  label={preset === 0.5 ? '½' : `${preset}×`}
                  selected={Math.abs(multiplier - preset) < 0.001}
                  onPress={() => {
                    haptic.select();
                    setPortionMultiplier(preset);
                  }}
                />
              ))}
            </View>
          </Card>
        </View>

        <View className="gap-2">
          <SectionHeader title={t('food.review.ingredients')} />
          <IngredientList items={scaledItems} multiplier={multiplier} />
        </View>

        <Card className="flex-row items-center justify-between">
          <Text className="text-label text-base">
            {t('food.review.saveAsFavorite')}
          </Text>
          <Switch
            value={draft.saveAsFavorite}
            onValueChange={(v) => {
              haptic.toggle();
              setSaveAsFavorite(v);
            }}
            trackColor={{ true: themeColor('accent') }}
          />
        </Card>

        <View ref={saveButtonRef} collapsable={false}>
          <GlassActionButton
            label={t('food.review.saveWithKcal', {
              kcal: Math.round(totals.kcal),
            })}
            symbol="checkmark"
            disabled={isSaving}
            onPress={handleSave}
          />
        </View>
      </SheetScreen>
    </KeyboardAvoidingView>
  );
}

function StepButton({
  symbol,
  label,
  disabled,
  onPress,
}: {
  symbol: 'plus' | 'minus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      className="bg-surface-raised h-11 w-11 items-center justify-center rounded-full"
      style={{ opacity: disabled ? 0.4 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SymbolView name={symbol} size={18} tintColor={themeColor('label')} />
    </Pressable>
  );
}
