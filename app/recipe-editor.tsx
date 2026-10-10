import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import {
  RECIPE_MAX_SERVINGS,
  RECIPE_MIN_SERVINGS,
  clampServings,
  ingredientFromCatalog,
  perServing,
  recipeIngredientsFromItems,
  searchIngredientCatalog,
  sumRecipe,
  type IngredientCatalogEntry,
  type RecipeIngredient,
} from '@/domain';
import {
  useDeleteRecipe,
  useIngredientCatalog,
  useIngredientLookup,
  useRecipe,
  useSaveRecipe,
  type Recipe,
} from '@/features/food';
import { FieldInput } from '@/features/food/ui/FieldInput';
import { MacroLine } from '@/features/food/ui/MacroLine';
import {
  RecipeIngredientList,
  type EditableIngredient,
} from '@/features/food/ui/RecipeIngredientList';
import { RollingNumber } from '@/components/motion';
import {
  Card,
  GlassActionButton,
  ListRow,
  SectionHeader,
  SheetScreen,
} from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { themeColor } from '@/theme/colors';

/**
 * Create / edit an own dish (`?id=` edits). Register in app/_layout.tsx with
 * `FULL_SHEET_OPTIONS`. Ingredients are entered as whole-recipe amounts and saved per serving.
 */
export default function RecipeEditorScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === 'string' && params.id ? params.id : null;
  const { recipe, isLoading } = useRecipe(editId);

  if (editId && !recipe) {
    return (
      <SheetScreen title={t('food.recipe.editor.titleEdit')}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Text className="text-label-secondary text-center text-base">
            {t('food.recipe.editor.notFound')}
          </Text>
        )}
      </SheetScreen>
    );
  }

  return <RecipeForm key={recipe?.id ?? 'new'} recipe={recipe} />;
}

const withKey = (item: RecipeIngredient): EditableIngredient => ({
  ...item,
  key: Crypto.randomUUID(),
});

