import { View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

import { TONE_COLOR, TONE_SOFT_BG, type Tone } from './tones';

export interface IconTileProps {
  symbol: SymbolViewProps['name'];
  /** Default `accent`. */
  tone?: Tone;
  /** Container size, default 40 (radius 12, icon 20). */
  size?: number;
}

/** Soft-tinted icon container for list rows and option cards (Doc 02 §4.5). Decorative. */
export function IconTile({
  symbol,
  tone = 'accent',
  size = 40,
}: IconTileProps) {
  return (
    <View
      accessible={false}
      className={`items-center justify-center ${TONE_SOFT_BG[tone]}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        borderCurve: 'continuous',
      }}
    >
      <SymbolView
        name={symbol}
        size={Math.round(size / 2)}
        weight="semibold"
        type="hierarchical"
        tintColor={themeColor(TONE_COLOR[tone])}
      />
    </View>
  );
}
