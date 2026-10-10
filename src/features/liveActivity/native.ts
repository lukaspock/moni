/**
 * Lazy access to `expo-widgets` (Live Activities).
 *
 * `createLiveActivity()` instantiates a native shared object (and writes the
 * layout into the App Group) at call time, which throws when the native module
 * isn't in the binary (older dev client, Expo Go, jest). Same pattern as
 * `src/features/health/healthkit.ts`: everything goes through
 * `getWorkoutActivityFactory()`, which returns null when unavailable.
 */
import { Platform } from 'react-native';

import type { WorkoutActivityProps } from './types';

type ExpoWidgetsModule = typeof import('expo-widgets');
export type WorkoutActivityFactory =
  import('expo-widgets').LiveActivityFactory<WorkoutActivityProps>;
export type WorkoutActivityInstance =
  import('expo-widgets').LiveActivity<WorkoutActivityProps>;

/** Must match the `name` registered with the expo-widgets config plugin. */
export const WORKOUT_ACTIVITY_NAME = 'WorkoutActivity';

let cached: WorkoutActivityFactory | null | undefined;

/** Live Activities need iOS 16.2+ (ActivityKit content API). */
function iosVersionSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  const major = parseFloat(String(Platform.Version));
  return Number.isFinite(major) && major >= 16.2;
}

export function getWorkoutActivityFactory(): WorkoutActivityFactory | null {
  if (cached !== undefined) return cached;
  if (!iosVersionSupported()) {
    cached = null;
    return cached;
  }
  try {
    /* eslint-disable @typescript-eslint/no-require-imports -- deliberate lazy native load, see above */
    const widgets = require('expo-widgets') as ExpoWidgetsModule;
    const { WorkoutActivityLayout } =
      require('./WorkoutActivity') as typeof import('./WorkoutActivity');
    /* eslint-enable @typescript-eslint/no-require-imports */
    cached = widgets.createLiveActivity<WorkoutActivityProps>(
      WORKOUT_ACTIVITY_NAME,
      WorkoutActivityLayout,
    );
  } catch (err) {
    console.warn('[liveActivity] expo-widgets native module unavailable', err);
    cached = null;
  }
  return cached;
}
