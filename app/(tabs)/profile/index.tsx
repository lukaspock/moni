import { Host, Picker, Slider, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type { ActivityLevel, Goal, UnitSystem } from '@/domain';
import { cmToFeetInches, roundTo } from '@/domain';
import { signOut, useSession } from '@/features/auth';
import { useHealthSettings } from '@/features/health';
import { PersonalSection } from '@/features/auth/components/PersonalSection';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { useDailyTargets, useProfile, type Profile } from '@/features/targets';
import { toISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import i18n, { fallbackLanguage, supportedLanguages } from '@/i18n';

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function Row({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className="min-h-12 flex-row items-center justify-between px-4 py-3"
    >
      <Text className="text-label text-base">{label}</Text>
      {value ? (
        <Text className="text-secondary-label text-base">{value}</Text>
      ) : null}
    </Wrapper>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { profile, isLoading } = useProfile();
  const { targets } = useDailyTargets(toISODate());
  const queryClient = useQueryClient();
  const { enabled: healthEnabled } = useHealthSettings();

  const isImperial = profile?.unit_system === 'imperial';

  async function updateProfile(patch: Partial<Profile>) {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    if (error) {
      Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  }

  async function toggleWeekday(day: number, current: number[]) {
    void Haptics.selectionAsync();
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();

    if (!userId) return;
    // Keep training_plan_days consistent with the plain weekday toggle: this
    // mirrors applyOnboardingDraft.ts's upsert/cleanup, kept lightweight here.
    if (current.includes(day)) {
      await supabase
        .from('training_plan_days')
        .delete()
        .eq('user_id', userId)
        .eq('weekday', day);
    } else {
      await supabase.from('training_plan_days').upsert(
        {
          user_id: userId,
          weekday: day,
          routine_id: null,
          expected_kcal: null,
        },
        { onConflict: 'user_id,weekday' },
      );
    }
    void queryClient.invalidateQueries({ queryKey: ['plannedDay'] });
    setTrainingWeekdaysLocal(next);
  }

  const [trainingWeekdaysLocal, setTrainingWeekdaysLocal] = useState<number[]>(
    [],
  );
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('training_plan_days')
      .select('weekday')
      .eq('user_id', userId)
      .then(({ data }) =>
        setTrainingWeekdaysLocal((data ?? []).map((r) => r.weekday)),
      );
  }, [userId]);

  function handleSignOut() {
    Alert.alert(
      t('account.profile.signOutConfirmTitle'),
      t('account.profile.signOutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.profile.signOut'),
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );
  }

  const weekdayLabels: Record<number, string> = {
    0: t('account.onboarding.schedule.weekday.0'),
    1: t('account.onboarding.schedule.weekday.1'),
    2: t('account.onboarding.schedule.weekday.2'),
    3: t('account.onboarding.schedule.weekday.3'),
    4: t('account.onboarding.schedule.weekday.4'),
    5: t('account.onboarding.schedule.weekday.5'),
    6: t('account.onboarding.schedule.weekday.6'),
  };

  if (isLoading || !profile) {
    return (
      <View className="bg-system-background flex-1 items-center justify-center">
        <ActivityIndicator />
        <Text className="text-secondary-label mt-3 text-base">
          {t('account.profile.loading')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-system-background flex-1"
      contentContainerClassName="px-4 pb-12"
    >
      {/* Today's target */}
      <SettingsGroup title={t('account.profile.todayTargets')}>
        <Row
          label={
            targets?.isTrainingDay
              ? t('account.profile.trainingDayLimit')
              : t('account.profile.restDayLimit')
          }
          value={targets ? `${Math.round(targets.totalKcal)} kcal` : '—'}
        />
        {targets ? (
          <Row
            label={t('account.onboarding.result.protein')}
            value={`${Math.round(targets.proteinG)} g`}
          />
        ) : null}
      </SettingsGroup>

      {/* Personal (onboarding v2: name, motivation, diet, experience, goal weight, reminders) */}
      <PersonalSection key={profile.id} profile={profile} />

      {/* Body / weight */}
      <SettingsGroup title={t('account.profile.sections.body')}>
        <Row
          label={t('account.profile.height')}
          value={
            !profile.height_cm
              ? '—'
              : isImperial
                ? `${cmToFeetInches(profile.height_cm).feet}' ${cmToFeetInches(profile.height_cm).inches}"`
                : `${profile.height_cm} cm`
          }
        />
        <Row
          label={t('account.profile.logWeight')}
          value={t('account.profile.logWeightCta')}
          onPress={() => router.push('/insights/weight-entry')}
        />
      </SettingsGroup>

      {/* Goal */}
      <SettingsGroup title={t('account.profile.sections.goals')}>
        <View className="px-4 py-3">
          <Host matchContents>
            <Picker
              selection={profile.goal ?? 'maintain'}
              onSelectionChange={(v) => updateProfile({ goal: v as Goal })}
              modifiers={[pickerStyle('segmented')]}
            >
              {GOALS.map((g) => (
                <UIText key={g} modifiers={[tag(g)]}>
                  {t(`account.onboarding.goal.${g}`)}
                </UIText>
              ))}
            </Picker>
          </Host>
        </View>
        {profile.goal && profile.goal !== 'maintain' ? (
          <View className="gap-2 px-4 py-3">
            <Text className="text-label text-base">
              {t('account.profile.goalRate')}:{' '}
              {t('account.onboarding.rate.perWeek', {
                value: roundTo(profile.goal_rate_kg_per_week ?? 0, 2),
              })}
            </Text>
            <Host style={{ width: '100%', height: 44 }}>
              <Slider
                value={Math.abs(profile.goal_rate_kg_per_week ?? 0.5)}
                min={0.1}
                max={1.0}
                step={0.05}
                onEditingChanged={(editing) => {
                  if (editing) return;
                }}
                onValueChange={(value) =>
                  updateProfile({
                    goal_rate_kg_per_week:
                      profile.goal === 'lose' ? -value : value,
                  })
                }
              />
            </Host>
          </View>
        ) : null}
      </SettingsGroup>

      {/* Activity & training */}
      <SettingsGroup title={t('account.profile.sections.activity')}>
        <View className="px-4 py-3">
          <Host matchContents>
            <Picker
              selection={profile.activity_level ?? 'moderate'}
              onSelectionChange={(v) =>
                updateProfile({ activity_level: v as ActivityLevel })
              }
              modifiers={[pickerStyle('segmented')]}
            >
              {ACTIVITY_LEVELS.map((level) => (
                <UIText key={level} modifiers={[tag(level)]}>
                  {t(`account.onboarding.activity.${level}`)}
                </UIText>
              ))}
            </Picker>
          </Host>
        </View>
        <View className="gap-2 px-4 py-3">
          <Text className="text-secondary-label text-sm font-medium">
            {t('account.profile.trainingDays')}
          </Text>
          <View className="flex-row justify-between gap-2">
            {WEEKDAYS.map((day) => {
              const selected = trainingWeekdaysLocal.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleWeekday(day, trainingWeekdaysLocal)}
                  className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                    selected
                      ? 'border-tint bg-tint'
                      : 'border-separator bg-system-background'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${selected ? 'text-system-background' : 'text-label'}`}
                  >
                    {weekdayLabels[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsGroup>

      {/* Preferences */}
      <SettingsGroup title={t('account.profile.sections.preferences')}>
        <View className="px-4 py-3">
          <Text className="text-secondary-label pb-2 text-sm font-medium">
            {t('account.profile.unitSystem')}
          </Text>
          <Host matchContents>
            <Picker
              selection={profile.unit_system}
              onSelectionChange={(v) =>
                updateProfile({ unit_system: v as UnitSystem })
              }
              modifiers={[pickerStyle('segmented')]}
            >
              <UIText modifiers={[tag('metric')]}>
                {t('account.onboarding.body.unitMetric')}
              </UIText>
              <UIText modifiers={[tag('imperial')]}>
                {t('account.onboarding.body.unitImperial')}
              </UIText>
            </Picker>
          </Host>
        </View>
        <View className="px-4 py-3">
          <Text className="text-secondary-label pb-2 text-sm font-medium">
            {t('account.profile.language')}
          </Text>
          <Host matchContents>
            <Picker
              selection={profile.locale ?? fallbackLanguage}
              onSelectionChange={(v) => {
                void i18n.changeLanguage(v);
                void updateProfile({ locale: v });
              }}
              modifiers={[pickerStyle('segmented')]}
            >
              {supportedLanguages.map((lang) => (
                <UIText key={lang} modifiers={[tag(lang)]}>
                  {lang.toUpperCase()}
                </UIText>
              ))}
            </Picker>
          </Host>
        </View>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label text-base">
            {t('account.profile.eatBackFactor')}:{' '}
            {Math.round(profile.eat_back_factor * 100)}%
          </Text>
          <Text className="text-secondary-label text-xs">
            {t('account.profile.eatBackFactorDescription')}
          </Text>
          <Host style={{ width: '100%', height: 44 }}>
            <Slider
              value={profile.eat_back_factor}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(value) =>
                updateProfile({ eat_back_factor: roundTo(value, 2) })
              }
            />
          </Host>
        </View>
        <Row
          label={t('health.settings.rowLabel')}
          value={
            healthEnabled
              ? t('health.settings.statusOn')
              : t('health.settings.statusOff')
          }
          onPress={() => router.push('/profile/health')}
        />
      </SettingsGroup>

      {/* Account */}
      <SettingsGroup title={t('account.profile.sections.account')}>
        <Pressable
          onPress={handleSignOut}
          className="min-h-12 items-center justify-center px-4 py-3"
        >
          <Text className="text-destructive text-base font-semibold">
            {t('account.profile.signOut')}
          </Text>
        </Pressable>
      </SettingsGroup>
    </ScrollView>
  );
}
