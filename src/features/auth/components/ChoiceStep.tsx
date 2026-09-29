import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { OnboardingStep } from '../onboardingFlow';
import { useOnboardingNavigation } from '../useOnboardingNavigation';
import { OnboardingScreen } from './OnboardingScreen';
import { OptionCard, type SFSymbol } from './OptionCard';

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  symbol?: SFSymbol;
  emoji?: string;
};

/**
 * Single-choice onboarding step: big cards, selection haptic + pop, then
 * auto-advance after a short beat. When the user comes *back* to a step that
 * already has an answer, a Continue button is shown too (re-tapping the
 * current card also advances).
 */
export function ChoiceStep<T extends string>({
  step,
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: {
  step: OnboardingStep;
  title: string;
  subtitle?: string;
  options: ChoiceOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  const { t } = useTranslation();
  const { goNext, advanceSoon } = useOnboardingNavigation(step);
  // Answer present on first render = user navigated back here → offer an explicit Continue.
  const [hadAnswerOnMount] = useState(() => selected != null);

  return (
    <OnboardingScreen
      title={title}
      subtitle={subtitle}
      continueLabel={hadAnswerOnMount ? t('account.common.continue') : undefined}
      onContinue={() => goNext()}
      continueDisabled={!selected}
    >
      {options.map((option, index) => (
        <OptionCard
          key={option.value}
          index={index}
          label={option.label}
          description={option.description}
          symbol={option.symbol}
          emoji={option.emoji}
          selected={selected === option.value}
          onPress={() => {
            onSelect(option.value);
            advanceSoon();
          }}
        />
      ))}
    </OnboardingScreen>
  );
}
