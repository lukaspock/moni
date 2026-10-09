import * as Haptics from 'expo-haptics';
import { useCallback, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import {
  createHapticsEngine,
  HAPTIC_PATTERNS,
  type HapticEvent,
  type HapticPulse,
} from './hapticsEngine';
import { storage } from './storage';

/**
 * Central haptics wrapper — the ONLY module that imports `expo-haptics`
 * (existing direct calls get migrated in Wave 3). Usage: `haptic.mealSaved()`.
 * Fire-and-forget, never throws, no-op when the user switched haptics off
 * (Profile > Settings) or off iOS. Rules + event table: docs/identity/03 §4.
 */

const STORAGE_KEY = 'haptics:enabled';

const listeners = new Set<() => void>();

/** Device-local toggle, default on. */
export function getHapticsEnabled(): boolean {
  try {
    return storage.getBoolean(STORAGE_KEY) ?? true;
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    storage.set(STORAGE_KEY, enabled);
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

/** Reactive `hapticsEnabled` setting for the Settings screen. */
export function useHapticsSetting(): {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
} {
  const enabled = useSyncExternalStore(
    subscribe,
    getHapticsEnabled,
    getHapticsEnabled,
  );
  const setEnabled = useCallback((v: boolean) => setHapticsEnabled(v), []);
  return { enabled, setEnabled };
}

const IMPACT = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Soft,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
} as const;

const NOTIFICATION = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const;

function drive(pulse: HapticPulse): void {
  const swallow = () => {};
  switch (pulse.kind) {
    case 'impact':
      void Haptics.impactAsync(IMPACT[pulse.style]).catch(swallow);
      break;
    case 'notification':
      void Haptics.notificationAsync(NOTIFICATION[pulse.type]).catch(swallow);
      break;
    case 'selection':
      void Haptics.selectionAsync().catch(swallow);
      break;
  }
}

const engine = createHapticsEngine({
  driver: drive,
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  isEnabled: () => Platform.OS === 'ios' && getHapticsEnabled(),
});

/** Fire an event by name. Prefer `haptic.<event>()`. */
export function triggerHaptic(event: HapticEvent): void {
  try {
    engine.fire(event);
  } catch {
    // never break the UI
  }
}

type HapticApi = { [E in HapticEvent]: () => void };

/** Typed per-event functions: `haptic.tap()`, `haptic.setDone()`, ... */
export const haptic = Object.fromEntries(
  (Object.keys(HAPTIC_PATTERNS) as HapticEvent[]).map((event) => [
    event,
    () => triggerHaptic(event),
  ]),
) as HapticApi;

export type { HapticEvent };
