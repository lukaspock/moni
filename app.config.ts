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
    // Icon Composer (Liquid Glass) icon; ./assets/icon.png is the flat fallback.
    icon: './assets/moni.icon',
    supportsTablet: false,
    // Device builds: set APPLE_TEAM_ID in your shell/.env (never commit a team id).
    ...(process.env.APPLE_TEAM_ID
      ? { appleTeamId: process.env.APPLE_TEAM_ID }
      : {}),
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
    // Must stay BEFORE 'expo-notifications' (mods run in reverse order) — see plugin header.
    './plugins/withoutPushEntitlement',
    'expo-notifications',
    // Workout Live Activity (src/features/liveActivity). Local updates only, no
    // push. Must stay AFTER withoutPushEntitlement: expo-widgets always writes
    // `aps-environment`, the earlier-registered plugin strips it again.
    // Needs the App Group (layout is handed to the extension through it).
    [
      'expo-widgets',
      {
        bundleIdentifier: 'app.moeni.widgets',
        groupIdentifier: 'group.app.moeni',
        enablePushNotifications: false,
        widgets: [],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'møni uses the camera to photograph meals and scan barcodes.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'møni uses the microphone so you can describe a meal by voice.',
        speechRecognitionPermission:
          'møni turns what you say into text to estimate a meal.',
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
        backgroundColor: '#F5F1E8',
        dark: {
          image: './assets/splash-icon-dark.png',
          backgroundColor: '#0C0F0D',
        },
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
