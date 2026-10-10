import { memo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { BrandIcon } from '@/components/brand';
import { PressableScale } from '@/components/motion';
import { haptic } from '@/lib/haptics';
import { themeColor, useThemeHex } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { useQuickCapture } from './useQuickCapture';

function Tile({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ expanded: active }}
      className="flex-1 items-center gap-1.5"
    >
      <View
        className={`h-14 w-full items-center justify-center ${
          active ? 'bg-tint' : 'bg-tint-soft'
        }`}
        style={{
          borderRadius: 20,
          borderCurve: 'continuous',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon}
      </View>
      <Text
        className="text-label"
        style={[textStyles.caption, { fontWeight: '600' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Five always-visible capture actions in one row: photo, describe (inline),
 * speak (voice sheet), barcode, nutrition label.
 */
export const QuickLogBar = memo(function QuickLogBar({
  date,
}: {
  date: string;
}) {
  const { t } = useTranslation();
  const capture = useQuickCapture(date);
  const accent = useThemeHex('accent');
  const onAccent = useThemeHex('onAccent');
  const placeholder = useThemeHex('labelTertiary');
  const [describing, setDescribing] = useState(false);
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim()) return;
    capture.text(value);
    setValue('');
    setDescribing(false);
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <Tile
          icon={<BrandIcon name="photoMeal" size={26} color={accent} />}
          label={t('food.logFood.photo')}
          disabled={capture.busy}
          onPress={() => void capture.photo()}
        />
        <Tile
          icon={
            <SymbolView
              name="text.bubble"
              size={24}
              weight="semibold"
              tintColor={describing ? onAccent : accent}
            />
          }
          label={t('food.logFood.describe')}
          active={describing}
          onPress={() => {
            haptic.tapLight();
            setDescribing((v) => !v);
          }}
        />
        <Tile
          icon={
            <SymbolView
              name="mic.fill"
              size={24}
              weight="semibold"
              tintColor={accent}
            />
          }
          label={t('food.voice.tile')}
          onPress={() =>
            router.push({ pathname: '/voice-log', params: { date } })
          }
        />
        <Tile
          icon={
            <SymbolView
              name="barcode.viewfinder"
              size={25}
              weight="semibold"
              tintColor={accent}
            />
          }
          label={t('food.logFood.barcode')}
          onPress={() => capture.scanner('barcode')}
        />
        <Tile
          icon={<BrandIcon name="scanLabel" size={25} color={accent} />}
          label={t('food.logFood.label')}
          onPress={() => capture.scanner('label')}
        />
      </View>
      {describing ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          className="bg-surface flex-row items-center gap-2 py-1.5 pl-4 pr-1.5"
          style={{ borderRadius: 22, borderCurve: 'continuous' }}
        >
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={t('food.logFood.describePlaceholder')}
            placeholderTextColor={placeholder}
            accessibilityLabel={t('food.logFood.describe')}
            returnKeyType="send"
            onSubmitEditing={submit}
            className="text-label flex-1"
            style={[textStyles.body, { minHeight: 40 }]}
            maxFontSizeMultiplier={1.3}
          />
          <Pressable
            onPress={submit}
            disabled={!value.trim()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('food.logFood.analyze')}
          >
            <SymbolView
              name="arrow.up.circle.fill"
              size={34}
              tintColor={
                value.trim()
                  ? themeColor('accent')
                  : themeColor('labelTertiary')
              }
            />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
});
