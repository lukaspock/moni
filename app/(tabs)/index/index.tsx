import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  PlatformColor,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  Swipeable,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { KcalRing } from '@/components/charts/KcalRing';
import { MacroBar } from '@/components/charts/MacroBar';
import { GlassActionButton } from '@/components/glass/GlassActionButton';
import { ScreenTitle } from '@/components/ui';
import type { FoodLogWithItems } from '@/features/food';
import {
  useDeleteFoodLog,
  useFoodLogsForDate,
  useFoodTotals,
} from '@/features/food';
import { useDailyTargets } from '@/features/targets';
import { addDays, toISODate } from '@/lib/date';
import type { MealType } from '@/domain';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const [date, setDate] = useState(() => toISODate());

  const { targets, isLoading: targetsLoading } = useDailyTargets(date);
  const { totals } = useFoodTotals(date);
  const { logs } = useFoodLogsForDate(date);
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

  return (
    <>
      <View className="bg-system-background flex-1">
        <ScreenTitle title={headerTitle} />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-4 pb-32 pt-12"
          showsVerticalScrollIndicator={false}
        >
          <GestureDetector gesture={swipeGesture}>
            <View className="gap-6">
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
                    <Text className="text-label self-start px-1 text-2xl font-bold">
                      {t('food.dashboard.overview')}
                    </Text>
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

                  <View className="gap-2">
                    <Text className="text-label px-1 text-2xl font-bold">
                      {t('food.dashboard.nutrition')}
                    </Text>
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
                  </View>
                </>
              )}

              <View className="gap-3">
                <GlassActionButton
                  label={t('food.dashboard.addMeal')}
                  onPress={() =>
                    router.push({ pathname: '/log-food', params: { date } })
                  }
                />
              </View>
            </View>
          </GestureDetector>

          <View className="gap-3">
            {MEAL_ORDER.map((mealType) => (
              <MealGroup
                key={mealType}
                mealType={mealType}
                logs={mealsByType.get(mealType) ?? []}
                onDelete={handleDelete}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

function MealGroup({
  mealType,
  logs,
  onDelete,
}: {
  mealType: MealType;
  logs: FoodLogWithItems[];
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const kcal = logs.reduce((sum, log) => sum + log.kcal, 0);
  const hasLogs = logs.length > 0;

  const toggle = () => {
    if (!hasLogs) return;
    void Haptics.selectionAsync();
    rotation.value = withTiming(open ? 0 : 90, { duration: 200 });
    setOpen((v) => !v);
  };

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      className="bg-secondary-system-background overflow-hidden rounded-2xl"
    >
      <Pressable
        onPress={toggle}
        disabled={!hasLogs}
        className="flex-row items-center gap-3 px-4 py-3.5"
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: !hasLogs }}
      >
        <Text className="text-label flex-1 text-base font-semibold">
          {t(`food.mealType.${mealType}`)}
        </Text>
        <Text className="text-secondary-label text-base">
          {Math.round(kcal)} {t('food.dashboard.kcalUnit')}
        </Text>
        <Animated.View style={[chevronStyle, { opacity: hasLogs ? 1 : 0.3 }]}>
          <SymbolView
            name="chevron.right"
            size={14}
            weight="semibold"
            tintColor={PlatformColor('secondaryLabel')}
          />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
        >
          {logs.map((log) => (
            <View key={log.id}>
              <View className="bg-separator h-px" />
              <Swipeable
                renderRightActions={() => (
                  <Pressable
                    onPress={() => onDelete(log.id)}
                    className="bg-destructive w-20 items-center justify-center"
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
                    Alert.alert(
                      log.title ?? t('food.dashboard.untitledMeal'),
                      undefined,
                      [
                        { text: t('food.dashboard.cancel'), style: 'cancel' },
                        {
                          text: t('food.dashboard.delete'),
                          style: 'destructive',
                          onPress: () => onDelete(log.id),
                        },
                      ],
                    )
                  }
                  className="bg-secondary-system-background flex-row items-center justify-between px-4 py-3"
                >
                  <Text
                    className="text-label flex-1 text-base"
                    numberOfLines={1}
                  >
                    {log.title || t('food.dashboard.untitledMeal')}
                  </Text>
                  <Text className="text-secondary-label text-base">
                    {Math.round(log.kcal)} {t('food.dashboard.kcalUnit')}
                  </Text>
                </Pressable>
              </Swipeable>
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}
