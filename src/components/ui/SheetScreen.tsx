import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { textStyles } from '@/theme/typography';

export interface SheetScreenProps {
  title: string;
  /** Optional centered line under the title. */
  subtitle?: string;
  children: ReactNode;
}

/**
 * Body of every popup/sheet (Doc 02 §5.11): S0 background, centered Title-style
 * heading (+ optional subtitle), scrollable content, 20 pt padding/gap. Register
 * the route with `SHEET_OPTIONS`. Primary action belongs at the bottom.
 */
export function SheetScreen({ title, subtitle, children }: SheetScreenProps) {
  return (
    <ScrollView
      className="bg-bg flex-1"
      contentContainerClassName="gap-5 p-5 pt-5"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-1">
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
          className="text-label text-center"
          style={[textStyles.title, { fontSize: 22, lineHeight: 26 }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            maxFontSizeMultiplier={1.4}
            className="text-label-secondary text-center"
            style={textStyles.callout}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </ScrollView>
  );
}
