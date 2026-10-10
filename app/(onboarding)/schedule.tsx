import { Host, Stepper } from '@expo/ui/swift-ui';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useOnboardingStore } from '@/features/auth';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { useOnboardingNavigation } from '@/features/auth/useOnboardingNavigation';
import { haptic } from '@/lib/haptics';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const draft = useOnboardingStore((s) => s.draft);
  const update = useOnboardingStore((s) => s.update);
  const { goNext } = useOnboardingNavigation('schedule');

  const targetCount = draft.workoutsPerWeek;

  function toggleWeekday(day: number) {
    haptic.select();
    const selected = draft.trainingWeekdays.includes(day);
    if (selected) {
      update({
        trainingWeekdays: draft.trainingWeekdays.filter((d) => d !== day),
      });
      return;
    }
    if (draft.trainingWeekdays.length >= targetCount) return; // cap at workoutsPerWeek
    update({ trainingWeekdays: [...draft.trainingWeekdays, day].sort() });
  }

  function onWorkoutsPerWeekChange(value: number) {
    // Trim any excess selected weekdays if the count was reduced.
    const trimmed = draft.trainingWeekdays.slice(0, value);
    update({ workoutsPerWeek: value, trainingWeekdays: trimmed });
  }

  const canContinue =
    targetCount === 0 || draft.trainingWeekdays.length === targetCount;

  const weekdayLabels: Record<number, string> = {
    0: t('account.onboarding.schedule.weekday.0'),
    1: t('account.onboarding.schedule.weekday.1'),
    2: t('account.onboarding.schedule.weekday.2'),
    3: t('account.onboarding.schedule.weekday.3'),
    4: t('account.onboarding.schedule.weekday.4'),
    5: t('account.onboarding.schedule.weekday.5'),
    6: t('account.onboarding.schedule.weekday.6'),
  };

  return (
    <OnboardingScreen
      title={t('account.onboarding.schedule.title')}
      subtitle={t('account.onboarding.schedule.subtitle')}
      continueLabel={t('account.common.continue')}
      continueDisabled={!canContinue}
      onContinue={() => goNext()}
    >
      <Host matchContents>
        <Stepper
          label={`${t('account.onboarding.schedule.workoutsPerWeekLabel')}: ${targetCount}`}
          value={targetCount}
          min={0}
          max={7}
          step={1}
          onValueChange={onWorkoutsPerWeekChange}
        />
      </Host>

      {targetCount > 0 ? (
        <View className="gap-2">
          <Text className="text-label-secondary text-sm font-medium">
            {t('account.onboarding.schedule.weekdaysLabel')}
          </Text>
          <View className="flex-row justify-between gap-2">
            {WEEKDAYS.map((day) => {
              const selected = draft.trainingWeekdays.includes(day);
              return (
                <Pressable
                  key={day}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleWeekday(day)}
                  className={`h-14 flex-1 items-center justify-center rounded-2xl border ${
                    selected ? 'border-tint bg-tint' : 'border-line bg-bg'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${selected ? 'text-on-tint' : 'text-label'}`}
                  >
                    {weekdayLabels[day]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </OnboardingScreen>
  );
}
