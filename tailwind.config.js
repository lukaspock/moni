/**
 * iOS semantic colors, exposed as NativeWind tokens.
 * This mirrors React Native's `PlatformColor(name)` on iOS — a
 * `{ semantic: [name] }` opaque color object — so these tokens adapt
 * automatically to Light/Dark Mode and Liquid Glass tinting, without
 * hardcoding hex values for chrome/system UI. See PLAN.md §2 ("Farben").
 *
 * We can't `require('react-native')` here: `tailwind.config.js` is loaded
 * by Metro's config step with plain Node (no Babel/Flow transform), and
 * react-native's entry point uses Flow syntax that only Metro can parse.
 * `PlatformColor`'s iOS implementation is just this object literal
 * (react-native/Libraries/StyleSheet/PlatformColorValueTypes.ios.js), so we
 * reproduce it directly instead of importing the package.
 */
const ios = (name) => ({ semantic: [name] });

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        label: ios('label'),
        'secondary-label': ios('secondaryLabel'),
        'tertiary-label': ios('tertiaryLabel'),
        'system-background': ios('systemBackground'),
        'secondary-system-background': ios('secondarySystemBackground'),
        'system-grouped-background': ios('systemGroupedBackground'),
        'secondary-system-grouped-background': ios(
          'secondarySystemGroupedBackground',
        ),
        separator: ios('separator'),
        'opaque-separator': ios('opaqueSeparator'),
        tint: ios('link'),
        destructive: ios('systemRed'),
      },
    },
  },
  plugins: [],
};
