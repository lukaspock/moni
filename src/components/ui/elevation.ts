import type { ViewStyle } from 'react-native';

import { fixedColors } from '@/theme/colors';

/**
 * Elevation presets (Doc 02 §4.3). Dark mode has no drop shadows (depth comes
 * from surface steps + hairline); light mode uses warm, soft shadows, never
 * black. The warm ink below is the only literal here: shadows need a concrete
 * color and no theme token exists for it.
 */
const WARM_INK = '#2B2416';

export type Elevation = 'flat' | 'raised' | 'hero' | 'overlay';

export function elevationStyle(
  level: Elevation,
  scheme: string | null | undefined,
): ViewStyle {
  const dark = scheme === 'dark';
  switch (level) {
    case 'flat':
      return {};
    case 'raised':
      return dark
        ? {}
        : {
            shadowColor: WARM_INK,
            shadowOpacity: 0.06,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          };
    case 'overlay':
      return dark
        ? {}
        : {
            shadowColor: WARM_INK,
            shadowOpacity: 0.1,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 12 },
          };
    case 'hero':
      return dark
        ? {
            shadowColor: fixedColors.lime,
            shadowOpacity: 0.12,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 12 },
          }
        : {
            shadowColor: fixedColors.forestBot,
            shadowOpacity: 0.28,
            shadowRadius: 32,
            shadowOffset: { width: 0, height: 16 },
          };
  }
}
