import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Celebration, PressableScale } from '@/components/motion';
import { Card, IconTile } from '@/components/ui';
import type { AchievementId } from '@/domain';
import { useAchievements } from '@/features/rhythm';
import { textStyles } from '@/theme/typography';

import { achievementText } from './copy';

/**
 * At most one stamp moment per app open (throttle lives in `useAchievements`). Hidden while the
 * care signal is active (the hook withholds body stamps; `celebrate` is empty then).
 */
export function AchievementOverlay({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const ach = useAchievements();
  const [shown, setShown] = useState<AchievementId | null>(null);
  const latched = useRef(false);
  const next = enabled && ach.isReady ? (ach.celebrate[0]?.id ?? null) : null;

  useEffect(() => {
    if (!next || shown || latched.current) return;
    const id = setTimeout(() => {
      latched.current = true;
      setShown(next);
      ach.acknowledge([next]);
    }, 700);
    return () => clearTimeout(id);
    // acknowledge changes identity with local state; only react to a new candidate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, shown]);

  if (!shown) return null;
  const copy = achievementText(t, shown);
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 items-center justify-end px-5 pb-36"
    >
      <Celebration
        kind="goalReached"
        trigger
        origin={{ x: width / 2, y: 120 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }}
      />
      <Animated.View
        entering={FadeIn.duration(260)}
        exiting={FadeOut.duration(180)}
        className="w-full"
      >
        <Card variant="raised" className="gap-2">
          <View className="flex-row items-center gap-3">
            <IconTile symbol="rosette" tone="accent" />
            <View className="flex-1 gap-0.5">
              <Text
                className="text-label-secondary"
                style={textStyles.overline}
                maxFontSizeMultiplier={1.3}
              >
                {t('identity.today.newStamp')}
              </Text>
              <Text
                className="text-label"
                style={textStyles.headline}
                maxFontSizeMultiplier={1.4}
              >
                {copy.name}
              </Text>
            </View>
          </View>
          <Text
            className="text-label-secondary"
            style={textStyles.callout}
            maxFontSizeMultiplier={1.4}
          >
            {copy.celebrate}
          </Text>
          <PressableScale
            onPress={() => setShown(null)}
            accessibilityLabel={t('identity.button.done')}
            className="h-11 justify-center self-start"
          >
            <Text className="text-tint" style={textStyles.button}>
              {t('identity.button.done')}
            </Text>
          </PressableScale>
        </Card>
      </Animated.View>
    </View>
  );
}