function RecipeForm({ recipe }: { recipe: Recipe | null }) {
  const { t } = useTranslation();
  const [id] = useState(() => recipe?.id ?? Crypto.randomUUID());
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [servings, setServings] = useState(recipe?.servings ?? 2);
  const [items, setItems] = useState<EditableIngredient[]>(() =>
    recipe
      ? recipeIngredientsFromItems(recipe.perServingItems, recipe.servings).map(
          withKey,
        )
      : [],
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [line, setLine] = useState('');
  const [lookupError, setLookupError] = useState<
    'ai_limit_reached' | 'generic' | null
  >(null);

  const { catalog } = useIngredientCatalog();
  const { lookup, isPending } = useIngredientLookup(catalog);
  const save = useSaveRecipe();
  const remove = useDeleteRecipe();

  const totals = sumRecipe(items);
  const portion = perServing(totals, servings);
  const suggestions = useMemo(
    () => (line.trim() ? searchIngredientCatalog(catalog, line, 5) : []),
    [catalog, line],
  );

  const addItems = (added: RecipeIngredient[]) => {
    if (added.length === 0) return;
    haptic.itemAdded();
    setItems((prev) => [...prev, ...added.map(withKey)]);
  };

  const submitLine = async () => {
    const text = line.trim();
    if (!text || isPending) return;
    setLookupError(null);
    const result = await lookup(text);
    if (result.ok) {
      setLine('');
      addItems(result.items);
    } else {
      haptic.aiFail();
      setLookupError(result.failure);
    }
  };

  const pickSuggestion = (entry: IngredientCatalogEntry) => {
    setLine('');
    setLookupError(null);
    addItems([ingredientFromCatalog(entry)]);
  };

  const addManual = () => {
    const row = withKey({
      name: line.trim(),
      grams: 100,
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
    haptic.itemAdded();
    setLine('');
    setLookupError(null);
    setItems((prev) => [...prev, row]);
    setOpenKey(row.key);
  };

  const stepServings = (direction: 1 | -1) => {
    haptic.select();
    setServings((s) => clampServings(s + direction));
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert(t('food.recipe.editor.nameMissing'));
      return;
    }
    const ingredients = items.filter((i) => i.name.trim() || i.kcal > 0);
    if (ingredients.length === 0) {
      Alert.alert(t('food.recipe.editor.ingredientsMissing'));
      return;
    }
    save.mutate(
      {
        id,
        title,
        servings,
        totalGrams: recipe?.totalGrams ?? null,
        ingredients: ingredients.map(({ key: _key, ...rest }) => rest),
      },
      {
        onSuccess: () => {
          haptic.mealSaved();
          router.back();
        },
        onError: () =>
          Alert.alert(
            t('food.recipe.editor.saveErrorTitle'),
            t('food.recipe.editor.saveError'),
          ),
      },
    );
  };

  const confirmDelete = () => {
    if (!recipe) return;
    Alert.alert(
      t('food.recipe.editor.deleteTitle'),
      t('food.recipe.editor.deleteBody'),
      [
        { text: t('food.recipe.editor.cancel'), style: 'cancel' },
        {
          text: t('food.recipe.editor.deleteConfirm'),
          style: 'destructive',
          onPress: () =>
            remove.mutate(recipe.id, {
              onSuccess: () => {
                haptic.mealDeleted();
                router.back();
              },
              onError: () =>
                Alert.alert(
                  t('food.recipe.editor.saveErrorTitle'),
                  t('food.recipe.editor.saveError'),
                ),
            }),
        },
      ],
    );
  };

  const kcalUnit = t('food.dashboard.kcalUnit');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-bg flex-1"
    >
      <SheetScreen
        title={
          recipe
            ? t('food.recipe.editor.titleEdit')
            : t('food.recipe.editor.titleNew')
        }
      >
        <FieldInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('food.recipe.editor.namePlaceholder')}
          accessibilityLabel={t('food.recipe.editor.namePlaceholder')}
          autoCapitalize="sentences"
          display
        />

        <Card variant="tinted" className="gap-4">
          <View className="flex-row gap-4">
            <View className="flex-1 gap-1">
              <Text
                className="text-label-secondary text-[13px] font-medium"
                maxFontSizeMultiplier={1.3}
              >
                {t('food.recipe.editor.perServing')}
              </Text>
              <View className="flex-row items-end gap-1.5">
                <RollingNumber
                  value={Math.round(portion.kcal)}
                  fontSize={36}
                  accessibilityLabel={`${t('food.recipe.editor.perServing')}: ${Math.round(portion.kcal)} ${kcalUnit}`}
                />
                <Text
                  className="text-label-secondary pb-1.5 text-[15px] font-medium"
                  maxFontSizeMultiplier={1.3}
                >
                  {kcalUnit}
                </Text>
              </View>
            </View>
            <View className="items-end gap-1">
              <Text
                className="text-label-secondary text-[13px] font-medium"
                maxFontSizeMultiplier={1.3}
              >
                {t('food.recipe.editor.total')}
              </Text>
              <View className="flex-row items-end gap-1.5">
                <RollingNumber
                  value={Math.round(totals.kcal)}
                  fontSize={22}
                  accessibilityLabel={`${t('food.recipe.editor.total')}: ${Math.round(totals.kcal)} ${kcalUnit}`}
                />
                <Text
                  className="text-label-secondary pb-0.5 text-[13px] font-medium"
                  maxFontSizeMultiplier={1.3}
                >
                  {kcalUnit}
                </Text>
              </View>
            </View>
          </View>
          <MacroLine
            proteinG={portion.proteinG}
            carbsG={portion.carbsG}
            fatG={portion.fatG}
          />
          {portion.grams > 0 && (
            <Text className="text-label-secondary text-[13px]">
              {t('food.recipe.editor.gramsPerServing', {
                grams: Math.round(portion.grams),
              })}
            </Text>
          )}
        </Card>

        <View className="gap-2">
          <SectionHeader title={t('food.recipe.editor.servings')} />
          <Card className="flex-row items-center justify-between">
            <StepButton
              symbol="minus"
              label={t('food.recipe.editor.servingsMinus')}
              disabled={servings <= RECIPE_MIN_SERVINGS}
              onPress={() => stepServings(-1)}
            />
            <Text
              className="text-label font-display-bold"
              style={{ fontSize: 28, fontVariant: ['tabular-nums'] }}
              accessibilityLabel={t('food.recipe.editor.servingsValue', {
                count: servings,
              })}
              maxFontSizeMultiplier={1.2}
            >
              {servings}
            </Text>
            <StepButton
              symbol="plus"
              label={t('food.recipe.editor.servingsPlus')}
              disabled={servings >= RECIPE_MAX_SERVINGS}
              onPress={() => stepServings(1)}
            />
          </Card>
        </View>

        <View className="gap-2">
          <SectionHeader title={t('food.recipe.editor.ingredients')} />
          <RecipeIngredientList
            items={items}
            openKey={openKey}
            onOpenKeyChange={setOpenKey}
            onChange={(key, patch) =>
              setItems((prev) =>
                prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
              )
            }
            onRemove={(key) =>
              setItems((prev) => prev.filter((i) => i.key !== key))
            }
          />
          <FieldInput
            value={line}
            onChangeText={(v) => {
              setLine(v);
              setLookupError(null);
            }}
            placeholder={t('food.recipe.editor.addPlaceholder')}
            accessibilityLabel={t('food.recipe.editor.addA11y')}
            returnKeyType="done"
            onSubmitEditing={() => void submitLine()}
            trailing={
              isPending ? (
                <ActivityIndicator
                  accessibilityLabel={t('food.recipe.editor.analyzing')}
                />
              ) : line.trim() ? (
                <Pressable
                  onPress={() => void submitLine()}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('food.recipe.editor.addA11y')}
                >
                  <SymbolView
                    name="arrow.up.circle.fill"
                    size={32}
                    tintColor={themeColor('accent')}
                  />
                </Pressable>
              ) : null
            }
          />
          <Text className="text-label-secondary px-1 text-[13px]">
            {lookupError === 'ai_limit_reached'
              ? t('food.recipe.editor.limitReached')
              : lookupError === 'generic'
                ? t('food.recipe.editor.analyzeError')
                : t('food.recipe.editor.addHint')}
          </Text>

          {suggestions.length > 0 && (
            <View className="gap-2 pt-1">
              <SectionHeader title={t('food.recipe.editor.fromHistory')} />
              <Card className="gap-0 overflow-hidden p-0">
                {suggestions.map((entry, index) => (
                  <ListRow
                    key={entry.name}
                    title={entry.name}
                    subtitle={t('food.recipe.editor.historyItem', {
                      grams: Math.round(entry.grams),
                      kcal: Math.round(ingredientFromCatalog(entry).kcal),
                    })}
                    symbol="clock.arrow.circlepath"
                    chevron={false}
                    separator={index < suggestions.length - 1}
                    onPress={() => pickSuggestion(entry)}
                  />
                ))}
              </Card>
            </View>
          )}

          <Card className="gap-0 overflow-hidden p-0">
            <ListRow
              title={t('food.recipe.editor.manual')}
              symbol="square.and.pencil"
              chevron={false}
              onPress={addManual}
            />
          </Card>
        </View>

        <GlassActionButton
          label={t('food.recipe.editor.save')}
          symbol="checkmark"
          disabled={save.isPending}
          onPress={handleSave}
        />

        {recipe && (
          <Pressable
            onPress={confirmDelete}
            disabled={remove.isPending}
            className="items-center py-2"
            accessibilityRole="button"
          >
            <Text className="text-destructive text-base font-medium">
              {t('food.recipe.editor.delete')}
            </Text>
          </Pressable>
        )}
      </SheetScreen>
    </KeyboardAvoidingView>
  );
}

function StepButton({
  symbol,
  label,
  disabled,
  onPress,
}: {
  symbol: 'plus' | 'minus';
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      className="bg-surface-raised h-11 w-11 items-center justify-center rounded-full"
      style={{ opacity: disabled ? 0.4 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SymbolView name={symbol} size={18} tintColor={themeColor('label')} />
    </Pressable>
  );
}
