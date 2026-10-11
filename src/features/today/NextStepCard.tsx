import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { PressableScale } from '@/components/motion';
import { Card } from '@/components/ui';
import { SLOT_NEXT_STEP_KINDS, type NextStep } from '@/domain';
import { textStyles } from '@/theme/typography';

import { nextStepText } from './copy';
import { WeightQuickLog } from './WeightQuickLog';

/** The "next step" card (smart slot). Kinds without their own card render nothing. */
export function NextStepCard({
  step,
  onLogMeal,
  onStartWorkout,
}: {
  step: NextStep;
  onLogMeal: () => void;
  onStartWorkout: () => void;
}) {
  const { t } = useTranslation();
  const [weightOpen, setWeightOpen] = useState(false);
  // logging a meal is always one tap away in the capture row; no duplicate card
  const kind = step.kind;
  if (kind === 'none' || !SLOT_NEXT_STEP_KINDS.includes(kind)) return null;
  const copy = nextStepText(t, kind, step.mealType);
  const act = () => {
    if (step.kind === 'logWeight') setWeightOpen(true);
    else if (step.kind === 'startWorkout') onStartWorkout();
    else onLogMeal();
  };
  return (
    <Card variant="tinted" tone="accent" className="gap-3">
      <Text
        accessibilityRole="header"
        className="text-label"
        style={textStyles.headline}
        maxFontSizeMultiplier={1.4}
      >
        {copy.title}
      </Text>
      <Text
        className="text-label-secondary"
        style={textStyles.callout}
        maxFontSizeMultiplier={1.4}
      >
        {copy.body}
      </Text>
      {weightOpen ? (
        <WeightQuickLog onSaved={() => setWeightOpen(false)} />
      ) : (
        <PressableScale
          onPress={act}
          accessibilityLabel={copy.cta}
          className="bg-tint h-11 items-center justify-center self-start rounded-full px-5"
        >
          <Text className="text-on-tint" style={textStyles.button}>
            {copy.cta}
          </Text>
        </PressableScale>
      )}
    </Card>
  );
}
