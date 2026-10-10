import type { TextStyle } from 'react-native';

/**
 * Font family names exactly as registered with `useFonts` in app/_layout.tsx
 * (keys of the `@expo-google-fonts/bricolage-grotesque` exports). Same strings
 * as the `font-display*` Tailwind tokens. Display = brand, text/UI = SF Pro
 * (system font, i.e. no fontFamily set).
 */
export const fontFamily = {
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayBlack: 'BricolageGrotesque_800ExtraBold',
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Text style presets (Doc 02 §3.3). Custom-font styles never set `fontWeight`
 * (weight is baked into the family; setting it would fake-embolden on iOS).
 * Numeric styles carry tabular-nums. Sizes/line heights in pt.
 */
export const textStyles = {
  numericHero: {
    fontFamily: fontFamily.displayBlack,
    fontSize: 64,
    lineHeight: 60,
    letterSpacing: -1.5,
    fontVariant: tabular,
  },
  numericL: {
    fontFamily: fontFamily.displayBold,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.8,
    fontVariant: tabular,
  },
  numericM: {
    fontFamily: fontFamily.displayBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontVariant: tabular,
  },
  numericS: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
    fontVariant: tabular,
  },
  display: {
    fontFamily: fontFamily.displayBlack,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: fontFamily.displayBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  callout: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  caption: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: 0,
  },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
} as const satisfies Record<string, TextStyle>;

export type TextStyleName = keyof typeof textStyles;

/** Dynamic Type caps (Doc 02 §3.5). */
export const maxFontSizeMultiplier = {
  text: 1.4,
  title: 1.3,
  numeric: 1.15,
} as const;
