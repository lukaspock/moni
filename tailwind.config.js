/**
 * iOS semantic colors as NativeWind tokens via NativeWind's `platformColor()`
 * (compiles to React Native's `PlatformColor(name)`), so they adapt to
 * Light/Dark Mode and Liquid Glass tinting automatically. See PLAN.md §2.
 * Note: a hand-built `{ semantic: [...] }` object does NOT work here —
 * NativeWind needs its own helper to emit PlatformColor at runtime.
 */
const { platformColor } = require('nativewind/theme');

const ios = (name) => platformColor(name);
const brand = require('./theme.config.js');

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
        tint: ios(brand.accent.platform),
        bonus: ios(brand.bonus.platform),
        destructive: ios(brand.danger.platform),
      },
    },
  },
  plugins: [],
};
