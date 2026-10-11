import { Host, Picker, Slider, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import type { ActivityLevel, Goal } from '@/domain';
import { roundTo, trainingDayCount } from '@/domain';
import { GoalWeightRow } from '@/features/auth/components/GoalWeightRow';
import { SettingsGroup } from '@/features/auth/components/SettingsGroup';
import { useUpdateProfile } from '@/features/auth/components/useUpdateProfile';
import { useDailyTargets, useProfile } from '@/features/targets';
import { useLegacyWeeklyPlan, useTrainingCycle } from '@/features/workout';
import { toISODate } from '@/lib/date';
import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

const ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];

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

/** Goals & plan: today's targets, goal + rate + goal weight, activity level, training plan (→ editor). */
export default function ProfileGoalsScreen() {
  const { t } = useTranslation();
  const { profile, isLoading } = useProfile();
  const { targets } = useDailyTargets(toISODate());
  const updateProfile = useUpdateProfile();

  const { cycle } = useTrainingCycle();
  const legacy = useLegacyWeeklyPlan(!cycle);
  const planDays = cycle ? cycle.length : 7;
  const planTrainingDays = cycle
    ? trainingDayCount(cycle.slots)
    : legacy.planByWeekday.size;
  const planSummary =
    planTrainingDays > 0
      ? t('trainingPlan.rowSubtitle', {
          count: planTrainingDays,
          days: planDays,
        })
      : t('trainingPlan.rowSubtitleNone');

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('trainingPlan.title')}, ${planSummary}`}
          onPress={() => router.push('/(tabs)/profile/training-plan')}
          className="min-h-12 flex-row items-center gap-3 px-4 py-3"
        >
          <View className="flex-1 gap-0.5">
            <Text className="text-label" style={textStyles.body}>
              {t('trainingPlan.title')}
            </Text>
            <Text className="text-label-secondary" style={textStyles.caption}>
              {planSummary}
            </Text>
          </View>
          <SymbolView
            name="chevron.right"
            size={13}
            weight="semibold"
            tintColor={themeColor('labelTertiary')}
          />
        </Pressable>
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
