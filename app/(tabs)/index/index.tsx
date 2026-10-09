import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import {
  MealFlight,
  Reveal,
  SkeletonBlock,
  useMealFlight,
} from '@/components/motion';
import {
  Card,
  GlassActionButton,
  ScreenTitle,
  SectionHeader,
} from '@/components/ui';
import {
  useDeleteFoodLog,
  useFoodLogsForDate,
  useFoodTotals,
} from '@/features/food';
import { useMealFlightBridge } from '@/features/food/flightStore';
import { useDailyTargets } from '@/features/targets';
import { AchievementOverlay } from '@/features/today/AchievementOverlay';
import { CareCard } from '@/features/today/CareCard';
import { daySentenceText, greetingText } from '@/features/today/copy';
import { FirstRunCard } from '@/features/today/FirstRunCard';
import { MealGroups } from '@/features/today/MealGroups';
import { NextStepCard } from '@/features/today/NextStepCard';
import { TodayHero } from '@/features/today/TodayHero';
import { TrainingCard } from '@/features/today/TrainingCard';
import { useNow } from '@/features/today/useNow';
import { useTodayRituals } from '@/features/today/useTodayRituals';
import { WeekStrip } from '@/features/today/WeekStrip';
import { WeightQuickLog } from '@/features/today/WeightQuickLog';
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
  const { logs } = useFoodLogsForDate(date);
  const { workouts } = useWorkoutsForDate(date);
  const { plannedDay } = usePlannedDay(date);
  const deleteFoodLog = useDeleteFoodLog();
  const { startEmpty } = useStartWorkout();
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

  const sentenceText = (() => {
    if (!isToday || !rituals.sentence) return null;
    return daySentenceText(t, rituals.sentence.key, rituals.sentence.variant, {
      kcal: Math.round(targets?.totalKcal ?? 0).toLocaleString(i18n.language),
      weekday: fmtDate(today, { weekday: 'long' }),
      date: fmtDate(today, { day: 'numeric', month: 'long' }),
    });
  })();

  // Meal flight: the food sheets queue it, Today launches it towards the ring centre.
  const ringRef = useRef<View>(null);
  const flight = useMealFlight();
  const launchFlight = flight.launch;
  useFocusEffect(
    useCallback(() => {
      const pending = useMealFlightBridge.getState().consume();
      if (!pending) return;
      const id = setTimeout(() => {
        ringRef.current?.measureInWindow((x, y, w, h) => {
          launchFlight({
            kcal: pending.kcal,
            from: pending.from,
            to: { x: x + w / 2, y: y + h / 2 },
          });
        });
      }, 250);
      return () => clearTimeout(id);
    }, [launchFlight]),
  );

  const handleDelete = (id: string) => {
    haptic.mealDeleted();
    deleteFoodLog.mutate(id);
  };
  const openLog = () =>
    router.push({ pathname: '/log-food', params: { date } });

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
        contentContainerClassName="gap-8 px-5 pb-32 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <GestureDetector gesture={swipeGesture}>
          <View className="gap-6">
            {isToday && rituals.careFlagged ? (
              <CareCard today={today} />
            ) : sentenceText ? (
              <Text
                className="text-label px-1"
                style={textStyles.body}
                maxFontSizeMultiplier={1.4}
              >
                {sentenceText}
              </Text>
            ) : null}

            {targets ? (
              <Reveal index={0} once="today-hero">
                <TodayHero
                  targets={targets}
                  totals={totals}
                  ringRef={ringRef}
                />
              </Reveal>
            ) : targetsLoading ? (
              <SkeletonBlock width="100%" height={420} radius={32} />
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

            <GlassActionButton
              label={t('food.dashboard.addMeal')}
              onPress={openLog}
            />
          </View>
        </GestureDetector>

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
          <MealGroups logs={logs} onAdd={openLog} onDelete={handleDelete} />
        </View>
      </ScrollView>

      <AchievementOverlay enabled={isToday && !!targets} />
      <View pointerEvents="none" className="absolute inset-0">
        <MealFlight flight={flight.flight} onDone={flight.clear} />
      </View>
    </View>
  );
}
