/**
 * Single source of truth for møni's brand colors.
 * Change the accent HERE and everything follows: NativeWind `tint` token
 * (tailwind.config.js), native tab bar tint, Skia charts (src/theme/colors.ts).
 *
 * `platform` is an iOS semantic color name (adapts to Light/Dark Mode
 * automatically via PlatformColor). `light`/`dark` are the matching hex
 * values for places that can't take PlatformColor (Skia canvases).
 * Plain CommonJS so tailwind.config.js (Node) can require it too.
 */
module.exports = {
  accent: {
    platform: 'systemMint',
    light: '#00C8B3',
    dark: '#00DAC3',
  },
  /** Workout bonus segment in the kcal ring — must stay distinguishable from the accent. */
  bonus: {
    platform: 'systemOrange',
    light: '#FF8D28',
    dark: '#FF9230',
  },
  danger: {
    platform: 'systemRed',
    light: '#FF383C',
    dark: '#FF4245',
  },
};
