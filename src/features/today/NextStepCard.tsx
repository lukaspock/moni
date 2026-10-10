import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { Card, SectionHeader } from '@/components/ui';
import type { NextStep } from '@/domain';

import { nextStepText } from './copy';
import { WeightQuickLog } from './WeightQuickLog';
import { textStyles } from '@/theme/typography';

/** The one "next step" card. `none` renders nothing (no filler). */
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
  if (step.kind === 'none') return null;
  // logging a meal is always one tap away in the quick-log bar; no duplicate card
  if (
    step.kind === 'closeDay' ||
    step.kind === 'weeklyReview' ||
    step.kind === 'logMeal'
  )
    return null;
  const copy = nextStepText(t, step.kind, step.mealType);
  const act = () => {
    if (step.kind === 'logWeight') setWeightOpen(true);
    else if (step.kind === 'startWorkout') onStartWorkout();
    else onLogMeal();
  };
  return (
    <View className="gap-2">
      <SectionHeader title={copy.title} />
      <Card variant="tinted" tone="accent">
        <Text
          className="text-label"
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
    </View>
  );
}
