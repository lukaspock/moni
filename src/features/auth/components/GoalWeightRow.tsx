import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TextInput, View } from 'react-native';

import {
  isAcceptableTargetWeight,
  kgToLb,
  lbToKg,
  roundTo,
} from '../../../domain';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database';
import { haptic } from '@/lib/haptics';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

function displayValue(profile: ProfileRow, isImperial: boolean): string {
  if (profile.target_weight_kg == null) return '';
  return String(
    roundTo(
      isImperial ? kgToLb(profile.target_weight_kg) : profile.target_weight_kg,
      1,
    ),
  );
}

/**
 * Goal-weight row (free-text, kg or lb by unit system) for a `SettingsGroup`.
 * Validates against the BMI lower bound (`isAcceptableTargetWeight`) and
 * resets to the stored value when the input is rejected. Self-contained:
 * writes `profiles.target_weight_kg` and invalidates the profile query.
 */
export function GoalWeightRow({ profile }: { profile: ProfileRow }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isImperial = profile.unit_system === 'imperial';
  const [targetText, setTargetText] = useState(() =>
    displayValue(profile, isImperial),
  );

  async function save(targetWeightKg: number | null) {
    const { error } = await supabase
      .from('profiles')
      .update({ target_weight_kg: targetWeightKg })
      .eq('id', profile.id);
    if (error) {
      Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
      return;
    }
    haptic.select();
    void queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
  }

  function saveTarget() {
    const raw = targetText.trim().replace(',', '.');
    if (raw === '') {
      if (profile.target_weight_kg != null) void save(null);
      return;
    }
    const value = Number(raw);
    const kg = Number.isNaN(value)
      ? NaN
      : roundTo(isImperial ? lbToKg(value) : value, 1);
    if (
      !profile.height_cm ||
      Number.isNaN(kg) ||
      !isAcceptableTargetWeight(kg, profile.height_cm)
    ) {
      Alert.alert(t('account.onboarding.targetWeight.warnTooLow'));
      setTargetText(displayValue(profile, isImperial));
      return;
    }
    if (kg !== profile.target_weight_kg) void save(kg);
  }

  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3 px-4 py-2">
      <Text className="text-label text-base">
        {t('account.profile.personal.targetWeight')}
      </Text>
      <View className="flex-shrink flex-row items-center gap-1">
        <TextInput
          value={targetText}
          onChangeText={setTargetText}
          onEndEditing={saveTarget}
          placeholder={t('account.profile.personal.notSet')}
          keyboardType="decimal-pad"
          className="text-label-secondary min-w-20 text-right"
          // no lineHeight: on iOS a TextInput with lineHeight sits lower than the unit label
          style={{ fontSize: 16, paddingVertical: 0 }}
        />
        {targetText ? (
          <Text className="text-label-secondary text-base">
            {isImperial ? 'lb' : 'kg'}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
