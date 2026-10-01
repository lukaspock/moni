import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  Swipeable,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { KcalRing } from '@/components/charts/KcalRing';
import { MacroBar } from '@/components/charts/MacroBar';
import { GlassActionButton } from '@/components/glass/GlassActionButton';
import type { FoodLogWithItems } from '@/features/food';
import {
  useDeleteFoodLog,
  useFoodLogsForDate,
  useFoodTotals,
} from '@/features/food';
import { useDailyTargets, useProfile } from '@/features/targets';
import { greetingPeriod, type GreetingPeriod } from '@/features/auth';
import {
  usePlannedDay,
  useStartWorkout,
  useWorkoutsForDate,
} from '@/features/workout';
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
  const { startEmpty: startEmptyWorkout } = useStartWorkout();

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

  // Day switching is swipe-only. Pan (not Fling) with a horizontal activation window and
  // a vertical fail window so vertical scrolling is never stolen. Callbacks run on the JS
  // thread (.runOnJS(true)) because they call React setState. The detector wraps only the
  // area above the meal list, so it can't collide with the Swipeable delete rows.
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
        }}
      />
      <View className="bg-system-background flex-1">
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerClassName="gap-6 px-4 pb-32 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <GestureDetector gesture={swipeGesture}>
            <View className="gap-6">
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
                      baseKcal={targets?.totalKcal ?? 0}
                      bonusKcal={0}
                    />
                    {(targets?.workoutBonusKcal ?? 0) > 0 && (
                      <Text className="text-secondary-label text-sm">
                        {t('food.dashboard.includesBonus', {
                          kcal: Math.round(targets?.workoutBonusKcal ?? 0),
                        })}
                      </Text>
                    )}
                  </View>

                  <GlassActionButton
                    label={t('food.dashboard.addMeal')}
                    onPress={() =>
                      router.push({ pathname: '/log-food', params: { date } })
                    }
                  />

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
                      <GlassActionButton
                        label={t('workout.training.startWorkout')}
                        symbol="figure.strengthtraining.traditional"
                        onPress={startEmptyWorkout}
                      />
                    )}
                  </View>
                ) : (
                  <Text className="text-secondary-label text-sm">
                    {t('food.dashboard.restDay')}
                  </Text>
                )}
              </View>
            </View>
          </GestureDetector>

          <View className="gap-4">
            {MEAL_ORDER.map((mealType) => {
              const mealLogs = mealsByType.get(mealType) ?? [];
              if (mealLogs.length === 0) return null;
              const mealKcal = mealLogs.reduce((sum, log) => sum + log.kcal, 0);
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
    </>
  );
}
