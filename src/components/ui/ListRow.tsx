import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';
import type { Tone } from './tones';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** SF Symbol shown in a soft icon tile (40 x 40). Ignored when `leading` is set. */
  symbol?: SymbolViewProps['name'];
  iconTone?: Tone;
  /** Custom leading element (thumbnail 48 / radius 12, meal icon …). */
  leading?: ReactNode;
  /** Right-aligned value (Numeric-S), e.g. "520". */
  value?: string;
  /** Unit caption after the value, e.g. "kcal". */
  unit?: string;
  /** Custom trailing element (replaces value/unit). */
  trailing?: ReactNode;
  /** Shows a `chevron.right`. Defaults to true when `onPress` is set. */
  chevron?: boolean;
  onPress?: () => void;
  /** Hairline under the row, inset 68 to align with the text. Hide it on the last row of a group. */
  separator?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * List row (Doc 02 §5.4): min 60 pt, 16/12 padding, [icon] [title+sub] [value unit] [chevron].
 * Put rows inside `<Card className="gap-0 p-0 overflow-hidden">`; tapping gives the
 * row a spring press.
 */
export function ListRow({
  title,
  subtitle,
  symbol,
  iconTone = 'accent',
  leading,
  value,
  unit,
  trailing,
  chevron,
  onPress,
  separator = false,
  destructive = false,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const showChevron = chevron ?? onPress != null;
  const content = (
    <View className="min-h-[60px] flex-row items-center gap-3 px-4 py-2.5">
      {leading ??
        (symbol ? <IconTile symbol={symbol} tone={iconTone} /> : null)}
      <View className="flex-1 gap-0.5">
        <Text
          maxFontSizeMultiplier={1.4}
          className={destructive ? 'text-destructive' : 'text-label'}
          style={textStyles.headline}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            maxFontSizeMultiplier={1.4}
            className="text-label-secondary"
            style={textStyles.caption}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (value != null ? (
          <View className="flex-row items-baseline gap-1">
            <Text
              maxFontSizeMultiplier={1.15}
              className="text-label"
              style={textStyles.numericS}
            >
              {value}
            </Text>
            {unit ? (
              <Text className="text-label-secondary" style={textStyles.caption}>
                {unit}
              </Text>
            ) : null}
          </View>
        ) : null)}
      {showChevron ? (
        <SymbolView
          name="chevron.right"
          size={13}
          weight="bold"
          tintColor={themeColor('labelTertiary')}
        />
      ) : null}
    </View>
  );

  const hasLeading = leading != null || symbol != null;
  const sep = separator ? (
    <View
      className="bg-line"
      style={{
        height: StyleSheet.hairlineWidth,
        marginLeft: hasLeading ? 68 : 16,
      }}
    />
  ) : null;

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel}>
        {content}
        {sep}
      </View>
    );
  }
  return (
    <View>
      <PressableScale
        onPress={onPress}
        scaleTo={0.985}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
      >
        {content}
      </PressableScale>
      {sep}
    </View>
  );
}
