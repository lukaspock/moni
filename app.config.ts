import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'møni',
  slug: 'moeni',
  scheme: 'moeni',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  // SDK 57 dropped the legacy architecture, so `newArchEnabled` no longer
  // exists as a config field — the new architecture is always on.
  // iOS only (see PLAN.md §1) — no android/web config.
  ios: {
    bundleIdentifier: 'app.moeni',
    supportsTablet: false,
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-font',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '26.0',
        },
      },
    ],
    'expo-localization',
    './plugins/withSceneLifecycle',
    // Brand accent from theme.config.js → iOS AccentColor (default tint for native controls).
    './plugins/withAccentColor',
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'møni reads your workouts, active energy and body weight from Apple Health to adjust your daily calorie limit.',
        NSHealthUpdateUsageDescription:
          'møni saves your logged workouts and nutrition (calories and macros) to Apple Health.',
        // PLAN §7.5: import on app start/foreground only — no background delivery.
        background: false,
      },
    ],
    'expo-notifications',
    [
      'expo-camera',
      {
        cameraPermission:
          'møni uses the camera to photograph meals and scan barcodes.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'møni lets you pick a meal photo from your library.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
};

export default config;
