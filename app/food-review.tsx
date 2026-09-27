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
import * as Haptics from 'expo-haptics';
import { Host, Picker, Slider, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import type { MealType } from '@/domain';
import { sumFoodItems } from '@/domain';
import {
  useFoodDraftStore,
  useFoodLogById,
  useSaveFoodDraft,
  type DraftFoodItem,
} from '@/features/food';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function scaledItem(item: DraftFoodItem, factor: number): DraftFoodItem {
  return {
    ...item,
    kcal: item.kcal * factor,
    proteinG: item.proteinG * factor,
    carbsG: item.carbsG * factor,
    fatG: item.fatG * factor,
  };
}

export default function FoodReviewScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ editFoodLogId?: string }>();
  const editFoodLogId = params.editFoodLogId ?? null;

  const draft = useFoodDraftStore();
  const start = useFoodDraftStore((s) => s.start);
  const setTitle = useFoodDraftStore((s) => s.setTitle);
  const setMealType = useFoodDraftStore((s) => s.setMealType);
  const addItem = useFoodDraftStore((s) => s.addItem);
  const updateItem = useFoodDraftStore((s) => s.updateItem);
  const removeItem = useFoodDraftStore((s) => s.removeItem);
  const scaleItemGrams = useFoodDraftStore((s) => s.scaleItemGrams);
  const setPortionMultiplier = useFoodDraftStore((s) => s.setPortionMultiplier);
  const setSaveAsFavorite = useFoodDraftStore((s) => s.setSaveAsFavorite);

  const { log: existingLog, isLoading: existingLoading } = useFoodLogById(editFoodLogId);

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
  const scaledItems = draft.items.map((item) => scaledItem(item, draft.portionMultiplier));
  const totals = sumFoodItems(scaledItems);
  const showConfidenceNote =
    draft.aiConfidence != null && draft.aiConfidence < 0.6 && draft.status === 'ready';

  const handleClose = () => router.back();

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
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          useFoodDraftStore.getState().reset();
          router.dismissAll();
        },
        onError: (error) => {
          setIsSaving(false);
          Alert.alert(t('food.review.saveErrorTitle'), (error as Error).message);
        },
      },
    );
  };

  if (editFoodLogId && existingLoading && draft.id !== editFoodLogId) {
    return (
      <View className="flex-1 items-center justify-center bg-system-background">
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
              <Text className="text-base text-tint">{t('food.logFood.cancel')}</Text>
            </Pressable>
          ),
          headerRight: () =>
            isSaving ? (
              <ActivityIndicator />
            ) : (
              <Pressable onPress={handleSave} disabled={isAnalyzing}>
                <Text
                  className="text-base font-semibold text-tint"
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
        className="flex-1 bg-system-background"
      >
        {isAnalyzing ? (
          <View className="flex-1 items-center justify-center gap-4">
            <ActivityIndicator size="large" />
            <Text className="text-base text-secondary-label">{t('food.review.analyzing')}</Text>
          </View>
        ) : draft.status === 'error' ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <SymbolView name="exclamationmark.triangle" size={32} />
            <Text className="text-center text-base text-label">{t('food.logFood.analyzeErrorBody')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerClassName="gap-6 p-4 pb-16" keyboardShouldPersistTaps="handled">
            <TextInput
              value={draft.title}
              onChangeText={setTitle}
              placeholder={t('food.review.titlePlaceholder')}
              placeholderTextColor="rgba(120,120,128,0.6)"
              className="text-2xl font-bold text-label"
            />

            {showConfidenceNote && (
              <View className="flex-row items-start gap-2 rounded-xl bg-secondary-system-background p-3">
                <SymbolView name="exclamationmark.circle" size={16} />
                <Text className="flex-1 text-sm text-secondary-label">
                  {t('food.review.lowConfidenceNote')}
                </Text>
              </View>
            )}

            <View className="gap-2">
              <Text className="text-sm font-semibold text-secondary-label">
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
                <Text className="text-sm font-semibold text-secondary-label">
                  {t('food.review.portion')}
                </Text>
                <Text className="text-sm text-secondary-label">
                  {draft.portionMultiplier.toFixed(2)}×
                </Text>
              </View>
              <Host matchContents style={{ width: '100%' }}>
                <Slider
                  value={draft.portionMultiplier}
                  min={0.25}
                  max={3}
                  step={0.05}
                  onValueChange={setPortionMultiplier}
                />
              </Host>
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-secondary-label">
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
                  <Text className="text-sm font-medium text-tint">{t('food.review.addItem')}</Text>
                </Pressable>
              </View>

              {draft.items.map((item) => (
                <IngredientRow
                  key={item.id}
                  item={item}
                  onChangeName={(name) => updateItem(item.id, { name })}
                  onChangeGrams={(grams) => scaleItemGrams(item.id, grams)}
                  onChangeField={(field, value) => updateItem(item.id, { [field]: value })}
                  onDelete={() => removeItem(item.id)}
                />
              ))}
              {draft.items.length === 0 && (
                <Text className="py-4 text-center text-sm text-secondary-label">
                  {t('food.review.noItems')}
                </Text>
              )}
            </View>

            <View className="gap-2 rounded-2xl bg-secondary-system-background p-4">
              <Text className="text-sm font-semibold text-secondary-label">
                {t('food.review.totals')}
              </Text>
              <Text className="text-base text-label">
                {Math.round(totals.kcal)} kcal · P {Math.round(totals.proteinG)}g · C{' '}
                {Math.round(totals.carbsG)}g · F {Math.round(totals.fatG)}g
              </Text>
            </View>

            <View className="flex-row items-center justify-between rounded-2xl bg-secondary-system-background p-4">
              <Text className="text-base text-label">{t('food.review.saveAsFavorite')}</Text>
              <Switch value={draft.saveAsFavorite} onValueChange={setSaveAsFavorite} />
            </View>
          </ScrollView>
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
  onChangeField: (field: 'kcal' | 'proteinG' | 'carbsG' | 'fatG', value: number) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2 rounded-2xl bg-secondary-system-background p-3">
      <View className="flex-row items-center gap-2">
        <TextInput
          value={item.name}
          onChangeText={onChangeName}
          placeholder={t('food.review.ingredientNamePlaceholder')}
          placeholderTextColor="rgba(120,120,128,0.6)"
          className="flex-1 text-base font-medium text-label"
        />
        <Pressable onPress={onDelete} hitSlop={8}>
          <SymbolView name="minus.circle.fill" size={20} tintColor="#FF3B30" />
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <NumberField label={t('food.review.grams')} value={item.grams} onChange={onChangeGrams} />
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
        <NumberField label="F" value={item.fatG} onChange={(v) => onChangeField('fatG', v)} />
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
      <Text className="text-xs text-secondary-label">{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => onChange(Number(text) || 0)}
        keyboardType="decimal-pad"
        className="rounded-lg bg-system-background px-2 py-1.5 text-sm text-label"
      />
    </View>
  );
}
