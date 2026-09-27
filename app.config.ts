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
