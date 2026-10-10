import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { textStyles } from '@/theme/typography';

export interface ScreenTitleProps {
  title: string;
  /** Optional line under the title (greeting sentence, date …). */
  subtitle?: string;
  /** Optional right-hand slot (icon button, avatar …). */
  right?: ReactNode;
}

/**
 * Fixed tab title (top-left, S0 page background, no native header). Every tab
 * root renders this above its ScrollView and sets `headerShown: false`.
 */
export function ScreenTitle({ title, subtitle, right }: ScreenTitleProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-bg flex-row items-center gap-3 px-5 pb-2"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-1 gap-0.5">
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
          className="text-label"
          style={textStyles.display}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            maxFontSizeMultiplier={1.4}
            className="text-label-secondary"
            style={textStyles.callout}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
