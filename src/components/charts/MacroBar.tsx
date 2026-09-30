import { PlatformColor, Text, View } from 'react-native';

import { themeColor } from '@/theme/colors';

export interface MacroBarProps {
  label: string;
  gramsEaten: number;
  gramsTarget: number;
  /** Protein is visually highlighted per PLAN §7.6. */
  highlighted?: boolean;
  /** `accent` follows the brand color in theme.config.js. */
  color?: 'accent' | 'orange' | 'purple';
}

const TINTS: Record<
  NonNullable<MacroBarProps['color']>,
  string | ReturnType<typeof PlatformColor>
> = {
  accent: themeColor('accent'),
  orange: PlatformColor('systemOrange'),
  purple: PlatformColor('systemPurple'),
};

/** One macro row: label, "Xg / Yg", and a filled progress bar. */
export function MacroBar({
  label,
  gramsEaten,
  gramsTarget,
  highlighted = false,
  color = 'accent',
}: MacroBarProps) {
  const fraction = gramsTarget > 0 ? Math.min(gramsEaten / gramsTarget, 1) : 0;
  const isOver = gramsTarget > 0 && gramsEaten > gramsTarget;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-baseline justify-between">
        <Text
          className={`text-label ${highlighted ? 'text-base font-semibold' : 'text-sm font-medium'}`}
        >
          {label}
        </Text>
        <Text className="text-secondary-label text-sm">
          {Math.round(gramsEaten)}g / {Math.round(gramsTarget)}g
        </Text>
      </View>
      <View className="bg-secondary-system-background h-2.5 overflow-hidden rounded-full">
        <View
          style={{
            width: `${fraction * 100}%`,
            backgroundColor: isOver ? themeColor('danger') : TINTS[color],
          }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
