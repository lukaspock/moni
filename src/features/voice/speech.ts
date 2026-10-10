/**
 * Lazy access to `expo-speech-recognition`.
 *
 * The package calls `requireNativeModule('ExpoSpeechRecognition')` at import
 * time, which throws in a dev client built before the module was added, in
 * Expo Go and in jest. Everything goes through `getSpeechModule()`, which
 * returns null in that case — callers then behave as "voice unavailable".
 */
type SpeechPackage = typeof import('expo-speech-recognition');
export type SpeechModule = SpeechPackage['ExpoSpeechRecognitionModule'];

let cached: SpeechModule | null | undefined;

export function getSpeechModule(): SpeechModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy native load, see above
    const pkg = require('expo-speech-recognition') as SpeechPackage;
    cached = pkg.ExpoSpeechRecognitionModule ?? null;
  } catch (err) {
    console.warn('[voice] speech recognition native module unavailable', err);
    cached = null;
  }
  return cached;
}

/** Calls a synchronous capability check, `false` if it throws. */
export function safeCheck(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}
