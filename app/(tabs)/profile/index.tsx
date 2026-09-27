import { Host, Picker, Slider, Text as UIText } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { ActivityLevel, Goal, UnitSystem } from '@/domain';
import { roundTo } from '@/domain';
import { signOut, useSession } from '@/features/auth';
import { useDailyTargets, useProfile, type Profile } from '@/features/targets';
import { toISODate } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import i18n, { fallbackLanguage, supportedLanguages } from '@/i18n';

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active'];
const GOALS: Goal[] = ['lose', 'maintain', 'gain'];
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function SectionHeader({ label }: { label: string }) {
  return <Text className="px-1 pb-1 pt-5 text-sm font-semibold uppercase text-secondary-label">{label}</Text>;
}

function SectionBody({ children }: { children: React.ReactNode }) {
  return <View className="gap-px overflow-hidden rounded-xl bg-secondary-system-background">{children}</View>;
}

function Row({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      className="min-h-12 flex-row items-center justify-between bg-secondary-system-background px-4 py-3"
    >
      <Text className="text-base text-label">{label}</Text>
      {value ? <Text className="text-base text-secondary-label">{value}</Text> : null}
    </Wrapper>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { userId } = useSession();
  const { profile, isLoading } = useProfile();
  const { targets } = useDailyTargets(toISODate());
  const queryClient = useQueryClient();

  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  async function updateProfile(patch: Partial<Profile>) {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    if (error) {
      Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  }

  async function toggleWeekday(day: number, current: number[]) {
    void Haptics.selectionAsync();
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();

    if (!userId) return;
    // Keep training_plan_days consistent with the plain weekday toggle: this
    // mirrors applyOnboardingDraft.ts's upsert/cleanup, kept lightweight here.
    if (current.includes(day)) {
      await supabase.from('training_plan_days').delete().eq('user_id', userId).eq('weekday', day);
    } else {
      await supabase.from('training_plan_days').upsert(
        { user_id: userId, weekday: day, routine_id: null, expected_kcal: null },
        { onConflict: 'user_id,weekday' },
      );
    }
    void queryClient.invalidateQueries({ queryKey: ['plannedDay'] });
    setTrainingWeekdaysLocal(next);
  }

  const [trainingWeekdaysLocal, setTrainingWeekdaysLocal] = useState<number[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('training_plan_days')
      .select('weekday')
      .eq('user_id', userId)
      .then(({ data }) => setTrainingWeekdaysLocal((data ?? []).map((r) => r.weekday)));
  }, [userId]);

  async function handleLogWeight() {
    const value = Number(weightInput.replace(',', '.'));
    if (!userId || !weightInput.trim() || Number.isNaN(value) || value <= 0) return;
    setSavingWeight(true);
    const today = toISODate();
    const { error } = await supabase
      .from('weight_logs')
      .upsert({ user_id: userId, date: today, weight_kg: value, source: 'manual' }, { onConflict: 'user_id,date' });
    setSavingWeight(false);
    if (error) {
      Alert.alert(t('account.auth.signIn.errors.generic'), error.message);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWeightInput('');
    void queryClient.invalidateQueries({ queryKey: ['latestWeight'] });
  }

  function handleSignOut() {
    Alert.alert(t('account.profile.signOutConfirmTitle'), t('account.profile.signOutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.profile.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
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
      <View className="flex-1 items-center justify-center bg-system-background">
        <ActivityIndicator />
        <Text className="mt-3 text-base text-secondary-label">{t('account.profile.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-system-background" contentContainerClassName="px-4 pb-12">
      {/* Today's target */}
      <SectionHeader label={t('account.profile.todayTargets')} />
      <SectionBody>
        <Row
          label={targets?.isTrainingDay ? t('account.profile.trainingDayLimit') : t('account.profile.restDayLimit')}
          value={targets ? `${Math.round(targets.totalKcal)} kcal` : '—'}
        />
        {targets ? (
          <Row label={t('account.onboarding.result.protein')} value={`${Math.round(targets.proteinG)} g`} />
        ) : null}
      </SectionBody>

      {/* Body / weight */}
      <SectionHeader label={t('account.profile.sections.body')} />
      <SectionBody>
        <Row label={t('account.profile.height')} value={profile.height_cm ? `${profile.height_cm} cm` : '—'} />
        <View className="flex-row items-center gap-3 bg-secondary-system-background px-4 py-3">
          <Text className="flex-1 text-base text-label">{t('account.profile.logWeight')}</Text>
          <TextInput
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder="kg"
            keyboardType="decimal-pad"
            className="h-10 w-24 rounded-lg border border-separator px-3 text-base text-label"
          />
          <Pressable
            disabled={savingWeight}
            onPress={handleLogWeight}
            className="h-10 items-center justify-center rounded-lg bg-tint px-3"
          >
            <Text className="text-sm font-semibold text-system-background">{t('account.profile.logWeightCta')}</Text>
          </Pressable>
        </View>
      </SectionBody>

      {/* Goal */}
      <SectionHeader label={t('account.profile.sections.goals')} />
      <SectionBody>
        <View className="bg-secondary-system-background px-4 py-3">
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
          <View className="gap-2 bg-secondary-system-background px-4 py-3">
            <Text className="text-base text-label">
              {t('account.profile.goalRate')}:{' '}
              {t('account.onboarding.rate.perWeek', { value: roundTo(profile.goal_rate_kg_per_week ?? 0, 2) })}
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
                  updateProfile({ goal_rate_kg_per_week: profile.goal === 'lose' ? -value : value })
                }
              />
            </Host>
          </View>
        ) : null}
      </SectionBody>

      {/* Activity & training */}
      <SectionHeader label={t('account.profile.sections.activity')} />
      <SectionBody>
        <View className="bg-secondary-system-background px-4 py-3">
          <Host matchContents>
            <Picker
              selection={profile.activity_level ?? 'moderate'}
              onSelectionChange={(v) => updateProfile({ activity_level: v as ActivityLevel })}
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
        <View className="gap-2 bg-secondary-system-background px-4 py-3">
          <Text className="text-sm font-medium text-secondary-label">{t('account.profile.trainingDays')}</Text>
          <View className="flex-row justify-between gap-2">
            {WEEKDAYS.map((day) => {
              const selected = trainingWeekdaysLocal.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() => toggleWeekday(day, trainingWeekdaysLocal)}
                  className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                    selected ? 'border-tint bg-tint' : 'border-separator bg-system-background'
                  }`}
                >
                  <Text className={`text-xs font-semibold ${selected ? 'text-system-background' : 'text-label'}`}>
                    {weekdayLabels[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SectionBody>

      {/* Preferences */}
      <SectionHeader label={t('account.profile.sections.preferences')} />
      <SectionBody>
        <View className="bg-secondary-system-background px-4 py-3">
          <Text className="pb-2 text-sm font-medium text-secondary-label">{t('account.profile.unitSystem')}</Text>
          <Host matchContents>
            <Picker
              selection={profile.unit_system}
              onSelectionChange={(v) => updateProfile({ unit_system: v as UnitSystem })}
              modifiers={[pickerStyle('segmented')]}
            >
              <UIText modifiers={[tag('metric')]}>{t('account.onboarding.body.unitMetric')}</UIText>
              <UIText modifiers={[tag('imperial')]}>{t('account.onboarding.body.unitImperial')}</UIText>
            </Picker>
          </Host>
        </View>
        <View className="bg-secondary-system-background px-4 py-3">
          <Text className="pb-2 text-sm font-medium text-secondary-label">{t('account.profile.language')}</Text>
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
        <View className="gap-2 bg-secondary-system-background px-4 py-3">
          <Text className="text-base text-label">
            {t('account.profile.eatBackFactor')}: {Math.round(profile.eat_back_factor * 100)}%
          </Text>
          <Text className="text-xs text-secondary-label">{t('account.profile.eatBackFactorDescription')}</Text>
          <Host style={{ width: '100%', height: 44 }}>
            <Slider
              value={profile.eat_back_factor}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(value) => updateProfile({ eat_back_factor: roundTo(value, 2) })}
            />
          </Host>
        </View>
      </SectionBody>

      {/* Account */}
      <SectionHeader label={t('account.profile.sections.account')} />
      <SectionBody>
        <Pressable onPress={handleSignOut} className="min-h-12 items-center justify-center bg-secondary-system-background px-4 py-3">
          <Text className="text-base font-semibold text-destructive">{t('account.profile.signOut')}</Text>
        </Pressable>
      </SectionBody>
    </ScrollView>
  );
}

