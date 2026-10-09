import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Card, ListRow } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';

import { useFoodDraftStore, type DraftFoodItem } from '../draftStore';

export interface IngredientListProps {
  /** Portion-scaled items (what is shown and saved). */
  items: DraftFoodItem[];
  multiplier: number;
}

/**
 * Ingredient card: one ListRow per ingredient (name, grams + macros, kcal); tapping a row
 * expands the inline editor. Edits are divided by the portion multiplier back into the base
 * items, exactly like before.
 */
export function IngredientList({ items, multiplier }: IngredientListProps) {
  const { t } = useTranslation();
  const addItem = useFoodDraftStore((s) => s.addItem);
  const updateItem = useFoodDraftStore((s) => s.updateItem);
  const removeItem = useFoodDraftStore((s) => s.removeItem);
  const scaleItemGrams = useFoodDraftStore((s) => s.scaleItemGrams);

  // A single empty row (manual entry) starts expanded.
  const [openId, setOpenId] = useState<string | null>(() =>
    items.length === 1 && items[0]!.name === '' ? items[0]!.id : null,
  );

  const add = () => {
    haptic.itemAdded();
    addItem({ name: '', grams: 100, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    // Read the fresh value right after the action (see CLAUDE.md, draft-state pattern).
    const created = useFoodDraftStore.getState().items.at(-1);
    if (created) setOpenId(created.id);
  };

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <View key={item.id}>
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
              separator={!open}
              onPress={() => {
                haptic.select();
                setOpenId(open ? null : item.id);
              }}
              accessibilityHint={t('food.review.editItem')}
            />
            {open && (
              <View className="gap-3 px-4 pb-4">
                <TextInput
                  value={item.name}
                  onChangeText={(name) => updateItem(item.id, { name })}
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
                      scaleItemGrams(item.id, grams / multiplier)
                    }
                  />
                  <NumberField
                    label={t('food.review.kcalLabel')}
                    value={item.kcal}
                    onChange={(v) =>
                      updateItem(item.id, { kcal: v / multiplier })
                    }
                  />
                  {(
                    [
                      ['protein', 'proteinG', item.proteinG],
                      ['carbs', 'carbsG', item.carbsG],
                      ['fat', 'fatG', item.fatG],
                    ] as const
                  ).map(([kind, field, value]) => (
                    <NumberField
                      key={kind}
                      label={t(`food.macroLetter.${kind}`)}
                      value={value}
                      onChange={(v) =>
                        updateItem(item.id, {
                          [field]: v / multiplier,
                        })
                      }
                    />
                  ))}
                </View>
                <Pressable
                  onPress={() => {
                    haptic.tapLight();
                    removeItem(item.id);
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
                <View className="bg-line -mx-4 h-px" />
              </View>
            )}
          </View>
        );
      })}
      {items.length === 0 && (
        <Text className="text-label-secondary px-4 py-5 text-center text-sm">
          {t('food.review.noItems')}
        </Text>
      )}
      <ListRow
        title={t('food.review.addItem')}
        symbol="plus"
        onPress={add}
        chevron={false}
      />
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
  // Remounts via `key` when the value changes from outside (portion stepper, grams auto-scale)
  // so the field picks up the new number while in-progress typing stays untouched.
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
        onEndEditing={() => onChange(Number(text.replace(',', '.')) || 0)}
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
