import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Card, ListRow } from '@/components/ui';
import type { MealType } from '@/domain';
import type { FoodLogWithItems } from '@/features/food';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * One meal line: name, kcal (when logged) and a quiet "+". Empty meals stay
 * secondary; tapping a logged meal opens its entries.
 */
function MealRow({
  name,
  kcal,
  open,
  onToggle,
  onAdd,
  separator,
}: {
  name: string;
  kcal: number | null;
  open: boolean;
  onToggle: () => void;
  onAdd: () => void;
  separator: boolean;
}) {
  const { t } = useTranslation();
  const logged = kcal !== null;
  const addButton = (
    <Pressable
      onPress={onAdd}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('identity.today.addToMeal', { meal: name })}
      className="h-11 w-9 items-center justify-center"
    >
      <SymbolView
        name="plus"
        size={17}
        weight="semibold"
        tintColor={themeColor('accent')}
      />
    </Pressable>
  );
  return (
    <View>
      <View className="min-h-[56px] flex-row items-center gap-3 pl-5 pr-2">
        <Pressable
          onPress={logged ? onToggle : onAdd}
          accessibilityRole="button"
          accessibilityLabel={
            logged
              ? `${name}, ${kcal} ${t('food.dashboard.kcalUnit')}`
              : t('identity.today.addToMeal', { meal: name })
          }
          accessibilityState={logged ? { expanded: open } : undefined}
          className="min-h-[56px] flex-1 flex-row items-center gap-3"
        >
          <Text
            className={`flex-1 ${logged ? 'text-label' : 'text-label-secondary'}`}
            style={textStyles.body}
            maxFontSizeMultiplier={1.4}
          >
            {name}
          </Text>
          {logged ? (
            <View className="flex-row items-baseline gap-1">
              <Text
                className="text-label"
                style={textStyles.numericS}
                maxFontSizeMultiplier={1.15}
              >
                {kcal}
              </Text>
              <Text className="text-label-secondary" style={textStyles.caption}>
                {t('food.dashboard.kcalUnit')}
              </Text>
            </View>
          ) : null}
        </Pressable>
        {addButton}
      </View>
      {separator ? (
        <View
          className="bg-line"
          style={{ height: StyleSheet.hairlineWidth, marginLeft: 20 }}
        />
      ) : null}
    </View>
  );
}

/** Meals as quiet lines in one flat card; each meal has a small plus. */
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
            <MealRow
              name={names[type]}
              kcal={list.length > 0 ? kcal : null}
              open={isOpen}
              onToggle={() => {
                haptic.select();
                setOpen(isOpen ? null : type);
              }}
              onAdd={() => onAdd(type)}
              separator={!last || isOpen}
            />
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
