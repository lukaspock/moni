import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { Card, ListRow } from '@/components/ui';
import type { MealType } from '@/domain';
import type { FoodLogWithItems } from '@/features/food';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_SYMBOL: Record<MealType, SymbolViewProps['name']> = {
  breakfast: 'cup.and.saucer.fill',
  lunch: 'fork.knife',
  dinner: 'moon.stars.fill',
  snack: 'leaf.fill',
};

/** Meals as grouped rows in one flat card; empty meals invite with a plus. */
export const MealGroups = memo(function MealGroups({
  logs,
  onAdd,
  onDelete,
}: {
  logs: FoodLogWithItems[];
  onAdd: (mealType: MealType) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<MealType | null>(null);
  const names: Record<MealType, string> = {
    breakfast: t('food.mealType.breakfast'),
    lunch: t('food.mealType.lunch'),
    dinner: t('food.mealType.dinner'),
    snack: t('food.mealType.snack'),
  };
  const byType = new Map<MealType, FoodLogWithItems[]>();
  for (const log of logs) {
    const key = (log.meal_type as MealType) ?? 'snack';
    byType.set(key, [...(byType.get(key) ?? []), log]);
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {MEAL_ORDER.map((type, i) => {
        const list = byType.get(type) ?? [];
        const kcal = Math.round(list.reduce((s, l) => s + l.kcal, 0));
        const isOpen = open === type && list.length > 0;
        const last = i === MEAL_ORDER.length - 1;
        return (
          <View key={type}>
            {list.length === 0 ? (
              <ListRow
                symbol={MEAL_SYMBOL[type]}
                iconTone="neutral"
                title={names[type]}
                trailing={
                  <SymbolView
                    name="plus.circle.fill"
                    size={26}
                    tintColor={themeColor('accent')}
                  />
                }
                onPress={() => onAdd(type)}
                chevron={false}
                accessibilityLabel={t('identity.today.addToMeal', {
                  meal: names[type],
                })}
                separator={!last}
              />
            ) : (
              <ListRow
                symbol={MEAL_SYMBOL[type]}
                iconTone="accent"
                title={names[type]}
                trailing={
                  <View className="flex-row items-center gap-3">
                    <View className="flex-row items-baseline gap-1">
                      <Text
                        className="text-label"
                        style={textStyles.numericS}
                        maxFontSizeMultiplier={1.15}
                      >
                        {kcal}
                      </Text>
                      <Text
                        className="text-label-secondary"
                        style={textStyles.caption}
                      >
                        {t('food.dashboard.kcalUnit')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => onAdd(type)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('identity.today.addToMeal', {
                        meal: names[type],
                      })}
                    >
                      <SymbolView
                        name="plus.circle.fill"
                        size={26}
                        tintColor={themeColor('accent')}
                      />
                    </Pressable>
                  </View>
                }
                onPress={() => {
                  haptic.select();
                  setOpen(isOpen ? null : type);
                }}
                chevron={false}
                separator={!last || isOpen}
              />
            )}
            {isOpen ? (
              <Animated.View
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}
              >
                {list.map((log, j) => (
                  <Swipeable
                    key={log.id}
                    renderRightActions={() => (
                      <Pressable
                        onPress={() => onDelete(log.id)}
                        accessibilityRole="button"
                        accessibilityLabel={t('food.dashboard.delete')}
                        className="bg-destructive w-20 items-center justify-center"
                      >
                        <SymbolView name="trash" size={20} tintColor="white" />
                      </Pressable>
                    )}
                  >
                    <View className="bg-surface">
                      <ListRow
                        title={log.title || t('food.dashboard.untitledMeal')}
                        value={String(Math.round(log.kcal))}
                        unit={t('food.dashboard.kcalUnit')}
                        onPress={() =>
                          router.push({
                            pathname: '/food-review',
                            params: { editFoodLogId: log.id },
                          })
                        }
                        chevron={false}
                        separator={j < list.length - 1 || !last}
                      />
                    </View>
                  </Swipeable>
                ))}
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
});
