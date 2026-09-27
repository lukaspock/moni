import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActionSheetIOS,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import type { FavoriteMealRow, FoodLogWithItems } from '@/features/food';
import {
  AnalyzeFoodError,
  useAnalyzeFood,
  useFavoriteMeals,
  useFoodDraftStore,
  uploadFoodImage,
  useRecentFoodLogs,
} from '@/features/food';
import { useSession } from '@/features/auth';
import { addDays, toISODate } from '@/lib/date';
import type { MealType } from '@/domain';
import type { Json } from '@/types/database';

type PanelKind = null | 'describe' | 'favorites';

export default function LogFoodScreen() {
  const { t, i18n } = useTranslation();
  const { userId } = useSession();
  const start = useFoodDraftStore((s) => s.start);
  const applyAiResult = useFoodDraftStore((s) => s.applyAiResult);
  const setStatus = useFoodDraftStore((s) => s.setStatus);
  const setItems = useFoodDraftStore((s) => s.setItems);
  const setTitle = useFoodDraftStore((s) => s.setTitle);
  const setMealType = useFoodDraftStore((s) => s.setMealType);
  const setImagePath = useFoodDraftStore((s) => s.setImagePath);

  const analyzeFood = useAnalyzeFood();
  const { favorites } = useFavoriteMeals();
  const { logs: recentLogs } = useRecentFoodLogs(15);

  const [panel, setPanel] = useState<PanelKind>(null);
  const [description, setDescription] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const openDraft = (source: 'photo' | 'text' | 'barcode' | 'favorite' | 'manual') => {
    start({ date: toISODate(), source });
  };

  const goToReview = () => router.push('/food-review');

  const handleAnalyzeError = (error: unknown) => {
    if (error instanceof AnalyzeFoodError && error.status === 402) {
      setStatus('error', 'ai_limit_reached');
      router.push('/paywall');
      return;
    }
    setStatus('error', 'generic');
    Alert.alert(
      t('food.logFood.analyzeErrorTitle'),
      t('food.logFood.analyzeErrorBody'),
      [
        { text: t('food.logFood.cancel'), style: 'cancel' },
        {
          text: t('food.logFood.enterManually'),
          onPress: () => {
            setItems([]);
            goToReview();
          },
        },
      ],
    );
  };

  const runTextAnalysis = async (text: string) => {
    openDraft('text');
    setStatus('analyzing');
    goToReview();
    try {
      const result = await analyzeFood.mutateAsync({ text, locale: i18n.language });
      applyAiResult({
        title: result.title,
        mealType: (result.meal_guess as MealType | null) ?? null,
        items: result.items.map((item) => ({
          id: Crypto.randomUUID(),
          name: item.name,
          grams: item.grams,
          kcal: item.kcal,
          proteinG: item.protein_g,
          carbsG: item.carbs_g,
          fatG: item.fat_g,
        })),
        confidence: result.confidence,
        aiRaw: result as unknown as Json,
      });
    } catch (error) {
      handleAnalyzeError(error);
    }
  };

  const runPhotoAnalysis = async (localUri: string) => {
    if (!userId) return;
    openDraft('photo');
    // Read the freshly generated id straight from the store: the `draftId` selector's value
    // is still last render's id at this point (the `start()` above updates the store
    // synchronously, but this component hasn't re-rendered yet to pick it up).
    const freshDraftId = useFoodDraftStore.getState().id;
    setStatus('analyzing');
    goToReview();
    try {
      const path = await uploadFoodImage({ userId, foodLogId: freshDraftId, localUri });
      setImagePath(path);
      const result = await analyzeFood.mutateAsync({ imagePath: path, locale: i18n.language });
      applyAiResult({
        title: result.title,
        mealType: (result.meal_guess as MealType | null) ?? null,
        items: result.items.map((item) => ({
          id: Crypto.randomUUID(),
          name: item.name,
          grams: item.grams,
          kcal: item.kcal,
          proteinG: item.protein_g,
          carbsG: item.carbs_g,
          fatG: item.fat_g,
        })),
        confidence: result.confidence,
        aiRaw: result as unknown as Json,
      });
    } catch (error) {
      handleAnalyzeError(error);
    }
  };

  const pickPhoto = async (fromCamera: boolean) => {
    setIsBusy(true);
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('food.logFood.permissionDeniedTitle'), t('food.logFood.permissionDeniedBody'));
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
      if (result.canceled || !result.assets?.[0]) return;
      await runPhotoAnalysis(result.assets[0].uri);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePhotoPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          t('food.logFood.cancel'),
          t('food.logFood.takePhoto'),
          t('food.logFood.chooseFromLibrary'),
        ],
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 1) void pickPhoto(true);
        if (index === 2) void pickPhoto(false);
      },
    );
  };

  const handleDescribeSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed) return;
    setPanel(null);
    void runTextAnalysis(trimmed);
  };

  const handleFavoriteTap = (favorite: FavoriteMealRow) => {
    openDraft('favorite');
    const items =
      (favorite.items as unknown as {
        name: string;
        grams: number;
        kcal: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      }[]) ?? [];
    setTitle(favorite.title);
    setItems(
      items.map((item) => ({
        id: Crypto.randomUUID(),
        name: item.name,
        grams: item.grams,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
      })),
    );
    setStatus('ready');
    goToReview();
  };

  const handleRecentTap = (log: FoodLogWithItems) => {
    openDraft('favorite');
    setTitle(log.title ?? '');
    setMealType(log.meal_type as MealType);
    setItems(
      log.items.map((item) => ({
        id: Crypto.randomUUID(),
        name: item.name,
        grams: item.grams ?? 0,
        kcal: item.kcal,
        proteinG: item.protein_g,
        carbsG: item.carbs_g,
        fatG: item.fat_g,
      })),
    );
    setStatus('ready');
    goToReview();
  };

  const handleManualEntry = () => {
    openDraft('manual');
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
    goToReview();
  };

  const yesterdayLabel = useMemo(() => addDays(toISODate(), -1), []);

  return (
    <>
      <Stack.Screen options={{ title: t('food.logFood.title'), headerShown: false }} />
      <ScrollView className="flex-1 bg-system-background" contentContainerClassName="gap-6 p-5 pt-6">
        <Text className="text-center text-lg font-semibold text-label">
          {t('food.logFood.title')}
        </Text>

        <View className="gap-3">
          <OptionRow
            icon="camera.fill"
            label={t('food.logFood.photo')}
            onPress={handlePhotoPress}
            disabled={isBusy}
          />
          <OptionRow
            icon="pencil"
            label={t('food.logFood.describe')}
            onPress={() => setPanel(panel === 'describe' ? null : 'describe')}
            active={panel === 'describe'}
          />
          {panel === 'describe' && (
            <View className="gap-2 rounded-2xl bg-secondary-system-background p-3">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('food.logFood.describePlaceholder')}
                placeholderTextColor="rgba(120,120,128,0.6)"
                multiline
                className="min-h-[70px] text-base text-label"
                autoFocus
              />
              <Pressable
                onPress={handleDescribeSubmit}
                disabled={!description.trim()}
                className="items-center rounded-xl bg-tint py-2.5"
                style={{ opacity: description.trim() ? 1 : 0.4 }}
              >
                <Text className="text-base font-semibold text-white">
                  {t('food.logFood.analyze')}
                </Text>
              </Pressable>
            </View>
          )}

          <OptionRow
            icon="barcode.viewfinder"
            label={t('food.logFood.barcode')}
            onPress={() => router.push('/barcode-scanner')}
          />
          <OptionRow
            icon="star.fill"
            label={t('food.logFood.favoritesRecent')}
            onPress={() => setPanel(panel === 'favorites' ? null : 'favorites')}
            active={panel === 'favorites'}
          />
          {panel === 'favorites' && (
            <View className="gap-4 rounded-2xl bg-secondary-system-background p-3">
              {favorites.length > 0 && (
                <View className="gap-2">
                  <Text className="px-1 text-xs font-semibold uppercase text-secondary-label">
                    {t('food.logFood.favorites')}
                  </Text>
                  {favorites.map((fav) => (
                    <Pressable
                      key={fav.id}
                      onPress={() => handleFavoriteTap(fav)}
                      className="flex-row items-center justify-between rounded-xl bg-system-background px-3 py-2.5"
                    >
                      <Text className="flex-1 text-base text-label" numberOfLines={1}>
                        {fav.title}
                      </Text>
                      <SymbolView name="chevron.right" size={14} />
                    </Pressable>
                  ))}
                </View>
              )}
              {recentLogs.length > 0 && (
                <View className="gap-2">
                  <Text className="px-1 text-xs font-semibold uppercase text-secondary-label">
                    {t('food.logFood.recent')}
                  </Text>
                  {recentLogs.slice(0, 8).map((log) => (
                    <Pressable
                      key={log.id}
                      onPress={() => handleRecentTap(log)}
                      className="flex-row items-center justify-between rounded-xl bg-system-background px-3 py-2.5"
                    >
                      <Text className="flex-1 text-base text-label" numberOfLines={1}>
                        {log.title || t('food.dashboard.untitledMeal')}
                        {log.date === yesterdayLabel ? ` · ${t('food.logFood.yesterday')}` : ''}
                      </Text>
                      <Text className="text-sm text-secondary-label">{Math.round(log.kcal)} kcal</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {favorites.length === 0 && recentLogs.length === 0 && (
                <Text className="p-2 text-center text-sm text-secondary-label">
                  {t('food.logFood.noFavoritesYet')}
                </Text>
              )}
            </View>
          )}

          <OptionRow icon="square.and.pencil" label={t('food.logFood.manual')} onPress={handleManualEntry} />

          <OptionRow
            icon="mic.fill"
            label={t('food.logFood.voice')}
            onPress={() => {}}
            disabled
            trailingLabel={t('food.logFood.comingSoon')}
          />
        </View>

        <Pressable onPress={() => router.back()} className="items-center py-3">
          <Text className="text-base font-medium text-tint">{t('food.logFood.cancel')}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function OptionRow({
  icon,
  label,
  onPress,
  disabled,
  active,
  trailingLabel,
}: {
  icon: Parameters<typeof SymbolView>[0]['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  trailingLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-3 rounded-2xl bg-secondary-system-background px-4 py-4"
      style={{ opacity: disabled ? 0.4 : 1, borderWidth: active ? 1 : 0 }}
    >
      <SymbolView name={icon} size={22} />
      <Text className="flex-1 text-base font-medium text-label">{label}</Text>
      {trailingLabel && <Text className="text-sm text-secondary-label">{trailingLabel}</Text>}
      {!disabled && !trailingLabel && <SymbolView name="chevron.right" size={14} />}
    </Pressable>
  );
}
