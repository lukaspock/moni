import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import {
  MealFlight,
  Reveal,
  SkeletonBlock,
  useMealFlight,
} from '@/components/motion';
import { Card, ScreenTitle, SectionHeader } from '@/components/ui';
import type { MealType } from '@/domain';
import {
  useDeleteFoodLog,
  useFoodLogsForDate,
  useFoodTotals,
  useQuickLogEntries,
  useQuickLogMeal,
  type QuickLogEntry,
} from '@/features/food';
import { invalidateLedger } from '@/features/rhythm';
import { useMealFlightBridge } from '@/features/food';
import { useDailyTargets } from '@/features/targets';
import { AchievementOverlay } from '@/features/today/AchievementOverlay';
import { CareCard } from '@/features/today/CareCard';
import { greetingText } from '@/features/today/copy';
import { FirstRunCard } from '@/features/today/FirstRunCard';
import { FitCard } from '@/features/today/FitCard';
import { MealGroups } from '@/features/today/MealGroups';
import { NextStepCard } from '@/features/today/NextStepCard';
import { QuickCarousel, type QuickPoint } from '@/features/today/QuickCarousel';
import { QuickLogBar } from '@/features/today/QuickLogBar';
import { UndoToast, type UndoToastState } from '@/features/today/UndoToast';
import { TodayHero } from '@/features/today/TodayHero';
import { TrainingCard } from '@/features/today/TrainingCard';
import { useNow } from '@/features/today/useNow';
import { useFitSuggestions } from '@/features/today/useFitSuggestions';
import { useTodayRituals } from '@/features/today/useTodayRituals';
import { WeekStrip } from '@/features/today/WeekStrip';
import { WeightQuickLog } from '@/features/today/WeightQuickLog';
import { WaterCard, type WaterAddedInfo } from '@/features/water/ui/WaterCard';
import {
  usePlannedDay,
  useStartWorkout,
  useWorkoutsForDate,
} from '@/features/workout';
import { addDays, toISODate, weekdayOf } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const today = toISODate(now);
  const [date, setDate] = useState(() => toISODate());
  const isToday = date === today;

  const { targets, isLoading: targetsLoading } = useDailyTargets(date);
  const { totals } = useFoodTotals(date);
  const { logs, isLoading: logsLoading } = useFoodLogsForDate(date);
  const { workouts } = useWorkoutsForDate(date);
  const { plannedDay } = usePlannedDay(date);
  const deleteFoodLog = useDeleteFoodLog();
  const { startEmpty } = useStartWorkout();
  const { favorites, recents } = useQuickLogEntries();
  const quickLog = useQuickLogMeal();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<UndoToastState | null>(null);
  const hideToast = useCallback(() => setToast(null), [setToast]);
  const allQuickEntries = useMemo(() => {
    const seen = new Set<string>();
    return [...favorites, ...recents].filter((e) =>
      seen.has(e.key) ? false : (seen.add(e.key), true),
    );
  }, [favorites, recents]);
  const quickEntries = useMemo(
    () => allQuickEntries.slice(0, 8),
    [allQuickEntries],
  );
  const fits = useFitSuggestions({
    enabled: isToday,
    hour: now.getHours(),
    targets,
    totals,
    entries: allQuickEntries,
  });
  const rituals = useTodayRituals({
    today,
    now,
    targets,
    totals,
    logs,
    workouts,
  });

  // Future navigation is capped at tomorrow (planning ahead by one day).
  const goPrevDay = useCallback(
    () => setDate((d) => addDays(d, -1)),
    [setDate],
  );
  const goNextDay = useCallback(
    () =>
      setDate((d) => {
        const next = addDays(d, 1);
        return next > addDays(toISODate(), 1) ? d : next;
      }),
    [setDate],
  );

  // Swipe-only day switching; the detector wraps only the area above the meal list so it
  // can't collide with the Swipeable delete rows.
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .runOnJS(true)
        .onEnd((e) => {
          if (Math.abs(e.translationX) < 60 && Math.abs(e.velocityX) < 500)
            return;
          if (e.translationX < 0) goNextDay();
          else goPrevDay();
        }),
    [goNextDay, goPrevDay],
  );

  const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(i18n.language, opts).format(
      new Date(y, m - 1, d),
    );
  };
  const headerTitle =
    date === today
      ? t('food.dashboard.today')
      : date === addDays(today, -1)
        ? t('food.dashboard.yesterday')
        : date === addDays(today, 1)
          ? t('food.dashboard.tomorrow')
          : fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' });
  const subtitle = isToday
    ? greetingText(t, rituals.slot, rituals.displayName)
    : fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' });

  // Meal flight: the food sheets queue it, Today launches it towards the ring centre.
  const ringRef = useRef<View>(null);
  const flight = useMealFlight();
  const launchFlight = flight.launch;
  const flyToRing = useCallback(
    (kcal: number, from?: QuickPoint) => {
      ringRef.current?.measureInWindow((x, y, w, h) =>
        launchFlight({ kcal, from, to: { x: x + w / 2, y: y + h / 2 } }),
      );
    },
    [launchFlight],
  );
  useFocusEffect(
    useCallback(() => {
      const pending = useMealFlightBridge.getState().consume();
      if (!pending) return;
      const id = setTimeout(() => flyToRing(pending.kcal, pending.from), 250);
      return () => clearTimeout(id);
    }, [flyToRing]),
  );

  const openLog = () =>
    router.push({ pathname: '/log-food', params: { date } });
  const openLogFor = useCallback(
    (meal: MealType) =>
      router.push({ pathname: '/log-food', params: { date, meal } }),
    [date],
  );

  const deleteMutate = deleteFoodLog.mutate;
  const handleDelete = useCallback(
    (id: string) => {
      haptic.mealDeleted();
      deleteMutate(id);
    },
    [deleteMutate],
  );
  const quickMutate = quickLog.mutate;
  const onQuickLog = useCallback(
    (entry: QuickLogEntry, from?: QuickPoint) => {
      quickMutate(
        { entry, date },
        {
          onSuccess: (id) => {
            haptic.mealQuickSaved();
            flyToRing(entry.kcal, from);
            setToast({
              id: Date.now(),
              message: t('identity.today.quickSaved', {
                name: entry.title || t('food.dashboard.untitledMeal'),
              }),
              actionLabel: t('identity.today.undo'),
              onAction: () => {
                deleteMutate(id);
                setToast(null);
              },
            });
          },
          onError: () =>
            Alert.alert(
              t('food.review.saveErrorTitle'),
              t('food.logFood.quickLogError'),
            ),
        },
      );
    },
    [quickMutate, deleteMutate, date, flyToRing, t, setToast],
  );

  const onWaterAdded = useCallback(
    ({ message, undo }: WaterAddedInfo) =>
      setToast({
        id: Date.now(),
        message,
        actionLabel: t('identity.today.undo'),
        onAction: () => {
          undo();
          setToast(null);
        },
      }),
    [t, setToast],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['food'] }),
        queryClient.invalidateQueries({ queryKey: ['workout'] }),
        queryClient.invalidateQueries({ queryKey: ['latestWeight'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['water'] }),
      ]);
      invalidateLedger(queryClient);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const needsWeight =
    !targets && !targetsLoading && rituals.weightsLoaded && !rituals.hasWeight;
  const firstRun = isToday && !rituals.hasAnyFood && logs.length === 0;
  const color = themeColor('labelSecondary');

  return (
    <View className="bg-bg flex-1">
      <ScreenTitle
        title={headerTitle}
        subtitle={subtitle}
        right={
          <View className="flex-row items-center">
            {!isToday ? (
              <Pressable
                onPress={() => setDate(today)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('identity.today.backToToday')}
                className="h-11 w-11 items-center justify-center"
              >
                <SymbolView
                  name="arrow.uturn.backward"
                  size={17}
                  weight="semibold"
                  tintColor={themeColor('accent')}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={goPrevDay}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t('identity.today.prevDay')}
              className="h-11 w-9 items-center justify-center"
            >
              <SymbolView
                name="chevron.left"
                size={17}
                weight="semibold"
                tintColor={color}
              />
            </Pressable>
            <Pressable
              onPress={goNextDay}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t('identity.today.nextDay')}
              className="h-11 w-9 items-center justify-center"
            >
              <SymbolView
                name="chevron.right"
                size={17}
                weight="semibold"
                tintColor={color}
              />
            </Pressable>
          </View>
        }
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 pb-32 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
          />
        }
      >
        <GestureDetector gesture={swipeGesture}>
          <View className="gap-6">
            {/* Owner: no daily sentence on Today; only the care card stays. */}
            {isToday && rituals.careFlagged ? <CareCard today={today} /> : null}

            {targets ? (
              <Reveal index={0} once="today-hero">
                <TodayHero
                  targets={targets}
                  totals={totals}
                  ringRef={ringRef}
                />
              </Reveal>
            ) : targetsLoading ? (
              <SkeletonBlock width="100%" height={340} radius={32} />
            ) : needsWeight ? (
              <Card className="gap-3">
                <Text
                  className="text-label"
                  style={textStyles.title}
                  maxFontSizeMultiplier={1.3}
                >
                  {t('identity.today.weightMissingTitle')}
                </Text>
                <Text
                  className="text-label-secondary"
                  style={textStyles.callout}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('identity.today.weightMissingBody')}
                </Text>
                <WeightQuickLog />
              </Card>
            ) : (
              <Card className="items-center gap-2">
                <Text
                  className="text-label text-center"
                  style={textStyles.headline}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('food.dashboard.completeProfileTitle')}
                </Text>
                <Text
                  className="text-label-secondary text-center"
                  style={textStyles.callout}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('food.dashboard.completeProfileBody')}
                </Text>
              </Card>
            )}

            <QuickLogBar date={date} />
          </View>
        </GestureDetector>

        <QuickCarousel
          entries={quickEntries}
          disabled={quickLog.isPending}
          onLog={onQuickLog}
        />

        <WaterCard
          date={date}
          isTrainingDay={!!targets?.isTrainingDay}
          onAdded={onWaterAdded}
        />

        <FitCard
          result={fits}
          disabled={quickLog.isPending}
          onLog={onQuickLog}
        />

        {firstRun ? (
          <FirstRunCard
            steps={rituals.checklist.steps}
            showSteps={rituals.checklist.visible}
          />
        ) : null}

        {isToday && targets && !rituals.careFlagged ? (
          <NextStepCard
            step={rituals.nextStep}
            onLogMeal={openLog}
            onStartWorkout={startEmpty}
          />
        ) : null}

        {isToday ? <WeekStrip /> : null}

        {isToday || workouts.length > 0 ? (
          <TrainingCard
            isToday={isToday && weekdayOf(date) >= 0}
            plannedDay={plannedDay}
            workouts={workouts}
            onStart={startEmpty}
          />
        ) : null}

        <View className="gap-2">
          <SectionHeader title={t('identity.today.meals')} />
          {logsLoading && logs.length === 0 ? (
            <SkeletonBlock width="100%" height={240} radius={24} />
          ) : (
            <MealGroups
              logs={logs}
              onAdd={openLogFor}
              onDelete={handleDelete}
            />
          )}
        </View>
      </ScrollView>

      <AchievementOverlay enabled={isToday && !!targets} />
      <View pointerEvents="none" className="absolute inset-0">
        <MealFlight flight={flight.flight} onDone={flight.clear} />
      </View>
      <UndoToast toast={toast} onHide={hideToast} />
    </View>
  );
}
