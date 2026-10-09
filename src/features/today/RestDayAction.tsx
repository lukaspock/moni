import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { PressableScale } from '@/components/motion';
import { Card } from '@/components/ui';
import { useLedger, useRhythm } from '@/features/rhythm';
import { haptic } from '@/lib/haptics';
import { textStyles } from '@/theme/typography';

/** Rest day card: "Rest day. That is part of it too." with a one-tap confirmation. */
export function RestDayAction() {
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
    </Card>
  );
}
