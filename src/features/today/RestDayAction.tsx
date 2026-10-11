import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { Card } from '@/components/ui';
import { useLedger, useRhythm } from '@/features/rhythm';
import { haptic } from '@/lib/haptics';
import { textStyles } from '@/theme/typography';

export interface PlanSecondaryAction {
  label: string;
  onPress: () => void;
}

/**
 * Rest day card: "Rest day. That is part of it too." with a one-tap
 * confirmation, plus an optional quiet plan action ("Doch trainieren" /
 * "Rückgängig") from the training cycle.
 */
export function RestDayAction({
  secondary = null,
}: {
  secondary?: PlanSecondaryAction | null;
} = {}) {
  const { t } = useTranslation();
  const rhythm = useRhythm();
  const ledger = useLedger();
  const confirmed =
    ledger.days.find((d) => d.date === ledger.today)?.restConfirmed ?? false;
  return (
    <Card className="gap-2">
      <Text
        className="text-label"
        style={textStyles.headline}
        maxFontSizeMultiplier={1.4}
      >
        {t('food.dashboard.restDay')}
      </Text>
      <Text
        className="text-label-secondary"
        style={textStyles.callout}
        maxFontSizeMultiplier={1.4}
      >
        {confirmed
          ? t('identity.today.restDayDone')
          : t('identity.today.restDayBody')}
      </Text>
      {!confirmed || secondary ? (
        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
          {!confirmed ? (
            <PressableScale
              onPress={() => {
                haptic.select();
                rhythm.confirmRestDay();
              }}
              accessibilityLabel={t('identity.today.restDayCta')}
              className="bg-tint-soft h-11 items-center justify-center self-start rounded-full px-5"
            >
              <Text className="text-tint" style={textStyles.button}>
                {t('identity.today.restDayCta')}
              </Text>
            </PressableScale>
          ) : null}
          {secondary ? (
            <Pressable
              onPress={secondary.onPress}
              accessibilityRole="button"
              accessibilityLabel={secondary.label}
              hitSlop={6}
              className="h-11 justify-center"
            >
              <Text className="text-label-secondary" style={textStyles.button}>
                {secondary.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
