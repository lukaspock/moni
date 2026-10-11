import { Host, Picker, Slider, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type { ActivityLevel, Goal } from '@/domain';
import { roundTo } from '@/domain';
import { useSession } from '@/features/auth';
import { GoalWeightRow } from '@/features/auth/components/GoalWeightRow';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { useUpdateProfile } from '@/features/auth/components/useUpdateProfile';
import { useDailyTargets, useProfile } from '@/features/targets';
import { toISODate } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { textStyles } from '@/theme/typography';

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-12 flex-row items-center justify-between px-4 py-3">
      <Text className="text-label flex-1 pr-3" style={textStyles.body}>
        {label}
      </Text>
      <Text className="text-label-secondary" style={textStyles.body}>
        {value}
      </Text>
    </View>
  );
}

/** Goals & plan: today's targets, goal + rate + goal weight, activity level, training days. */
export default function ProfileGoalsScreen() {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { profile, isLoading } = useProfile();
  const { targets } = useDailyTargets(toISODate());
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();

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

  async function toggleWeekday(day: number, current: number[]) {
    haptic.select();
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
      <View className="bg-bg flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="px-4 pb-32 pt-1"
      keyboardShouldPersistTaps="handled"
    >
      <SettingsGroup title={t('account.profile.todayTargets')}>
        <ValueRow
          label={
            targets?.isTrainingDay
              ? t('account.profile.trainingDayLimit')
              : t('account.profile.restDayLimit')
          }
          value={targets ? `${Math.round(targets.totalKcal)} kcal` : '—'}
        />
        {targets ? (
          <ValueRow
            label={t('account.onboarding.result.protein')}
            value={`${Math.round(targets.proteinG)} g`}
          />
        ) : null}
      </SettingsGroup>

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
            <Text className="text-label" style={textStyles.body}>
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
        <GoalWeightRow key={profile.id} profile={profile} />
      </SettingsGroup>

      <SettingsGroup title={t('account.profile.sections.activity')}>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label-secondary" style={textStyles.caption}>
            {t('account.profile.activityLevel')}
          </Text>
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
          <Text className="text-label-secondary" style={textStyles.caption}>
            {t('account.profile.trainingDays')}
          </Text>
          <View className="flex-row justify-between gap-2">
            {WEEKDAYS.map((day) => {
              const selected = trainingWeekdaysLocal.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleWeekday(day, trainingWeekdaysLocal)}
                  className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                    selected ? 'border-tint bg-tint' : 'border-line bg-bg'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${selected ? 'text-on-tint' : 'text-label'}`}
                  >
                    {weekdayLabels[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View className="gap-2 px-4 py-3">
          <Text className="text-label" style={textStyles.body}>
            {t('account.profile.eatBackFactor')}:{' '}
            {Math.round(profile.eat_back_factor * 100)}%
          </Text>
          <Text className="text-label-secondary" style={textStyles.caption}>
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
      </SettingsGroup>
    </ScrollView>
  );
}
