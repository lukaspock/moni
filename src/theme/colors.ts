import { PlatformColor, useColorScheme } from 'react-native';

type ThemeColor = {
  asset: string;
  platform: string;
  light: string;
  dark: string;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const theme = require('../../theme.config.js') as {
  accent: ThemeColor;
  onAccent: ThemeColor;
  accentSoft: ThemeColor;
  bonus: ThemeColor;
  bonusSoft: ThemeColor;
  danger: ThemeColor;
  dangerSoft: ThemeColor;
  warning: ThemeColor;
  success: ThemeColor;
  protein: ThemeColor;
  proteinSoft: ThemeColor;
  carbs: ThemeColor;
  carbsSoft: ThemeColor;
  fat: ThemeColor;
  fatSoft: ThemeColor;
  bg: ThemeColor;
  surface: ThemeColor;
  surfaceRaised: ThemeColor;
  surfaceHigh: ThemeColor;
  separator: ThemeColor;
  border: ThemeColor;
  label: ThemeColor;
  labelSecondary: ThemeColor;
  labelTertiary: ThemeColor;
  foam: ThemeColor;
  fixed: Record<FixedColorName, string>;
};

export type FixedColorName =
  | 'lime'
  | 'limeHead'
  | 'limeStart'
  | 'limeMid'
  | 'limeGlow'
  | 'foam'
  | 'forestTop'
  | 'forestBot'
  | 'forest'
  | 'ink'
  | 'paper'
  | 'heroLabel'
  | 'heroLabel2'
  | 'heroTrack'
  | 'ember'
  | 'emberHead'
  | 'emberHot'
  | 'protein'
  | 'carbs'
  | 'fat'
  | 'danger';

export type ThemeColorName = Exclude<keyof typeof theme, 'fixed'>;

/**
 * Mode-independent colors for the always-dark hero block and Skia canvases
 * (plain strings, no PlatformColor).
 */
export const fixedColors = theme.fixed;

/** Old token name → current one (kept so older call sites don't break). */
export const THEME_ALIASES = {
  ember: 'bonus',
  spark: 'foam',
} as const;

/** Colorset name, e.g. `MoniSurface1` — what `PlatformColor` is given. */
export const platformColorName = (name: ThemeColorName): string =>
  theme[name].asset;

/** iOS semantic fallback color name (no colorset needed). */
export const fallbackPlatformColorName = (name: ThemeColorName): string =>
  theme[name].platform;

/**
 * `PlatformColor` handle for RN styles (auto Light/Dark) backed by the named
 * asset-catalog colorset. Needs a native build made after the colorsets were
 * generated (`npx expo prebuild`).
 */
export const themeColor = (name: ThemeColorName) =>
  PlatformColor(theme[name].asset);

/**
 * Concrete hex for the current color scheme — for Skia canvases, which can't
 * take PlatformColor (see CLAUDE.md "Skia" note).
 */
export function useThemeHex(name: ThemeColorName): string {
  const scheme = useColorScheme();
  return scheme === 'dark' ? theme[name].dark : theme[name].light;
}
