import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import {
  RECIPE_LOG_PORTION_PRESETS,
  formatPortions,
  recipeKcalForPortions,
} from '@/domain';
import { RollingNumber } from '@/components/motion';
import { Card, Chip, ListRow, SectionHeader } from '@/components/ui';
import { themeColor } from '@/theme/colors';
import { haptic } from '@/lib/haptics';

import type { Recipe } from '../recipes';

export interface RecipeQuickListProps {
  recipes: Recipe[];
  /** Id of the recipe that was just logged (shows a check). */
  loggedId: string | null;
  disabled?: boolean;
  onLog: (recipe: Recipe, portions: number, kcal: number) => void;
  onEdit: (recipe: Recipe) => void;
  onCreate: () => void;
}

/** "Meine Gerichte" on log-food: per recipe portion chips (½/1/1½/2) + one-tap log. */
export function RecipeQuickList({
  recipes,
  loggedId,
  disabled,
  onLog,
  onEdit,
  onCreate,
}: RecipeQuickListProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <SectionHeader title={t('food.recipe.sectionTitle')} />
      <Card className="gap-0 overflow-hidden p-0">
        {recipes.map((recipe) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            logged={loggedId === recipe.id}
            disabled={disabled}
            onLog={onLog}
            onEdit={onEdit}
          />
        ))}
        <ListRow
          title={t('food.recipe.create')}
          subtitle={
            recipes.length === 0 ? t('food.recipe.createHint') : undefined
          }
          symbol="plus"
          chevron={false}
          onPress={onCreate}
        />
      </Card>
    </View>
  );
}

function RecipeRow({
  recipe,
  logged,
  disabled,
  onLog,
  onEdit,
}: {
  recipe: Recipe;
  logged: boolean;
  disabled?: boolean;
  onLog: RecipeQuickListProps['onLog'];
  onEdit: RecipeQuickListProps['onEdit'];
}) {
  const { t, i18n } = useTranslation();
  const [portions, setPortions] = useState(1);
  const kcal = recipeKcalForPortions(recipe.perServingItems, portions);
  const decimal = i18n.language.startsWith('de') ? ',' : '.';
  const portionsLabel = formatPortions(portions, decimal);
  const kcalUnit = t('food.dashboard.kcalUnit');

  return (
    <View>
      <ListRow
        title={recipe.title}
        subtitle={t('food.recipe.perServing', {
          kcal: Math.round(recipe.perServingTotals.kcal),
        })}
        chevron={false}
        onPress={() => onEdit(recipe)}
        accessibilityHint={t('food.recipe.editA11y', { title: recipe.title })}
        trailing={
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-end gap-1">
              <RollingNumber
                value={kcal}
                fontSize={17}
                accessibilityLabel={`${kcal} ${kcalUnit}`}
              />
              <Text className="text-label-secondary text-[13px]">
                {kcalUnit}
              </Text>
            </View>
            <Pressable
              onPress={() => onLog(recipe, portions, kcal)}
              disabled={disabled}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                logged
                  ? t('food.recipe.logged')
                  : t('food.recipe.logNow', { portions: portionsLabel, kcal })
              }
            >
              <SymbolView
                name={logged ? 'checkmark.circle.fill' : 'plus.circle.fill'}
                size={32}
                tintColor={themeColor('accent')}
              />
            </Pressable>
          </View>
        }
      />
      <View className="flex-row flex-wrap gap-2 px-4 pb-3">
        {RECIPE_LOG_PORTION_PRESETS.map((preset) => {
          const label = formatPortions(preset, decimal);
          return (
            <Chip
              key={preset}
              label={label}
              activeStyle="soft"
              selected={Math.abs(portions - preset) < 0.001}
              accessibilityHint={t('food.recipe.portionsA11y', {
                portions: label,
              })}
              onPress={() => {
                haptic.select();
                setPortions(preset);
              }}
            />
          );
        })}
      </View>
      <View className="bg-line ml-4 h-px" />
    </View>
  );
}
