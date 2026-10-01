import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import {
  Directions,
  Gesture,
  GestureDetector,
  Swipeable,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { KcalRing } from '@/components/charts/KcalRing';
import { MacroBar } from '@/components/charts/MacroBar';
import type { FoodLogWithItems } from '@/features/food';
import {
  useDeleteFoodLog,
  useFoodLogsForDate,
  useFoodTotals,
} from '@/features/food';
import { useDailyTargets, useProfile } from '@/features/targets';
import { greetingPeriod, type GreetingPeriod } from '@/features/auth';
import { usePlannedDay, useWorkoutsForDate } from '@/features/workout';
import { addDays, toISODate } from '@/lib/date';
import type { MealType } from '@/domain';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(() => toISODate());

  const { targets, isLoading: targetsLoading } = useDailyTargets(date);
  const { profile } = useProfile();
  const { totals } = useFoodTotals(date);
  const { logs } = useFoodLogsForDate(date);
  const { plannedDay } = usePlannedDay(date);
  const { workouts } = useWorkoutsForDate(date);
  const deleteFoodLog = useDeleteFoodLog();

  // Future navigation is capped at tomorrow (planning ahead by one day).
  const goPrevDay = useCallback(() => setDate((d) => addDays(d, -1)), []);
  const goNextDay = useCallback(
    () =>
      setDate((d) => {
        const next = addDays(d, 1);
        return next > addDays(toISODate(), 1) ? d : next;
      }),
    [],
  );

  // Gesture callbacks must run on the JS thread (.runOnJS(true)): they call
  // React setState, which is not allowed from the UI-thread worklet runtime.
  const swipeGesture = useMemo(
    () =>
      Gesture.Race(
        Gesture.Fling()
          .direction(Directions.LEFT)
          .runOnJS(true)
          .onEnd(goNextDay),
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .runOnJS(true)
          .onEnd(goPrevDay),
      ),
    [goNextDay, goPrevDay],
  );

  const mealsByType = useMemo(() => {
    const map = new Map<MealType, FoodLogWithItems[]>();
    for (const log of logs) {
      const key = (log.meal_type as MealType) ?? 'snack';
      const list = map.get(key) ?? [];
      list.push(log);
      map.set(key, list);
    }
    return map;
  }, [logs]);

  const today = toISODate();
  const isToday = date === today;
  const headerTitle = useMemo(() => {
    if (date === today) return t('food.dashboard.today');
    if (date === addDays(today, -1)) return t('food.dashboard.yesterday');
    if (date === addDays(today, 1)) return t('food.dashboard.tomorrow');
    const [y, m, d] = date.split('-').map(Number);
    return new Intl.DateTimeFormat(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(y, m - 1, d));
  }, [date, today, t, i18n.language]);

  const handleDelete = (id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteFoodLog.mutate(id, {
      onSuccess: () =>
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ),
    });
  };

  const hasTrainingToday = !!plannedDay || workouts.length > 0;

  // Personal greeting (onboarding v2 display_name).
  const displayName = profile?.display_name?.trim() ?? '';
  const greetings: Record<GreetingPeriod, string> = {
    morning: t('account.greeting.morning', { name: displayName }),
    afternoon: t('account.greeting.afternoon', { name: displayName }),
    evening: t('account.greeting.evening', { name: displayName }),
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerLeft: () => (
            <Pressable
              onPress={goPrevDay}
              hitSlop={12}
              accessibilityLabel={t('food.dashboard.previousDay')}
            >
              <SymbolView name="chevron.left" size={20} />
            </Pressable>
          ),
          headerRight: () => (
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={goNextDay}
                hitSlop={12}
                accessibilityLabel={t('food.dashboard.nextDay')}
              >
                <SymbolView name="chevron.right" size={20} />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/log-food', params: { date } })
                }
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('food.dashboard.logFood')}
              >
                <SymbolView name="plus.circle.fill" size={26} />
              </Pressable>
            </View>
          ),
        }}
      />
      <GestureDetector gesture={swipeGesture}>
        <View className="bg-system-background flex-1">
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-6 px-4 pb-32 pt-4"
            showsVerticalScrollIndicator={false}
          >
            {isToday && displayName ? (
              <Text className="text-label text-center text-xl font-semibold">
                {greetings[greetingPeriod()]}
              </Text>
            ) : null}
            {!targets && !targetsLoading ? (
              <View className="bg-secondary-system-background items-center gap-3 rounded-2xl p-6">
                <SymbolView
                  name="person.crop.circle.badge.exclamationmark"
                  size={32}
                />
                <Text className="text-label text-center text-base font-semibold">
                  {t('food.dashboard.completeProfileTitle')}
                </Text>
                <Text className="text-secondary-label text-center text-sm">
                  {t('food.dashboard.completeProfileBody')}
                </Text>
              </View>
            ) : (
              <>
                <View className="items-center gap-4 py-2">
                  <KcalRing
                    eatenKcal={totals.kcal}
                    baseKcal={targets?.baseKcal ?? 0}
                    bonusKcal={targets?.workoutBonusKcal ?? 0}
                    bonusIsProvisional={targets?.bonusIsProvisional ?? false}
                  />
                  <View className="items-center gap-0.5">
                    <Text className="text-label text-3xl font-bold">
                      {Math.round(totals.kcal)}
                    </Text>
                    <Text className="text-secondary-label text-sm">
                      {t('food.dashboard.ofLimit', {
                        limit: Math.round(targets?.totalKcal ?? 0),
                      })}
                    </Text>
                  </View>
                </View>

                <View className="bg-secondary-system-background gap-3 rounded-2xl p-4">
                  <MacroBar
                    label={t('food.dashboard.protein')}
                    gramsEaten={totals.proteinG}
                    gramsTarget={targets?.proteinG ?? 0}
                    highlighted
                    color="purple"
                  />
                  <MacroBar
                    label={t('food.dashboard.carbs')}
                    gramsEaten={totals.carbsG}
                    gramsTarget={targets?.carbsG ?? 0}
                    color="orange"
                  />
                  <MacroBar
                    label={t('food.dashboard.fat')}
                    gramsEaten={totals.fatG}
                    gramsTarget={targets?.fatG ?? 0}
                    color="accent"
                  />
                </View>
              </>
            )}

            <View className="bg-secondary-system-background gap-2 rounded-2xl p-4">
              <Text className="text-label text-base font-semibold">
                {t('food.dashboard.trainingCardTitle')}
              </Text>
              {hasTrainingToday ? (
                <View className="gap-3">
                  <Text className="text-secondary-label text-sm">
                    {workouts.length > 0
                      ? t('food.dashboard.trainingDone')
                      : (plannedDay?.routineName ??
                        t('food.dashboard.trainingPlannedFreeform'))}
                  </Text>
                  {workouts.length === 0 && (
                    <Pressable
                      onPress={() => router.push('/workout/active')}
                      className="bg-tint items-center rounded-xl py-3"
                    >
                      <Text className="text-base font-semibold text-white">
                        {t('food.dashboard.startWorkout')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text className="text-secondary-label text-sm">
                  {t('food.dashboard.restDay')}
                </Text>
              )}
            </View>

            <View className="gap-4">
              {MEAL_ORDER.map((mealType) => {
                const mealLogs = mealsByType.get(mealType) ?? [];
                if (mealLogs.length === 0) return null;
                const mealKcal = mealLogs.reduce(
                  (sum, log) => sum + log.kcal,
                  0,
                );
                return (
                  <View key={mealType} className="gap-2">
                    <View className="flex-row items-baseline justify-between px-1">
                      <Text className="text-label text-base font-semibold">
                        {t(`food.mealType.${mealType}`)}
                      </Text>
                      <Text className="text-secondary-label text-sm">
                        {Math.round(mealKcal)} {t('food.dashboard.kcalUnit')}
                      </Text>
                    </View>
                    <View className="bg-secondary-system-background overflow-hidden rounded-2xl">
                      {mealLogs.map((log, index) => (
                        <View key={log.id}>
                          {index > 0 && <View className="bg-separator h-px" />}
                          <Swipeable
                            renderRightActions={() => (
                              <Pressable
                                onPress={() => handleDelete(log.id)}
                                className="bg-destructive w-20 items-center justify-center"
                              >
                                <SymbolView
                                  name="trash"
                                  size={20}
                                  tintColor="white"
                                />
                              </Pressable>
                            )}
                          >
                            <Pressable
                              onPress={() =>
                                router.push({
                                  pathname: '/food-review',
                                  params: { editFoodLogId: log.id },
                                })
                              }
                              onLongPress={() =>
                                Alert.alert(
                                  log.title ?? t('food.dashboard.untitledMeal'),
                                  undefined,
                                  [
                                    {
                                      text: t('food.dashboard.cancel'),
                                      style: 'cancel',
                                    },
                                    {
                                      text: t('food.dashboard.delete'),
                                      style: 'destructive',
                                      onPress: () => handleDelete(log.id),
                                    },
                                  ],
                                )
                              }
                              className="flex-row items-center justify-between px-4 py-3"
                            >
                              <Text
                                className="text-label flex-1 text-base"
                                numberOfLines={1}
                              >
                                {log.title || t('food.dashboard.untitledMeal')}
                              </Text>
                              <Text className="text-secondary-label text-base">
                                {Math.round(log.kcal)}{' '}
                                {t('food.dashboard.kcalUnit')}
                              </Text>
                            </Pressable>
                          </Swipeable>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
              {logs.length === 0 && (
                <Text className="text-secondary-label px-1 text-center text-sm">
                  {t('food.dashboard.noMeals')}
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </GestureDetector>
    </>
  );
}
