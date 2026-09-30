import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { DatePicker, Host } from '@expo/ui/swift-ui';

import {
  useAddWeight,
  useDeleteWeight,
  useUpdateWeight,
  useWeightEntries,
  useWeightInput,
} from '@/features/insights';
import { toISODate } from '@/lib/date';

/** Sheet for adding (no `id`) or editing (`id`) a weight entry. Several entries per day are allowed. */
export default function WeightEntrySheet() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { entries } = useWeightEntries();
  const { parseToKg, toDisplay, unitLabelKey } = useWeightInput();
  const add = useAddWeight();
  const update = useUpdateWeight();
  const remove = useDeleteWeight();

  const existing = id ? entries.find((e) => e.id === id) : undefined;
  const latest = entries.length > 0 ? entries[entries.length - 1] : undefined;

  const [text, setText] = useState(() =>
    existing
      ? String(toDisplay(existing.weightKg))
      : latest
        ? String(toDisplay(latest.weightKg))
        : '',
  );
  const [date, setDate] = useState(existing?.date ?? toISODate());
  const [error, setError] = useState<string | null>(null);
  const busy = add.isPending || update.isPending || remove.isPending;
  const isEdit = !!id;

  async function save() {
    const kg = parseToKg(text);
    if (kg === null) {
      setError(t('insights.entry.invalid'));
      return;
    }
    setError(null);
    try {
      if (isEdit && id) await update.mutateAsync({ id, weightKg: kg, date });
      else await add.mutateAsync({ weightKg: kg, date });
    } catch {
      setError(t('insights.entry.error'));
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  function confirmDelete() {
    if (!id) return;
    Alert.alert(
      t('insights.entry.deleteConfirmTitle'),
      t('insights.entry.deleteConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('insights.entry.delete'),
          style: 'destructive',
          onPress: () => {
            remove.mutate(id, {
              onSuccess: () => router.back(),
              onError: () => setError(t('insights.entry.error')),
            });
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      className="bg-system-grouped-background flex-1"
      contentContainerClassName="gap-5 p-5"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-label text-xl font-bold">
        {isEdit ? t('insights.entry.titleEdit') : t('insights.entry.titleNew')}
      </Text>

      <View className="gap-2">
        <Text className="text-secondary-label text-sm">
          {t('insights.entry.weightLabel', { unit: t(unitLabelKey) })}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder={t('insights.entry.weightPlaceholder')}
          autoFocus={!isEdit}
          selectTextOnFocus
          accessibilityLabel={t('insights.entry.weightLabel', {
            unit: t(unitLabelKey),
          })}
          className="bg-secondary-system-grouped-background text-label rounded-xl px-4 py-3 text-2xl font-semibold"
        />
        {error && <Text className="text-destructive text-sm">{error}</Text>}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-label text-base">{t('insights.entry.date')}</Text>
        <Host matchContents>
          <DatePicker
            selection={new Date(`${date}T12:00:00`)}
            displayedComponents={['date']}
            range={{ end: new Date() }}
            onDateChange={(d) => setDate(toISODate(d))}
          />
        </Host>
      </View>

      <Pressable
        onPress={() => void save()}
        disabled={busy}
        accessibilityRole="button"
        className="bg-tint items-center rounded-2xl py-3.5 active:opacity-80"
        style={{ opacity: busy ? 0.6 : 1 }}
      >
        <Text className="text-base font-semibold text-white">
          {t('insights.entry.save')}
        </Text>
      </Pressable>

      {isEdit && (
        <Pressable
          onPress={confirmDelete}
          disabled={busy}
          accessibilityRole="button"
          className="items-center py-2"
        >
          <Text className="text-destructive text-base">
            {t('insights.entry.delete')}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
