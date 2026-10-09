import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { useAddWeight, useWeightInput } from '@/features/insights';
import { haptic } from '@/lib/haptics';
import { useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

/** Inline weight entry (kg/lb by profile; the DB stores kg). */
export function WeightQuickLog({ onSaved }: { onSaved?: () => void }) {
  const { t } = useTranslation();
  const input = useWeightInput();
  const add = useAddWeight();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const placeholder = useThemeHex('labelTertiary');
  const unit = t(input.unitLabelKey);

  const save = () => {
    const kg = input.parseToKg(text);
    if (kg === null) {
      setError(t('insights.entry.invalid'));
      return;
    }
    setError(null);
    add.mutate(
      { weightKg: kg },
      {
        onSuccess: () => {
          haptic.weightLogged();
          setText('');
          onSaved?.();
        },
        onError: () => setError(t('identity.error.saveFailed')),
      },
    );
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3">
        <View className="bg-surface-raised h-12 flex-1 flex-row items-center rounded-2xl px-4">
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            placeholder={t('insights.entry.weightPlaceholder')}
            placeholderTextColor={placeholder}
            accessibilityLabel={t('insights.entry.weightLabel', { unit })}
            className="text-label flex-1"
            style={textStyles.body}
            maxFontSizeMultiplier={1.3}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <Text className="text-label-secondary" style={textStyles.callout}>
            {unit}
          </Text>
        </View>
        <PressableScale
          onPress={save}
          disabled={add.isPending}
          accessibilityLabel={t('identity.button.save')}
          className="bg-tint h-12 items-center justify-center rounded-2xl px-5"
        >
          <Text className="text-on-tint" style={textStyles.button}>
            {t('identity.button.save')}
          </Text>
        </PressableScale>
      </View>
      {error ? (
        <Text className="text-label-secondary" style={textStyles.caption}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
