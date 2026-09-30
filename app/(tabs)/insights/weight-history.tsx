import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useDeleteWeight, useWeightEntries, useWeightInput, type WeightEntry } from '@/features/insights';
import { themeColor } from '@/theme/colors';

function sourceKey(source: string) {
  if (source === 'manual') return 'insights.history.sourceManual' as const;
  if (source === 'healthkit') return 'insights.history.sourceHealth' as const;
  return 'insights.history.sourceOther' as const;
}

/** All weight entries, newest first. Tap to edit; the trash button deletes after a confirmation. */
export default function WeightHistoryScreen() {
  const { t } = useTranslation();
  const { entries, isLoading } = useWeightEntries();
  const { toDisplay, unitLabelKey } = useWeightInput();
  const remove = useDeleteWeight();
  const data = [...entries].reverse();

  function confirmDelete(entry: WeightEntry) {
    Alert.alert(t('insights.entry.deleteConfirmTitle'), t('insights.entry.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('insights.entry.delete'), style: 'destructive', onPress: () => remove.mutate(entry.id) },
    ]);
  }

  return (
    <FlatList
      className="flex-1 bg-system-grouped-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-2 p-4"
      data={data}
      keyExtractor={(e) => e.id}
      ListEmptyComponent={
        isLoading ? null : <Text className="py-8 text-center text-secondary-label">{t('insights.history.empty')}</Text>
      }
      renderItem={({ item }) => (
        <View className="flex-row items-center rounded-xl bg-secondary-system-grouped-background px-4 py-3">
          <Pressable
            className="flex-1 gap-0.5"
            accessibilityRole="button"
            accessibilityLabel={t('insights.history.edit')}
            onPress={() => router.push({ pathname: '/insights/weight-entry', params: { id: item.id } })}
          >
            <Text className="text-lg font-semibold text-label">
              {toDisplay(item.weightKg)} {t(unitLabelKey)}
            </Text>
            <Text className="text-xs text-secondary-label">
              {new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {' · '}
              {t(sourceKey(item.source))}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => confirmDelete(item)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('insights.entry.delete')}
          >
            <SymbolView name="trash" size={18} tintColor={themeColor('danger')} />
          </Pressable>
        </View>
      )}
    />
  );
}
