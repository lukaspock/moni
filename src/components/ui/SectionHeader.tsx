import { Pressable, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { themeColor } from '@/theme/colors';
import { textStyles } from '@/theme/typography';

export type SectionMarker = 'accent' | 'bonus' | 'protein' | 'carbs' | 'fat';

export interface SectionHeaderProps {
  title: string;
  /** `overline` (default): small uppercase label. `title`: big area title, max one per screen. */
  variant?: 'overline' | 'title';
  /** 6 pt dot in a meaning color (macro / training sections only). */
  marker?: SectionMarker;
  /** Right-hand text link ("All" + chevron). Needs `onActionPress`. */
  actionLabel?: string;
  onActionPress?: () => void;
}

const MARKER_BG: Record<SectionMarker, string> = {
  accent: 'bg-tint',
  bonus: 'bg-bonus',
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
};

/** Label above a card/list (Doc 02 §5.2). Spacing to the card below (8) is up to the parent. */
export function SectionHeader({
  title,
  variant = 'overline',
  marker,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View className="min-h-[24px] flex-row items-center justify-between px-1">
      <View className="flex-1 flex-row items-center gap-2">
        {marker ? (
          <View className={`h-1.5 w-1.5 rounded-full ${MARKER_BG[marker]}`} />
        ) : null}
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={1.3}
          className={
            variant === 'title' ? 'text-label' : 'text-label-secondary'
          }
          style={variant === 'title' ? textStyles.title : textStyles.overline}
        >
          {title}
        </Text>
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="min-h-[44px] flex-row items-center justify-end gap-1"
          style={{ marginVertical: -10 }}
        >
          <Text
            className="text-tint"
            style={[textStyles.callout, { fontWeight: '600' }]}
          >
            {actionLabel}
          </Text>
          <SymbolView
            name="chevron.right"
            size={11}
            weight="bold"
            tintColor={themeColor('accent')}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
