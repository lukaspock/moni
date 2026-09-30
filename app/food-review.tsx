import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Host, Picker, Slider, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { themeColor } from '@/theme/colors';

import type { MealType } from '@/domain';
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
  type DraftFoodItem,
} from '@/features/food';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

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
  const addItem = useFoodDraftStore((s) => s.addItem);
  const updateItem = useFoodDraftStore((s) => s.updateItem);
  const removeItem = useFoodDraftStore((s) => s.removeItem);
  const scaleItemGrams = useFoodDraftStore((s) => s.scaleItemGrams);
  const setPortionMultiplier = useFoodDraftStore((s) => s.setPortionMultiplier);
  const setSaveAsFavorite = useFoodDraftStore((s) => s.setSaveAsFavorite);

  const { log: existingLog, isLoading: existingLoading } =
    useFoodLogById(editFoodLogId);

  const saveDraft = useSaveFoodDraft();
  const [isSaving, setIsSaving] = useState(false);

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

  const isAnalyzing = draft.status === 'analyzing' && !editFoodLogId;
  const multiplier = draft.portionMultiplier;
  // Rows show (and save) the portion-scaled values; edits are divided back into base values.
  const scaledItems = scaleFoodItems(draft.items, multiplier);
  const totals = sumFoodItems(scaledItems);
  const showConfidenceNote =
    draft.aiConfidence != null &&
    draft.aiConfidence < 0.6 &&
    draft.status === 'ready';

  const handleClose = () => router.back();

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

  const handleSave = () => {
    if (draft.items.length === 0) {
      Alert.alert(t('food.review.noItemsTitle'), t('food.review.noItemsBody'));
      return;
    }
    setIsSaving(true);
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
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
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

  if (editFoodLogId && existingLoading && draft.id !== editFoodLogId) {
    return (
      <View className="bg-system-background flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('food.review.title'),
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={handleClose}>
              <Text className="text-tint text-base">
                {t('food.logFood.cancel')}
              </Text>
            </Pressable>
          ),
          headerRight: () =>
            isSaving ? (
              <ActivityIndicator />
            ) : (
              <Pressable onPress={handleSave} disabled={isAnalyzing}>
                <Text
                  className="text-tint text-base font-semibold"
                  style={{ opacity: isAnalyzing ? 0.4 : 1 }}
                >
                  {t('food.review.save')}
                </Text>
              </Pressable>
            ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="bg-system-background flex-1"
      >
        {isAnalyzing ? (
          <View className="flex-1 items-center justify-center gap-4">
            <ActivityIndicator size="large" />
            <Text className="text-secondary-label text-base">
              {t('food.review.analyzing')}
            </Text>
          </View>
        ) : draft.status === 'error' ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <SymbolView name="exclamationmark.triangle" size={32} />
            <Text className="text-label text-center text-base">
              {draft.errorKind === 'ai_limit_reached'
                ? t('food.review.limitReachedBody')
                : t('food.logFood.analyzeErrorBody')}
            </Text>
            {draft.errorKind === 'ai_limit_reached' && (
              <Pressable
                onPress={() => router.push('/paywall')}
                className="bg-tint w-full items-center rounded-xl py-3.5"
              >
                <Text className="text-base font-semibold text-white">
                  {t('food.review.getPremium')}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={enterManually}
              className="bg-secondary-system-background w-full items-center rounded-xl py-3.5"
            >
              <Text className="text-label text-base font-medium">
                {t('food.logFood.enterManually')}
              </Text>
            </Pressable>
            <Pressable onPress={handleClose}>
              <Text className="text-tint text-base">
                {t('food.logFood.cancel')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 p-4 pb-16"
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              value={draft.title}
              onChangeText={setTitle}
              placeholder={t('food.review.titlePlaceholder')}
              placeholderTextColor="rgba(120,120,128,0.6)"
              className="text-label text-2xl font-bold"
            />

            {showConfidenceNote && (
              <View className="bg-secondary-system-background flex-row items-start gap-2 rounded-xl p-3">
                <SymbolView name="exclamationmark.circle" size={16} />
                <Text className="text-secondary-label flex-1 text-sm">
                  {t('food.review.lowConfidenceNote')}
                </Text>
              </View>
            )}

            {draft.clarification && (
              <View className="bg-secondary-system-background flex-row items-start gap-2 rounded-xl p-3">
                <SymbolView name="questionmark.circle" size={16} />
                <Text className="text-secondary-label flex-1 text-sm">
                  {draft.clarification}
                </Text>
              </View>
            )}

            <View className="gap-2">
              <Text className="text-secondary-label text-sm font-semibold">
                {t('food.review.mealCategory')}
              </Text>
              <Host matchContents style={{ width: '100%' }}>
                <Picker
                  selection={draft.mealType}
                  onSelectionChange={(value) => setMealType(value as MealType)}
                  modifiers={[pickerStyle('segmented')]}
                >
                  {MEAL_TYPES.map((mt) => (
                    <SwiftUIText key={mt} modifiers={[tag(mt)]}>
                      {t(`food.mealType.${mt}`)}
                    </SwiftUIText>
                  ))}
                </Picker>
              </Host>
            </View>

            <View className="gap-2">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-secondary-label text-sm font-semibold">
                  {t('food.review.portion')}
                </Text>
                <Text className="text-secondary-label text-sm">
                  {multiplier.toFixed(2)}×
                </Text>
              </View>
              <View className="flex-row gap-2">
                {PORTION_PRESETS.map((preset) => {
                  const selected = Math.abs(multiplier - preset) < 0.001;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setPortionMultiplier(preset);
                      }}
                      className={`flex-1 items-center rounded-xl py-2.5 ${selected ? 'bg-tint' : 'bg-secondary-system-background'}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        className={`text-base font-semibold ${selected ? 'text-white' : 'text-label'}`}
                      >
                        {preset === 0.5 ? '½' : `${preset}×`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Host matchContents style={{ width: '100%' }}>
                <Slider
                  value={multiplier}
                  min={0.25}
                  max={3}
                  step={0.05}
                  onValueChange={(v) =>
                    setPortionMultiplier(clampPortionMultiplier(v))
                  }
                />
              </Host>
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-secondary-label text-sm font-semibold">
                  {t('food.review.ingredients')}
                </Text>
                <Pressable
                  onPress={() =>
                    addItem({
                      name: '',
                      grams: 100,
                      kcal: 0,
                      proteinG: 0,
                      carbsG: 0,
                      fatG: 0,
                    })
                  }
                  className="flex-row items-center gap-1"
                >
                  <SymbolView name="plus.circle.fill" size={18} />
                  <Text className="text-tint text-sm font-medium">
                    {t('food.review.addItem')}
                  </Text>
                </Pressable>
              </View>

              {scaledItems.map((item) => (
                <IngredientRow
                  key={item.id}
                  item={item}
                  onChangeName={(name) => updateItem(item.id, { name })}
                  onChangeGrams={(grams) =>
                    scaleItemGrams(item.id, grams / multiplier)
                  }
                  onChangeField={(field, value) =>
                    updateItem(item.id, { [field]: value / multiplier })
                  }
                  onDelete={() => removeItem(item.id)}
                />
              ))}
              {draft.items.length === 0 && (
                <Text className="text-secondary-label py-4 text-center text-sm">
                  {t('food.review.noItems')}
                </Text>
              )}
            </View>

            <View className="bg-secondary-system-background gap-2 rounded-2xl p-4">
              <Text className="text-secondary-label text-sm font-semibold">
                {t('food.review.totals')}
              </Text>
              <Text className="text-label text-base">
                {Math.round(totals.kcal)} kcal · P {Math.round(totals.proteinG)}
                g · C {Math.round(totals.carbsG)}g · F {Math.round(totals.fatG)}
                g
              </Text>
            </View>

            <View className="bg-secondary-system-background flex-row items-center justify-between rounded-2xl p-4">
              <Text className="text-label text-base">
                {t('food.review.saveAsFavorite')}
              </Text>
              <Switch
                value={draft.saveAsFavorite}
                onValueChange={setSaveAsFavorite}
                trackColor={{ true: themeColor('accent') }}
              />
            </View>
          </ScrollView>
        )}
        {!isAnalyzing && draft.status === 'ready' && (
          <View className="border-separator bg-system-background border-t px-4 pb-8 pt-3">
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="bg-tint flex-row items-center justify-center gap-2 rounded-2xl py-4"
              style={{ opacity: isSaving ? 0.6 : 1 }}
              accessibilityRole="button"
            >
              <Text className="text-base font-semibold text-white">
                {t('food.review.saveWithKcal', {
                  kcal: Math.round(totals.kcal),
                })}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function IngredientRow({
  item,
  onChangeName,
  onChangeGrams,
  onChangeField,
  onDelete,
}: {
  item: DraftFoodItem;
  onChangeName: (name: string) => void;
  onChangeGrams: (grams: number) => void;
  onChangeField: (
    field: 'kcal' | 'proteinG' | 'carbsG' | 'fatG',
    value: number,
  ) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="bg-secondary-system-background gap-2 rounded-2xl p-3">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={item.name}
          onChangeText={onChangeName}
          placeholder={t('food.review.ingredientNamePlaceholder')}
          placeholderTextColor="rgba(120,120,128,0.6)"
          className="text-label flex-1 text-base font-medium"
        />
        <Pressable onPress={onDelete} hitSlop={8}>
          <SymbolView
            name="minus.circle.fill"
            size={20}
            tintColor={themeColor('danger')}
          />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <NumberField
          label={t('food.review.grams')}
          value={item.grams}
          onChange={onChangeGrams}
        />
        <NumberField
          label="kcal"
          value={item.kcal}
          onChange={(v) => onChangeField('kcal', v)}
        />
        <NumberField
          label="P"
          value={item.proteinG}
          onChange={(v) => onChangeField('proteinG', v)}
        />
        <NumberField
          label="C"
          value={item.carbsG}
          onChange={(v) => onChangeField('carbsG', v)}
        />
        <NumberField
          label="F"
          value={item.fatG}
          onChange={(v) => onChangeField('fatG', v)}
        />
      </View>
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const rounded = Math.round(value * 10) / 10;
  // Remounts (via `key`) whenever the value changes from outside (e.g. the portion slider or
  // grams-triggered auto-scale) so the field picks up the new number, while the user's own
  // in-progress typing (which doesn't change `value` until `onEndEditing`) is left alone —
  // avoids syncing local state from a prop inside an effect.
  return (
    <NumberFieldInput
      key={rounded}
      label={label}
      initialValue={rounded}
      onChange={onChange}
    />
  );
}

function NumberFieldInput({
  label,
  initialValue,
  onChange,
}: {
  label: string;
  initialValue: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(initialValue));

  return (
    <View className="min-w-[60px] gap-0.5">
      <Text className="text-secondary-label text-xs">{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => onChange(Number(text) || 0)}
        keyboardType="decimal-pad"
        className="bg-system-background text-label rounded-lg px-2 py-1.5 text-sm"
      />
    </View>
  );
}
