import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';

import { PressableScale } from '@/components/motion';
import { useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { useQuickCapture } from './useQuickCapture';

const HEIGHT = 54;

function RoundButton({
  symbol,
  label,
  onPress,
}: {
  symbol: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
}) {
  const accent = useThemeHex('accent');
  return (
    <PressableScale
      onPress={onPress}
      preset="subtle"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        className="bg-tint-soft items-center justify-center"
        style={{
          width: HEIGHT,
          height: HEIGHT,
          borderRadius: HEIGHT / 2,
          borderCurve: 'continuous',
        }}
      >
        <SymbolView
          name={symbol}
          size={21}
          weight="semibold"
          tintColor={accent}
        />
      </View>
    </PressableScale>
  );
}

/**
 * The one capture surface on Today: a wide photo "+" (møni camera), voice,
 * and "more" (the log sheet: describe, barcode, label, regulars, manual).
 */
export const CaptureRow = memo(function CaptureRow({ date }: { date: string }) {
  const { t } = useTranslation();
  const capture = useQuickCapture(date);
  const onAccent = useThemeHex('onAccent');

  return (
    <View className="flex-row items-center gap-2">
      <PressableScale
        onPress={capture.photo}
        preset="subtle"
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel={t('identity.today.quickPhoto')}
        style={{ flex: 1 }}
      >
        <View
          className="bg-tint flex-row items-center justify-center gap-2"
          style={{
            height: HEIGHT,
            borderRadius: HEIGHT / 2,
            borderCurve: 'continuous',
          }}
        >
          <SymbolView
            name="plus"
            size={22}
            weight="bold"
            tintColor={onAccent}
          />
          <Text
            className="text-on-tint"
            style={textStyles.button}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {t('identity.today.capture')}
          </Text>
        </View>
      </PressableScale>
      <RoundButton
        symbol="mic.fill"
        label={t('food.voice.tile')}
        onPress={() =>
          router.push({ pathname: '/voice-log', params: { date } })
        }
      />
      <RoundButton
        symbol="ellipsis"
        label={t('identity.today.captureMore')}
        onPress={() => router.push({ pathname: '/log-food', params: { date } })}
      />
    </View>
  );
});
