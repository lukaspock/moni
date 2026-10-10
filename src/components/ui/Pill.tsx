import { Text, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { themeColor } from '@/theme/colors';

import { TONE_COLOR, TONE_SOFT_BG, TONE_TEXT, type Tone } from './tones';

export interface PillProps {
  label: string;
  /** Meaning color, default `neutral`. e.g. `<Pill tone="bonus" label="+320 kcal" />`. */
  tone?: Tone;
  symbol?: SymbolViewProps['name'];
}

/** Small read-only status pill: 24 pt, soft fill + meaning-color text (Doc 02 §5.3). */
export function Pill({ label, tone = 'neutral', symbol }: PillProps) {
  return (
    <View
      className={`h-6 flex-row items-center gap-1 self-start rounded-full px-2.5 ${TONE_SOFT_BG[tone]}`}
    >
      {symbol ? (
        <SymbolView
          name={symbol}
          size={12}
          weight="bold"
          tintColor={themeColor(TONE_COLOR[tone])}
        />
      ) : null}
      <Text
        maxFontSizeMultiplier={1.3}
        className={`text-xs font-semibold ${TONE_TEXT[tone]}`}
      >
        {label}
      </Text>
    </View>
  );
}
