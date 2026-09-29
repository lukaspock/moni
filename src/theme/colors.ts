import { PlatformColor, useColorScheme } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const theme = require('../../theme.config.js') as {
  accent: ThemeColor;
  bonus: ThemeColor;
  danger: ThemeColor;
};

type ThemeColor = { platform: string; light: string; dark: string };
export type ThemeColorName = keyof typeof theme;

/** iOS semantic color name, e.g. for `SymbolView tintColor` or `PlatformColor(...)`. */
export const platformColorName = (name: ThemeColorName): string => theme[name].platform;

/** `PlatformColor` handle for RN styles (auto Light/Dark). */
export const themeColor = (name: ThemeColorName) => PlatformColor(theme[name].platform);

/**
 * Concrete hex for the current color scheme — for Skia canvases, which can't
 * take PlatformColor (see CLAUDE.md "Skia" note).
 */
export function useThemeHex(name: ThemeColorName): string {
  const scheme = useColorScheme();
  return scheme === 'dark' ? theme[name].dark : theme[name].light;
}
