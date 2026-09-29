import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Directions, Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { KcalRing } from '@/components/charts/KcalRing';
import { MacroBar } from '@/components/charts/MacroBar';
import { FloatingActionButton } from '@/components/glass/FloatingActionButton';
import type { FoodLogWithItems } from '@/features/food';
import { useDeleteFoodLog, useFoodLogsForDate, useFoodTotals } from '@/features/food';
import { useDailyTargets } from '@/features/targets';
import { usePlannedDay, useWorkoutsForDate } from '@/features/workout';
import { addDays, toISODate } from '@/lib/date';
import type { MealType } from '@/domain';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function TodayScreen() {
  const { t } = useTranslation();
  const [date, setDate] = useState(() => toISODate());

  const { targets, isLoading: targetsLoading } = useDailyTargets(date);
  const { totals } = useFoodTotals(date);
  const { logs } = useFoodLogsForDate(date);
  const { plannedDay } = usePlannedDay(date);
  const { workouts } = useWorkoutsForDate(date);
  const deleteFoodLog = useDeleteFoodLog();

  const goPrevDay = () => setDate((d) => addDays(d, -1));
  const goNextDay = () => setDate((d) => addDays(d, 1));

  const swipeGesture = useMemo(
    () =>
      Gesture.Race(
        Gesture.Fling()
          .direction(Directions.LEFT)
          .onEnd(() => goNextDay()),
        Gesture.Fling()
          .direction(Directions.RIGHT)
          .onEnd(() => goPrevDay()),
      ),
    [],
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

  const isToday = date === toISODate();
  const dateLabel = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y, m - 1, d));
  }, [date]);

  const handleDelete = (id: string) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteFoodLog.mutate(id, {
      onSuccess: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    });
  };

  const hasTrainingToday = !!plannedDay || workouts.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
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
            <Pressable
              onPress={goNextDay}
              hitSlop={12}
              accessibilityLabel={t('food.dashboard.nextDay')}
            >
              <SymbolView name="chevron.right" size={20} />
            </Pressable>
          ),
        }}
      />
      <GestureDetector gesture={swipeGesture}>
        <View className="flex-1 bg-system-background">
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-6 px-4 pb-32 pt-4"
            showsVerticalScrollIndicator={false}
          >
            <Text className="text-center text-sm font-medium text-secondary-label">
              {isToday ? t('food.dashboard.today') : dateLabel}
            </Text>

            {!targets && !targetsLoading ? (
              <View className="items-center gap-3 rounded-2xl bg-secondary-system-background p-6">
                <SymbolView name="person.crop.circle.badge.exclamationmark" size={32} />
                <Text className="text-center text-base font-semibold text-label">
                  {t('food.dashboard.completeProfileTitle')}
                </Text>
                <Text className="text-center text-sm text-secondary-label">
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
                    <Text className="text-3xl font-bold text-label">
                      {Math.round(totals.kcal)}
                    </Text>
                    <Text className="text-sm text-secondary-label">
                      {t('food.dashboard.ofLimit', { limit: Math.round(targets?.totalKcal ?? 0) })}
                    </Text>
                  </View>
                </View>

                <View className="gap-3 rounded-2xl bg-secondary-system-background p-4">
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

            <View className="gap-2 rounded-2xl bg-secondary-system-background p-4">
              <Text className="text-base font-semibold text-label">
                {t('food.dashboard.trainingCardTitle')}
              </Text>
              {hasTrainingToday ? (
                <View className="gap-3">
                  <Text className="text-sm text-secondary-label">
                    {workouts.length > 0
                      ? t('food.dashboard.trainingDone')
                      : (plannedDay?.routineName ?? t('food.dashboard.trainingPlannedFreeform'))}
                  </Text>
                  {workouts.length === 0 && (
                    <Pressable
                      onPress={() => router.push('/workout/active')}
                      className="items-center rounded-xl bg-tint py-3"
                    >
                      <Text className="text-base font-semibold text-white">
                        {t('food.dashboard.startWorkout')}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text className="text-sm text-secondary-label">{t('food.dashboard.restDay')}</Text>
              )}
            </View>

            <View className="gap-4">
              {MEAL_ORDER.map((mealType) => {
                const mealLogs = mealsByType.get(mealType) ?? [];
                if (mealLogs.length === 0) return null;
                const mealKcal = mealLogs.reduce((sum, log) => sum + log.kcal, 0);
                return (
                  <View key={mealType} className="gap-2">
                    <View className="flex-row items-baseline justify-between px-1">
                      <Text className="text-base font-semibold text-label">
                        {t(`food.mealType.${mealType}`)}
                      </Text>
                      <Text className="text-sm text-secondary-label">
                        {Math.round(mealKcal)} {t('food.dashboard.kcalUnit')}
                      </Text>
                    </View>
                    <View className="overflow-hidden rounded-2xl bg-secondary-system-background">
                      {mealLogs.map((log, index) => (
                        <View key={log.id}>
                          {index > 0 && <View className="h-px bg-separator" />}
                          <Swipeable
                            renderRightActions={() => (
                              <Pressable
                                onPress={() => handleDelete(log.id)}
                                className="w-20 items-center justify-center bg-destructive"
                              >
                                <SymbolView name="trash" size={20} tintColor="white" />
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
                                Alert.alert(log.title ?? t('food.dashboard.untitledMeal'), undefined, [
                                  { text: t('food.dashboard.cancel'), style: 'cancel' },
                                  {
                                    text: t('food.dashboard.delete'),
                                    style: 'destructive',
                                    onPress: () => handleDelete(log.id),
                                  },
                                ])
                              }
                              className="flex-row items-center justify-between px-4 py-3"
                            >
                              <Text className="flex-1 text-base text-label" numberOfLines={1}>
                                {log.title || t('food.dashboard.untitledMeal')}
                              </Text>
                              <Text className="text-base text-secondary-label">
                                {Math.round(log.kcal)} {t('food.dashboard.kcalUnit')}
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
                <Text className="px-1 text-center text-sm text-secondary-label">
                  {t('food.dashboard.noMeals')}
                </Text>
              )}
            </View>
          </ScrollView>

          <FloatingActionButton
            onPress={() => router.push('/log-food')}
            accessibilityLabel={t('food.dashboard.logFood')}
            style={{ position: 'absolute', right: 20, bottom: 24 }}
          />
        </View>
      </GestureDetector>
    </>
  );
}
