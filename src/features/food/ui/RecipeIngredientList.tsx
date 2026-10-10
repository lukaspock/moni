import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { scaleFoodItem, type RecipeIngredient } from '@/domain';
import { Card, ListRow } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';

export type EditableIngredient = RecipeIngredient & { key: string };

export interface RecipeIngredientListProps {
  items: EditableIngredient[];
  onChange: (key: string, patch: Partial<RecipeIngredient>) => void;
  onRemove: (key: string) => void;
  /** Key of the row that should start expanded (e.g. a just-added manual row). */
  openKey: string | null;
  onOpenKeyChange: (key: string | null) => void;
}

/**
 * Whole-recipe ingredient amounts, one ListRow each; tap expands an inline editor
 * (name, grams = scales macros, kcal, P/C/F). Local state only, no food draft.
 */
export function RecipeIngredientList({
  items,
  onChange,
  onRemove,
  openKey,
  onOpenKeyChange,
}: RecipeIngredientListProps) {
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <Card>
        <Text className="text-label-secondary text-center text-sm">
          {t('food.recipe.editor.noIngredients')}
        </Text>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {items.map((item, index) => {
        const open = openKey === item.key;
        return (
          <View key={item.key}>
            <ListRow
              title={item.name || t('food.review.ingredientNamePlaceholder')}
              subtitle={t('food.review.itemMacros', {
                grams: Math.round(item.grams),
                p: Math.round(item.proteinG),
                c: Math.round(item.carbsG),
                f: Math.round(item.fatG),
              })}
              value={String(Math.round(item.kcal))}
              unit={t('food.dashboard.kcalUnit')}
              chevron={false}
              separator={!open && index < items.length - 1}
              onPress={() => {
                haptic.select();
                onOpenKeyChange(open ? null : item.key);
              }}
              accessibilityHint={t('food.review.editItem')}
            />
            {open && (
              <View className="gap-3 px-4 pb-4">
                <TextInput
                  value={item.name}
                  onChangeText={(name) => onChange(item.key, { name })}
                  placeholder={t('food.review.ingredientNamePlaceholder')}
                  placeholderTextColor={themeColor('labelTertiary')}
                  selectionColor={themeColor('accent')}
                  accessibilityLabel={t('food.review.nameLabel')}
                  maxFontSizeMultiplier={1.3}
                  className="bg-surface-raised text-label h-12 rounded-inner px-3 font-display-bold text-[17px]"
                />
                <View className="flex-row flex-wrap gap-2">
                  <NumberField
                    label={t('food.review.grams')}
                    value={item.grams}
                    onChange={(grams) =>
                      onChange(
                        item.key,
                        item.grams > 0 ? scaleFoodItem(item, grams) : { grams },
                      )
                    }
                  />
                  <NumberField
                    label={t('food.review.kcalLabel')}
                    value={item.kcal}
                    onChange={(kcal) => onChange(item.key, { kcal })}
                  />
                  <NumberField
                    label={t('food.macroLetter.protein')}
                    value={item.proteinG}
                    onChange={(proteinG) => onChange(item.key, { proteinG })}
                  />
                  <NumberField
                    label={t('food.macroLetter.carbs')}
                    value={item.carbsG}
                    onChange={(carbsG) => onChange(item.key, { carbsG })}
                  />
                  <NumberField
                    label={t('food.macroLetter.fat')}
                    value={item.fatG}
                    onChange={(fatG) => onChange(item.key, { fatG })}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    haptic.tapLight();
                    onRemove(item.key);
                  }}
                  hitSlop={8}
                  className="flex-row items-center gap-1.5 self-start py-1"
                  accessibilityRole="button"
                  accessibilityLabel={t('food.review.deleteItem')}
                >
                  <SymbolView
                    name="minus.circle.fill"
                    size={18}
                    tintColor={themeColor('danger')}
                  />
                  <Text className="text-destructive text-[15px] font-medium">
                    {t('food.review.deleteItem')}
                  </Text>
                </Pressable>
                {index < items.length - 1 && (
                  <View className="bg-line -mx-4 h-px" />
                )}
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const rounded = Math.round(value * 10) / 10;
  // Remount when the value changes from outside (grams auto-scaling) so the field shows it.
  return (
    <NumberFieldInput
      key={rounded}
      label={label}
      initialValue={rounded}
      onChange={onChange}
    />
  );
}

function NumberFieldInput({
  label,
  initialValue,
  onChange,
}: {
  label: string;
  initialValue: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(initialValue));
  return (
    <View className="min-w-[60px] flex-1 gap-1">
      <Text className="text-label-secondary text-[13px] font-medium">
        {label}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() =>
          onChange(Math.max(0, Number(text.replace(',', '.')) || 0))
        }
        keyboardType="decimal-pad"
        selectTextOnFocus
        selectionColor={themeColor('accent')}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.3}
        className="bg-surface-raised text-label h-11 rounded-xl px-3 text-right font-display-bold text-[17px]"
        style={{ fontVariant: ['tabular-nums'] }}
      />
    </View>
  );
}
