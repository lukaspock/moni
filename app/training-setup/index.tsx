import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';

import type { TrainingSetting } from '@/domain/routineTemplates';
import { OnboardingScreen } from '@/features/auth/components/OnboardingScreen';
import {
  OptionCard,
  type SFSymbol,
} from '@/features/auth/components/OptionCard';
import {
  useAdvanceSoon,
  useTrainingSetupStore,
} from '@/features/workout/setup';

const NEXT: Href = '/training-setup/frequency' as Href;

/** Step 1: where do you train? Auto-advances on selection. */
export default function TrainingSetupSettingScreen() {
  const { t } = useTranslation();
  const setting = useTrainingSetupStore((s) => s.setting);
  const setSetting = useTrainingSetupStore((s) => s.setSetting);
  const advanceSoon = useAdvanceSoon();
  // Answer present on first render = user came back → offer an explicit Continue.
  const [hadAnswerOnMount] = useState(() => setting != null);

  const options: {
    value: TrainingSetting;
    label: string;
    description: string;
    symbol: SFSymbol;
  }[] = [
    {
      value: 'gym',
      label: t('trainingSetup.setting.gym'),
      description: t('trainingSetup.setting.gymDescription'),
      symbol: 'dumbbell.fill',
    },
    {
      value: 'home',
      label: t('trainingSetup.setting.home'),
      description: t('trainingSetup.setting.homeDescription'),
      symbol: 'house.fill',
    },
    {
      value: 'endurance',
      label: t('trainingSetup.setting.endurance'),
      description: t('trainingSetup.setting.enduranceDescription'),
      symbol: 'figure.run',
    },
  ];

  return (
    <OnboardingScreen
      title={t('trainingSetup.setting.title')}
      subtitle={t('trainingSetup.setting.subtitle')}
      continueLabel={hadAnswerOnMount ? t('trainingSetup.continue') : undefined}
      onContinue={() => router.push(NEXT)}
      continueDisabled={!setting}
      secondaryLabel={t('trainingSetup.buildOwn')}
      onSecondary={() => router.replace('/routine-editor')}
    >
      {options.map((option, index) => (
        <OptionCard
          key={option.value}
          index={index}
          label={option.label}
          description={option.description}
          symbol={option.symbol}
          selected={setting === option.value}
          onPress={() => {
            setSetting(option.value);
            advanceSoon(NEXT);
          }}
        />
      ))}
    </OnboardingScreen>
  );
}
