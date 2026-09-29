/**
 * Lazy access to `@kingstinct/react-native-healthkit` (v16, Nitro).
 *
 * The library creates its Nitro hybrid objects at import time, which throws
 * when the native module isn't in the binary (an older dev client built
 * before PR #6, Expo Go, jest). `src/features/health` is imported by the tab
 * layout and onboarding, so a top-level import could crash app start. Every
 * health call goes through `getHealthKit()` instead, which returns null when
 * the module can't be loaded — callers then behave as "Health unavailable".
 */
type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

let cached: HealthKitModule | null | undefined;

export function getHealthKit(): HealthKitModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy native load, see above
    cached = require('@kingstinct/react-native-healthkit') as HealthKitModule;
  } catch (err) {
    console.warn('[health] HealthKit native module unavailable', err);
    cached = null;
  }
  return cached;
}

/** HealthKit usable on this device + binary (synchronous). */
export function healthKitAvailable(): boolean {
  const hk = getHealthKit();
  if (!hk) return false;
  try {
    return hk.isHealthDataAvailable();
  } catch {
    return false;
  }
}

/** Bundle id HealthKit attributes møni's own samples to (loop prevention), or null. */
export function ownBundleId(): string | null {
  const hk = getHealthKit();
  if (!hk) return null;
  try {
    return hk.currentAppSource().bundleIdentifier ?? null;
  } catch {
    return null;
  }
}
