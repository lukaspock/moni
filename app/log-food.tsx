import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { resolveLogDate, type FoodSource } from '@/domain';
import {
  favoriteToItems,
  logToItems,
  useFoodAnalysis,
  useFoodDraftStore,
  useQuickLogEntries,
  useQuickLogMeal,
  type AnalysisFailure,
  type QuickLogEntry,
} from '@/features/food';
import { Card, SectionHeader, SheetScreen } from '@/components/ui';
import { toISODate } from '@/lib/date';
import { themeColor } from '@/theme/colors';

type SymbolName = Parameters<typeof SymbolView>[0]['name'];

export default function LogFoodScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date?: string }>();
  // Day being viewed on the Today tab (route param `date`, YYYY-MM-DD); default/invalid = today.
  const logDate = resolveLogDate(params.date, toISODate());
  const start = useFoodDraftStore((s) => s.start);
  const setStatus = useFoodDraftStore((s) => s.setStatus);
  const setItems = useFoodDraftStore((s) => s.setItems);
  const setTitle = useFoodDraftStore((s) => s.setTitle);

  const { analyzeText, analyzePhoto } = useFoodAnalysis();
  const { favorites, recents, suggestedMealType, isLoading } =
    useQuickLogEntries();
  const quickLog = useQuickLogMeal();

  const [description, setDescription] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [loggedKey, setLoggedKey] = useState<string | null>(null);

  const openDraft = (source: FoodSource) => start({ date: logDate, source });
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
    openDraft('text');
    setStatus('analyzing');
    goToReview();
    void analyzeText(text).then(finishAnalysis);
  };

  const runPhoto = async (fromCamera: boolean) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('food.logFood.permissionDeniedTitle'),
          t('food.logFood.permissionDeniedBody'),
        );
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.9 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9 });
      if (result.canceled || !result.assets?.[0]) return;
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
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
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
  const quickFavorites = favorites.slice(0, 3);
  const favoriteKeys = new Set(quickFavorites.map((e) => e.key));
  const quickRecents = recents
    .filter((e) => !favoriteKeys.has(e.key))
    .slice(0, 3 - quickFavorites.length);
  const hasQuickEntries = quickFavorites.length > 0 || quickRecents.length > 0;

  return (
    <>
      <SheetScreen title={t('food.logFood.title')}>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => void runPhoto(true)}
            disabled={isBusy}
            className="bg-tint flex-[2] items-center justify-center gap-2 rounded-3xl py-6"
            style={{ opacity: isBusy ? 0.6 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={t('food.logFood.takePhoto')}
          >
            <SymbolView name="camera.fill" size={34} tintColor="white" />
            <Text className="text-base font-semibold text-white">
              {t('food.logFood.photo')}
            </Text>
          </Pressable>
          <View className="flex-1 gap-3">
            <SmallAction
              icon="barcode.viewfinder"
              label={t('food.logFood.barcode')}
              onPress={() => router.push('/barcode-scanner')}
            />
            <SmallAction
              icon="text.viewfinder"
              label={t('food.logFood.label')}
              onPress={() =>
                router.push({
                  pathname: '/barcode-scanner',
                  params: { mode: 'label', date: logDate },
                })
              }
            />
          </View>
        </View>

        <Card className="flex-row items-center gap-2 py-0 pl-4 pr-2">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('food.logFood.describePlaceholder')}
            placeholderTextColor="rgba(120,120,128,0.6)"
            returnKeyType="send"
            onSubmitEditing={submitDescription}
            className="text-label min-h-[48px] flex-1 text-base"
          />
          {description.trim() ? (
            <Pressable
              onPress={submitDescription}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('food.logFood.analyze')}
            >
              <SymbolView
                name="arrow.up.circle.fill"
                size={30}
                tintColor={themeColor('accent')}
              />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void runPhoto(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('food.logFood.chooseFromLibrary')}
            >
              <SymbolView name="photo.on.rectangle" size={22} />
            </Pressable>
          )}
        </Card>

        {isLoading && !hasQuickEntries ? (
          <ActivityIndicator />
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
          <Text className="text-secondary-label px-2 text-center text-sm">
            {t('food.logFood.noFavoritesYet')}
          </Text>
        )}

        <Pressable
          onPress={manualEntry}
          className="bg-secondary-system-background flex-row items-center justify-center gap-2 rounded-2xl py-5"
          accessibilityRole="button"
        >
          <SymbolView
            name="square.and.pencil"
            size={22}
            tintColor={themeColor('accent')}
          />
          <Text className="text-tint text-lg font-semibold">
            {t('food.logFood.manual')}
          </Text>
        </Pressable>
      </SheetScreen>
    </>
  );
}

function SmallAction({
  icon,
  label,
  onPress,
}: {
  icon: SymbolName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-secondary-system-background flex-1 items-center justify-center gap-1 rounded-2xl px-2 py-3"
      accessibilityRole="button"
    >
      <SymbolView name={icon} size={22} tintColor={themeColor('accent')} />
      <Text className="text-label text-xs font-medium" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
      {entries.map((entry) => (
        <Card key={entry.key} className="flex-row items-center gap-0 p-0">
          <Pressable
            onPress={() => onOpen(entry)}
            className="flex-1 gap-0.5 py-3 pl-4"
          >
            <Text
              className="text-label text-base font-medium"
              numberOfLines={1}
            >
              {entry.title || t('food.dashboard.untitledMeal')}
            </Text>
            <Text className="text-secondary-label text-xs">
              {subtitle(entry)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onLog(entry)}
            hitSlop={6}
            className="items-center justify-center self-stretch px-4"
            accessibilityRole="button"
            accessibilityLabel={t('food.logFood.logNow')}
          >
            <SymbolView
              name={
                loggedKey === entry.key
                  ? 'checkmark.circle.fill'
                  : 'plus.circle.fill'
              }
              size={30}
              tintColor={themeColor('accent')}
            />
          </Pressable>
        </Card>
      ))}
    </View>
  );
}
