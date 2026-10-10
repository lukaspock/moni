import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';

import {
  MAX_DAYS_PER_WEEK,
  MIN_DAYS_PER_WEEK,
  splitForDays,
  type TemplatePlan,
} from '@/domain/routineTemplates';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import { OptionCard } from '@/features/auth/components/OptionCard';
import { useExerciseCatalog } from '@/features/workout';
import {
  useAdvanceSoon,
  useSuggestedDaysPerWeek,
  useTrainingSetupStore,
} from '@/features/workout/setup';

const NEXT: Href = '/training-setup/proposal' as Href;

const DAY_OPTIONS = Array.from(
  { length: MAX_DAYS_PER_WEEK - MIN_DAYS_PER_WEEK + 1 },
  (_, i) => MIN_DAYS_PER_WEEK + i,
);

/** Step 2: how often per week? Preselected from onboarding / plan days. */
export default function TrainingSetupFrequencyScreen() {
  const { t } = useTranslation();
  const setting = useTrainingSetupStore((s) => s.setting) ?? 'gym';
  const daysPerWeek = useTrainingSetupStore((s) => s.daysPerWeek);
  const suggested = useSuggestedDaysPerWeek();
  const { exercises: catalog } = useExerciseCatalog();
  const advanceSoon = useAdvanceSoon();

  const selected = daysPerWeek ?? suggested;

  const splitLabel: Record<TemplatePlan['split'], string> = {
    fullBody: t('trainingSetup.frequency.splitFullBody'),
    upperLower: t('trainingSetup.frequency.splitUpperLower'),
    ppl: t('trainingSetup.frequency.splitPpl'),
    endurance: t('trainingSetup.frequency.splitEndurance'),
  };

  function choose(days: number) {
    const store = useTrainingSetupStore.getState();
    store.setDaysPerWeek(days);
    store.buildProposal(catalog);
  }

  return (
    <OnboardingScreen
      title={t('trainingSetup.frequency.title')}
      subtitle={t('trainingSetup.frequency.subtitle')}
      continueLabel={selected != null ? t('trainingSetup.continue') : undefined}
      onContinue={() => {
        if (selected == null) return;
        choose(selected);
        router.push(NEXT);
      }}
      continueDisabled={selected == null}
    >
      {DAY_OPTIONS.map((days, index) => (
        <OptionCard
          key={days}
          index={index}
          label={t('trainingSetup.frequency.option', { count: days })}
          description={splitLabel[splitForDays(setting, days)]}
          selected={selected === days}
          onPress={() => {
            choose(days);
            advanceSoon(NEXT);
          }}
        />
      ))}
    </OnboardingScreen>
  );
}
