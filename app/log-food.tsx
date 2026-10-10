import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { resolveLogDate, type FoodSource } from '@/domain';
import {
  favoriteToItems,
  isRecipeFavorite,
  logToItems,
  useFoodAnalysis,
  useFoodDraftStore,
  useLogRecipe,
  useMealFlightBridge,
  useQuickLogEntries,
  useQuickLogMeal,
  useRecipes,
  type AnalysisFailure,
  type QuickLogEntry,
  type Recipe,
} from '@/features/food';
import { FieldInput } from '@/features/food/ui/FieldInput';
import { RecipeQuickList } from '@/features/food/ui/RecipeQuickList';
import { openFoodCamera } from '@/features/today/useQuickCapture';
import { BrandIcon } from '@/components/brand';
import { PressableScale, SkeletonBlock } from '@/components/motion';
import { Card, ListRow, SectionHeader, SheetScreen } from '@/components/ui';
import { toISODate } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { themeColor, useThemeHex } from '@/theme/colors';

export default function LogFoodScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  // Day being viewed on the Today tab (route param `date`, YYYY-MM-DD); default/invalid = today.
  const logDate = resolveLogDate(params.date, toISODate());
  const accent = useThemeHex('accent');
  const label = useThemeHex('label');
  const start = useFoodDraftStore((s) => s.start);
  const setStatus = useFoodDraftStore((s) => s.setStatus);
  const setItems = useFoodDraftStore((s) => s.setItems);
  const setTitle = useFoodDraftStore((s) => s.setTitle);

  const { analyzeText, analyzePhoto } = useFoodAnalysis();
  const { favorites, recents, suggestedMealType, isLoading } =
    useQuickLogEntries();
  const quickLog = useQuickLogMeal();
  const { recipes } = useRecipes();
  const logRecipe = useLogRecipe();

  const [description, setDescription] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [loggedKey, setLoggedKey] = useState<string | null>(null);
  const [loggedRecipeId, setLoggedRecipeId] = useState<string | null>(null);

  // Optional `meal` param (Today's per-meal plus): pre-selects the meal type of the new draft.
  const presetMeal = (['breakfast', 'lunch', 'dinner', 'snack'] as const).find(
    (m) => m === params.meal,
  );
  const openDraft = (source: FoodSource) => {
    start({ date: logDate, source });
    if (presetMeal) useFoodDraftStore.getState().setMealType(presetMeal);
  };
  const goToReview = () => router.push('/food-review');

  const finishAnalysis = (failure: AnalysisFailure | null) => {
    // Success is applied to the draft by the analysis hook; only failures need handling here.
    if (failure)
      setStatus(
        'error',
        failure === 'ai_limit_reached' ? 'ai_limit_reached' : 'generic',
      );
  };

  const submitDescription = () => {
    const text = description.trim();
    if (!text) return;
    setDescription('');
    haptic.aiStart();
    openDraft('text');
    setStatus('analyzing');
    goToReview();
    void analyzeText(text).then(finishAnalysis);
  };

  // The camera goes through the møni camera (`/food-camera`); this is the library path.
  const pickFromLibrary = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('food.logFood.permissionDeniedTitle'),
          t('food.logFood.permissionDeniedBody'),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      haptic.aiStart();
      openDraft('photo');
      setStatus('analyzing');
      goToReview();
      void analyzePhoto(result.assets[0].uri).then(finishAnalysis);
    } finally {
      setIsBusy(false);
    }
  };

  const openReviewWith = (entry: QuickLogEntry) => {
    openDraft('favorite');
    setTitle(entry.title);
    setItems(
      entry.favorite
        ? favoriteToItems(entry.favorite)
        : entry.log
          ? logToItems(entry.log)
          : [],
    );
    setStatus('ready');
    goToReview();
  };

  const logInstantly = (entry: QuickLogEntry) => {
    if (quickLog.isPending) return;
    quickLog.mutate(
      { entry, date: logDate },
      {
        onSuccess: () => {
          setLoggedKey(entry.key);
          haptic.mealQuickSaved();
          useMealFlightBridge.getState().queue(entry.kcal);
          setTimeout(() => router.back(), 450);
        },
        onError: () =>
          Alert.alert(
            t('food.review.saveErrorTitle'),
            t('food.logFood.quickLogError'),
          ),
      },
    );
  };

  const logRecipeNow = (recipe: Recipe, portions: number, kcal: number) => {
    if (logRecipe.isPending) return;
    logRecipe.mutate(
      { recipe, portions, date: logDate, mealType: presetMeal },
      {
        onSuccess: () => {
          setLoggedRecipeId(recipe.id);
          haptic.mealQuickSaved();
          useMealFlightBridge.getState().queue(kcal);
          setTimeout(() => router.back(), 450);
        },
        onError: () =>
          Alert.alert(
            t('food.review.saveErrorTitle'),
            t('food.recipe.logError'),
          ),
      },
    );
  };

  const manualEntry = () => {
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

  // Max. 3 quick-log rows: favorites first, recents fill the rest.
  // Recipes (own dishes) have their own section below and are not listed as regulars.
  const quickFavorites = favorites
    .filter((e) => !e.favorite || !isRecipeFavorite(e.favorite))
    .slice(0, 3);
  const favoriteKeys = new Set(quickFavorites.map((e) => e.key));
  const quickRecents = recents
    .filter((e) => !favoriteKeys.has(e.key))
    .slice(0, 3 - quickFavorites.length);
  const hasQuickEntries = quickFavorites.length > 0 || quickRecents.length > 0;

  return (
    <SheetScreen title={t('food.logFood.title')}>
      <View className="gap-3">
        <PressableScale
          onPress={() => openFoodCamera(logDate, presetMeal)}
          accessibilityRole="button"
          accessibilityLabel={t('food.logFood.takePhoto')}
        >
          <View
            className="bg-tint-soft flex-row items-center gap-4 p-5"
            style={{
              borderRadius: 24,
              borderCurve: 'continuous',
            }}
          >
            <BrandIcon name="photoMeal" size={40} color={accent} />
            <View className="flex-1 gap-0.5">
              <Text
                className="text-label font-display-bold text-[20px]"
                maxFontSizeMultiplier={1.3}
              >
                {t('food.logFood.photo')}
              </Text>
              <Text className="text-label-secondary text-sm">
                {t('food.logFood.photoHint')}
              </Text>
            </View>
          </View>
        </PressableScale>

        <View className="flex-row gap-3">
          <InputCard
            icon={
              <SymbolView
                name="barcode.viewfinder"
                size={30}
                tintColor={themeColor('accent')}
              />
            }
            title={t('food.logFood.barcode')}
            onPress={() =>
              router.push({
                pathname: '/barcode-scanner',
                params: { date: logDate },
              })
            }
          />
          <InputCard
            icon={<BrandIcon name="scanLabel" size={30} color={accent} />}
            title={t('food.logFood.label')}
            onPress={() =>
              router.push({
                pathname: '/barcode-scanner',
                params: { mode: 'label', date: logDate },
              })
            }
          />
        </View>
      </View>

      <FieldInput
        value={description}
        onChangeText={setDescription}
        placeholder={t('food.logFood.describePlaceholder')}
        accessibilityLabel={t('food.logFood.describe')}
        returnKeyType="send"
        onSubmitEditing={submitDescription}
        trailing={
          description.trim() ? (
            <Pressable
              onPress={submitDescription}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('food.logFood.analyze')}
            >
              <SymbolView
                name="arrow.up.circle.fill"
                size={32}
                tintColor={themeColor('accent')}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void pickFromLibrary()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('food.logFood.chooseFromLibrary')}
            >
              <SymbolView
                name="photo.on.rectangle"
                size={22}
                tintColor={themeColor('labelSecondary')}
              />
            </Pressable>
          )
        }
      />

      {isLoading && !hasQuickEntries ? (
        <SkeletonBlock width="100%" height={60} radius={24} />
      ) : hasQuickEntries ? (
        <View className="gap-5">
          {quickFavorites.length > 0 && (
            <QuickSection
              title={t('food.logFood.favorites')}
              entries={quickFavorites}
              loggedKey={loggedKey}
              onLog={logInstantly}
              onOpen={openReviewWith}
              subtitle={(e) => `${Math.round(e.kcal)} kcal`}
            />
          )}
          {quickRecents.length > 0 && (
            <QuickSection
              title={t('food.logFood.quickLogAs', {
                meal: t(`food.mealType.${suggestedMealType}`),
              })}
              entries={quickRecents}
              loggedKey={loggedKey}
              onLog={logInstantly}
              onOpen={openReviewWith}
              subtitle={(e) =>
                e.count > 1
                  ? t('food.logFood.loggedTimes', {
                      count: e.count,
                      kcal: Math.round(e.kcal),
                    })
                  : `${Math.round(e.kcal)} kcal`
              }
            />
          )}
        </View>
      ) : (
        <Text className="text-label-secondary px-2 text-center text-sm">
          {t('food.logFood.noFavoritesYet')}
        </Text>
      )}

      <RecipeQuickList
        recipes={recipes}
        loggedId={loggedRecipeId}
        disabled={logRecipe.isPending}
        onLog={logRecipeNow}
        onEdit={(recipe) =>
          router.push({ pathname: '/recipe-editor', params: { id: recipe.id } })
        }
        onCreate={() => router.push('/recipe-editor')}
      />

      <Card className="gap-0 overflow-hidden p-0">
        <ListRow
          title={t('food.logFood.manual')}
          subtitle={t('food.logFood.manualHint')}
          leading={
            <SymbolView name="square.and.pencil" size={22} tintColor={label} />
          }
          onPress={manualEntry}
        />
      </Card>
    </SheetScreen>
  );
}

