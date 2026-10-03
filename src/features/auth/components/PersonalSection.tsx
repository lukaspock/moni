import { Host, Picker, Text as UIText, Toggle } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TextInput, View } from 'react-native';

import {
  isAcceptableTargetWeight,
  kgToLb,
  lbToKg,
  roundTo,
  type Diet,
  type Motivation,
  type TrainingExperience,
} from '../../../domain';
import { supabase } from '../../../lib/supabase';
import { useMealReminders } from '../../notifications';
import type { Database } from '../../../types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const MOTIVATIONS: Motivation[] = ['health', 'look', 'performance', 'energy', 'confidence'];
const DIETS: Diet[] = ['omnivore', 'flexitarian', 'pescetarian', 'vegetarian', 'vegan'];
const EXPERIENCES: TrainingExperience[] = ['beginner', 'intermediate', 'advanced'];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3 bg-secondary-system-background px-4 py-2">
      <Text className="text-base text-label">{label}</Text>
      <View className="flex-shrink items-end">{children}</View>
    </View>
  );
}

function MenuPicker<T extends string>({
  value,
  options,
  labelFor,
  onChange,
}: {
  value: T | null;
  options: T[];
  labelFor: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <Host matchContents>
      <Picker
        selection={value ?? undefined}
        onSelectionChange={(v) => onChange(v as T)}
        modifiers={[pickerStyle('menu')]}
      >
        {options.map((o) => (
          <UIText key={o} modifiers={[tag(o)]}>
            {labelFor(o)}
          </UIText>
        ))}
      </Picker>
    </Host>
  );
}

/**
 * Profile tab "Personal" section (onboarding v2 data): name, motivation,
 * diet, training experience, goal weight + the device-local meal-reminder
 * switch. Self-contained (own writes + cache invalidation) so the profile
 * screen only renders `<PersonalSection profile={profile} />`.
 */
export function PersonalSection({ profile }: { profile: ProfileRow }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const reminders = useMealReminders();
  const isImperial = profile.unit_system === 'imperial';

  const [name, setName] = useState(profile.display_name ?? '');
  const [targetText, setTargetText] = useState(() =>
    profile.target_weight_kg != null
      ? String(roundTo(isImperial ? kgToLb(profile.target_weight_kg) : profile.target_weight_kg, 1))
      : '',
  );

  async function save(patch: ProfileUpdate) {
    const { error } = await supabase.from('profiles').update(patch).eq('id', profile.id);
    if (error) {
      Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
      return;
    }
    void Haptics.selectionAsync();
    void queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
  }

  function saveName() {
    const trimmed = name.trim().slice(0, 40);
    if (trimmed === (profile.display_name ?? '')) return;
    void save({ display_name: trimmed || null });
  }

  function saveTarget() {
    const raw = targetText.trim().replace(',', '.');
    if (raw === '') {
      if (profile.target_weight_kg != null) void save({ target_weight_kg: null });
      return;
    }
    const value = Number(raw);
    const kg = Number.isNaN(value) ? NaN : roundTo(isImperial ? lbToKg(value) : value, 1);
    if (!profile.height_cm || Number.isNaN(kg) || !isAcceptableTargetWeight(kg, profile.height_cm)) {
      Alert.alert(t('account.onboarding.targetWeight.warnTooLow'));
      setTargetText(
        profile.target_weight_kg != null
          ? String(roundTo(isImperial ? kgToLb(profile.target_weight_kg) : profile.target_weight_kg, 1))
          : '',
      );
      return;
    }
    if (kg !== profile.target_weight_kg) void save({ target_weight_kg: kg });
  }

  async function toggleReminders(value: boolean) {
    const enabled = await reminders.setEnabled(value);
    if (value && !enabled) Alert.alert(t('account.profile.personal.remindersDenied'));
  }

  const motivationLabels: Record<Motivation, string> = {
    health: t('account.onboarding.motivation.health'),
    look: t('account.onboarding.motivation.look'),
    performance: t('account.onboarding.motivation.performance'),
    energy: t('account.onboarding.motivation.energy'),
    confidence: t('account.onboarding.motivation.confidence'),
  };
  const dietLabels: Record<Diet, string> = {
    omnivore: t('account.onboarding.diet.omnivore'),
    flexitarian: t('account.onboarding.diet.flexitarian'),
    pescetarian: t('account.onboarding.diet.pescetarian'),
    vegetarian: t('account.onboarding.diet.vegetarian'),
    vegan: t('account.onboarding.diet.vegan'),
  };
  const experienceLabels: Record<TrainingExperience, string> = {
    beginner: t('account.onboarding.experience.beginner'),
    intermediate: t('account.onboarding.experience.intermediate'),
    advanced: t('account.onboarding.experience.advanced'),
  };

  return (
    <View>
      <Text className="px-1 pb-1 pt-5 text-sm font-semibold uppercase text-secondary-label">
        {t('account.profile.sections.personal')}
      </Text>
      <View className="gap-px overflow-hidden rounded-xl bg-secondary-system-background">
        <Row label={t('account.profile.personal.name')}>
          <TextInput
            value={name}
            onChangeText={setName}
            onEndEditing={saveName}
            placeholder={t('account.profile.personal.namePlaceholder')}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
            className="min-w-32 text-right text-base text-secondary-label"
          />
        </Row>
        <Row label={t('account.profile.personal.motivation')}>
          <MenuPicker
            value={(profile.motivation as Motivation | null) ?? null}
            options={MOTIVATIONS}
            labelFor={(v) => motivationLabels[v]}
            onChange={(v) => void save({ motivation: v })}
          />
        </Row>
        <Row label={t('account.profile.personal.diet')}>
          <MenuPicker
            value={(profile.diet as Diet | null) ?? null}
            options={DIETS}
            labelFor={(v) => dietLabels[v]}
            onChange={(v) => void save({ diet: v })}
          />
        </Row>
        <Row label={t('account.profile.personal.experience')}>
          <MenuPicker
            value={(profile.training_experience as TrainingExperience | null) ?? null}
            options={EXPERIENCES}
            labelFor={(v) => experienceLabels[v]}
            onChange={(v) => void save({ training_experience: v })}
          />
        </Row>
        <Row label={t('account.profile.personal.targetWeight')}>
          <View className="flex-row items-center gap-1">
            <TextInput
              value={targetText}
              onChangeText={setTargetText}
              onEndEditing={saveTarget}
              placeholder={t('account.profile.personal.notSet')}
              keyboardType="decimal-pad"
              className="min-w-20 text-right text-base text-secondary-label"
            />
            {targetText ? <Text className="text-base text-secondary-label">{isImperial ? 'lb' : 'kg'}</Text> : null}
          </View>
        </Row>
        <Row label={t('account.profile.personal.reminders')}>
          <Host matchContents>
            <Toggle isOn={reminders.enabled} onIsOnChange={(v) => void toggleReminders(v)} />
          </Host>
        </Row>
      </View>
    </View>
  );
}
