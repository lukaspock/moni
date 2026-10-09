import { Text, View } from 'react-native';

export type MacroKind = 'protein' | 'carbs' | 'fat';

const BG: Record<MacroKind, string> = {
  protein: 'bg-protein-soft',
  carbs: 'bg-carbs-soft',
  fat: 'bg-fat-soft',
};
const FG: Record<MacroKind, string> = {
  protein: 'text-protein',
  carbs: 'text-carbs',
  fat: 'text-fat',
};

export interface MacroMarkerProps {
  kind: MacroKind;
  /** The letter shown (localized initial, e.g. P / K / F). Color is never the only carrier. */
  letter: string;
  /** Protein highlight uses 24, default 20. */
  size?: number;
}

/** Letter badge that marks a macro (20 x 20, radius 6, soft fill, macro-color letter). */
export function MacroMarker({ kind, letter, size = 20 }: MacroMarkerProps) {
  return (
    <View
      accessible={false}
      className={`items-center justify-center ${BG[kind]}`}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        borderCurve: 'continuous',
      }}
    >
      <Text
        className={FG[kind]}
        maxFontSizeMultiplier={1.15}
        style={{ fontSize: size >= 24 ? 13 : 11, fontWeight: '700' }}
      >
        {letter}
      </Text>
    </View>
  );
}
