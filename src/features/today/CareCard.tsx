import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { PressableScale } from '@/components/motion';
import { Card } from '@/components/ui';
import { storage } from '@/lib/storage';
import { textStyles } from '@/theme/typography';

const KEY = 'today:careDismissed';

function dismissedOn(): string | null {
  try {
    return storage.getString(KEY) ?? null;
  } catch {
    return null;
  }
}

/** Calm care hint instead of the day sentence; dismissible for the rest of the day. */
export function CareCard({ today }: { today: string }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => dismissedOn() === today);
  if (hidden) return null;
  return (
    <Card variant="inset" className="gap-2 p-4">
      <Text
        className="text-label"
        style={textStyles.headline}
        maxFontSizeMultiplier={1.4}
      >
        {t('identity.care.title')}
      </Text>
      <Text
        className="text-label-secondary"
        style={textStyles.callout}
        maxFontSizeMultiplier={1.4}
      >
        {t('identity.care.body')}
      </Text>
      <PressableScale
        onPress={() => {
          try {
            storage.set(KEY, today);
          } catch {
            // ignore
          }
          setHidden(true);
        }}
        accessibilityLabel={t('identity.care.dismiss')}
        className="h-11 justify-center self-start"
      >
        <Text className="text-tint" style={textStyles.button}>
          {t('identity.care.dismiss')}
        </Text>
      </PressableScale>
    </Card>
  );
}
