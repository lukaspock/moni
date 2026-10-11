import { useCallback, useState } from 'react';
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

/** Whether the care hint was dismissed for `today` (device-local, MMKV). */
export function useCareDismissal(today: string): {
  dismissed: boolean;
  dismiss: () => void;
} {
  const [day, setDay] = useState(() => dismissedOn());
  const dismiss = useCallback(() => {
    try {
      storage.set(KEY, today);
    } catch {
      // ignore
    }
    setDay(today);
  }, [today]);
  return { dismissed: day === today, dismiss };
}

/** Calm care hint (smart slot); dismissible for the rest of the day. */
export function CareCard({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();
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
        onPress={onDismiss}
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