function InputCard({
  icon,
  title,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-1">
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View
          className="bg-surface items-start gap-3 p-4"
          style={{ borderRadius: 24, borderCurve: 'continuous' }}
        >
          {icon}
          <Text
            className="text-label text-base font-semibold"
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {title}
          </Text>
        </View>
      </PressableScale>
    </View>
  );
}

function QuickSection({
  title,
  entries,
  loggedKey,
  onLog,
  onOpen,
  subtitle,
}: {
  title: string;
  entries: QuickLogEntry[];
  loggedKey: string | null;
  onLog: (entry: QuickLogEntry) => void;
  onOpen: (entry: QuickLogEntry) => void;
  subtitle: (entry: QuickLogEntry) => string;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <SectionHeader title={title} />
      <Card className="gap-0 overflow-hidden p-0">
        {entries.map((entry, index) => (
          <ListRow
            key={entry.key}
            title={entry.title || t('food.dashboard.untitledMeal')}
            subtitle={subtitle(entry)}
            chevron={false}
            separator={index < entries.length - 1}
            onPress={() => onOpen(entry)}
            trailing={
              <Pressable
                onPress={() => onLog(entry)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  loggedKey === entry.key
                    ? t('food.logFood.logged')
                    : t('food.logFood.logNow')
                }
              >
                <SymbolView
                  name={
                    loggedKey === entry.key
                      ? 'checkmark.circle.fill'
                      : 'plus.circle.fill'
                  }
                  size={32}
                  tintColor={themeColor('accent')}
                />
              </Pressable>
            }
          />
        ))}
      </Card>
    </View>
  );
}
