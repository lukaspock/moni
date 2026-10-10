import { useEffect, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pill } from '@/components/ui';
import { Celebration, Reveal } from '@/components/motion';
import { GlassButton } from '@/features/auth/components/GlassButton';
import {
  closeTrainingSetup,
  useSetupRoutineName,
  useTrainingSetupStore,
} from '@/features/workout/setup';
import { textStyles } from '@/theme/typography';

/** Step 4: routines are saved — light celebration, then back to the tab. */
export default function TrainingSetupDoneScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const routines = useTrainingSetupStore((s) => s.routines);
  const routineName = useSetupRoutineName();
  const saved = routines.filter((r) => r.exercises.length > 0);

  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCelebrate(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className="bg-bg flex-1 justify-between px-6"
      style={{
        paddingTop: insets.top + 56,
        paddingBottom: Math.max(insets.bottom, 16),
      }}
    >
      <Celebration
        kind="goalReached"
        trigger={celebrate}
        haptic="onboardResult"
        origin={{ x: width / 2, y: insets.top + 120 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="gap-4">
        <Reveal index={0}>
          <Text
            accessibilityRole="header"
            className="text-label font-display-black text-[34px] leading-[36px] tracking-tight"
          >
            {t('trainingSetup.done.title')}
          </Text>
        </Reveal>
        <Reveal index={1}>
          <Text className="text-label-secondary" style={textStyles.body}>
            {t('trainingSetup.done.subtitle', { count: saved.length })}
          </Text>
        </Reveal>
        <Reveal index={2}>
          <View className="flex-row flex-wrap gap-2">
            {saved.map((routine) => (
              <Pill key={routine.key} label={routineName(routine)} />
            ))}
          </View>
        </Reveal>
      </View>
      <GlassButton
        label={t('trainingSetup.done.cta')}
        onPress={closeTrainingSetup}
      />
    </View>
  );
}
