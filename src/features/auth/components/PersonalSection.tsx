import { Host, Picker, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TextInput, View } from 'react-native';

import {
  type Diet,
  type Motivation,
  type TrainingExperience,
} from '../../../domain';
import { supabase } from '../../../lib/supabase';
import { SettingsGroup } from './SettingsGroup';
import type { Database } from '../../../types/database';
import { haptic } from '@/lib/haptics';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

const MOTIVATIONS: Motivation[] = [
  'health',
  'look',
  'performance',
  'energy',
  'confidence',
];
const DIETS: Diet[] = [
  'omnivore',
  'flexitarian',
  'pescetarian',
  'vegetarian',
  'vegan',
];
const EXPERIENCES: TrainingExperience[] = [
  'beginner',
  'intermediate',
  'advanced',
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3 px-4 py-2">
      <Text className="text-label text-base">{label}</Text>
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
 * Profile "Personal" section (onboarding v2 data): name, motivation, diet,
 * training experience. Goal weight lives in `GoalWeightRow` (goals screen),
 * meal reminders in the notifications screen. Self-contained (own writes +
 * cache invalidation) so the screen only renders
 * `<PersonalSection profile={profile} />`.
 */
export function PersonalSection({ profile }: { profile: ProfileRow }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile.display_name ?? '');

  async function save(patch: ProfileUpdate) {
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', profile.id);
    if (error) {
      Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
      return;
    }
    haptic.select();
    void queryClient.invalidateQueries({ queryKey: ['profile', profile.id] });
  }

  function saveName() {
    const trimmed = name.trim().slice(0, 40);
    if (trimmed === (profile.display_name ?? '')) return;
    void save({ display_name: trimmed || null });
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
    <SettingsGroup title={t('account.profile.sections.personal')}>
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
          className="text-label-secondary min-w-32 text-right text-base"
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
          value={
            (profile.training_experience as TrainingExperience | null) ?? null
          }
          options={EXPERIENCES}
          labelFor={(v) => experienceLabels[v]}
          onChange={(v) => void save({ training_experience: v })}
        />
      </Row>
    </SettingsGroup>
  );
}
