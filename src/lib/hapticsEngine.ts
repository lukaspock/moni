/**
 * Pure haptics scheduling logic (no Expo/RN imports, fully unit-tested):
 * event → pulse-pattern mapping, global 40 ms spacing, per-event debounce,
 * priorities and exclusive patterns. `src/lib/haptics.ts` binds it to
 * expo-haptics + the MMKV settings toggle. Spec: docs/identity/03 §4.
 */

export type HapticPulse =
  | {
      at: number;
      kind: 'impact';
      style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
    }
  | { at: number; kind: 'notification'; type: 'success' | 'warning' | 'error' }
  | { at: number; kind: 'selection' };

export type HapticPriority = 'ui' | 'confirm' | 'reward' | 'milestone';

export const PRIORITY_RANK: Record<HapticPriority, number> = {
  ui: 0,
  confirm: 1,
  reward: 2,
  milestone: 3,
};

export type HapticPattern = {
  priority: HapticPriority;
  pulses: readonly HapticPulse[];
};

const impact = (
  style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid',
  at = 0,
): HapticPulse => ({ at, kind: 'impact', style });
const notify = (
  type: 'success' | 'warning' | 'error',
  at = 0,
): HapticPulse => ({ at, kind: 'notification', type });
const select = (at = 0): HapticPulse => ({ at, kind: 'selection' });

/** Event → pattern (Doc 03 §4.4). Events without haptics (native UI, background) are not listed. */
export const HAPTIC_PATTERNS = {
  // generic UI
  tap: { priority: 'ui', pulses: [impact('medium')] },
  tapLight: { priority: 'ui', pulses: [impact('light')] },
  select: { priority: 'ui', pulses: [select()] },
  toggle: { priority: 'ui', pulses: [impact('soft')] },
  favorite: { priority: 'ui', pulses: [impact('light'), select(70)] },
  itemAdded: { priority: 'ui', pulses: [impact('light')] },
  // food
  mealSaved: { priority: 'confirm', pulses: [notify('success')] },
  mealQuickSaved: {
    priority: 'confirm',
    pulses: [impact('medium'), impact('soft', 90)],
  },
  mealDeleted: { priority: 'confirm', pulses: [impact('rigid')] },
  scanHit: { priority: 'confirm', pulses: [impact('medium')] },
  scanMiss: { priority: 'confirm', pulses: [notify('warning')] },
  aiStart: { priority: 'ui', pulses: [impact('light')] },
  aiDone: { priority: 'confirm', pulses: [notify('success')] },
  aiFail: { priority: 'confirm', pulses: [notify('warning')] },
  // day / ring
  ringChanged: { priority: 'confirm', pulses: [impact('soft')] },
  bonusGained: {
    priority: 'reward',
    pulses: [impact('medium'), impact('soft', 120)],
  },
  /** Never a harsh error haptic for "over the level" — warning only. */
  limitExceeded: { priority: 'confirm', pulses: [notify('warning')] },
  goalReached: {
    priority: 'milestone',
    pulses: [impact('medium'), impact('heavy', 110)],
  },
  rhythmMilestone: {
    priority: 'milestone',
    pulses: [impact('light'), impact('medium', 90), impact('heavy', 190)],
  },
  // workout
  workoutStart: { priority: 'confirm', pulses: [impact('medium')] },
  setDone: { priority: 'confirm', pulses: [impact('light'), select(60)] },
  setDonePR: {
    priority: 'reward',
    pulses: [impact('heavy'), notify('success', 140)],
  },
  setUndone: { priority: 'ui', pulses: [impact('soft')] },
  restDone: { priority: 'confirm', pulses: [notify('success')] },
  /** One tick of the optional last-3-seconds countdown. */
  restCountdown: { priority: 'ui', pulses: [select()] },
  workoutFinished: {
    priority: 'reward',
    pulses: [impact('medium'), notify('success', 180)],
  },
  prLanded: { priority: 'milestone', pulses: [impact('heavy')] },
  weightLogged: { priority: 'confirm', pulses: [impact('soft')] },
  // onboarding / account
  onboardStep: { priority: 'ui', pulses: [impact('light')] },
  onboardContinue: { priority: 'ui', pulses: [impact('light')] },
  onboardResult: { priority: 'reward', pulses: [notify('success')] },
  accountCreated: { priority: 'reward', pulses: [notify('success')] },
  purchaseSuccess: { priority: 'reward', pulses: [notify('success')] },
  // dialogs / validation
  destructivePrompt: { priority: 'confirm', pulses: [notify('warning')] },
  validationError: { priority: 'confirm', pulses: [notify('error')] },
} as const satisfies Record<string, HapticPattern>;

export type HapticEvent = keyof typeof HAPTIC_PATTERNS;

/** Rules (Doc 03 §4.3). */
export const HAPTIC_RULES = {
  minGapMs: 40,
  selectGapMs: 60,
  sameEventDebounceMs: 250,
  /** Events exempt from the 250 ms same-event debounce (they have their own rate). */
  rateLimitedEvents: ['select', 'restCountdown'] as readonly string[],
} as const;

export type HapticDriver = (pulse: HapticPulse) => void;

export type HapticsEngineDeps = {
  driver: HapticDriver;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (id: unknown) => void;
  isEnabled: () => boolean;
  isLowPower?: () => boolean;
};

export function createHapticsEngine(deps: HapticsEngineDeps) {
  let lastPulseAt = -Infinity;
  let lastSelectAt = -Infinity;
  const lastEventAt = new Map<string, number>();
  let activeUntil = -Infinity;
  let activeRank = -1;
  let timers: unknown[] = [];

  const cancelPending = () => {
    for (const id of timers) deps.clearTimer(id);
    timers = [];
  };

  const play = (pulse: HapticPulse) => {
    lastPulseAt = deps.now();
    if (pulse.kind === 'selection') lastSelectAt = lastPulseAt;
    try {
      deps.driver(pulse);
    } catch {
      // haptics must never break the UI
    }
  };

  /** Returns true if the event was played (or scheduled). */
  function fire(event: HapticEvent): boolean {
    if (!deps.isEnabled()) return false;
    const pattern: HapticPattern | undefined = HAPTIC_PATTERNS[event];
    if (!pattern) return false;
    const now = deps.now();
    const rank = PRIORITY_RANK[pattern.priority];

    // Same event repeated (double tap) is dropped.
    if (!HAPTIC_RULES.rateLimitedEvents.includes(event)) {
      const prev = lastEventAt.get(event);
      if (prev !== undefined && now - prev < HAPTIC_RULES.sameEventDebounceMs) {
        return false;
      }
    }

    // Patterns run exclusively: a running pattern only yields to a higher priority.
    const patternRunning = now < activeUntil;
    if (patternRunning && rank <= activeRank) return false;

    // Global minimum spacing between two single haptics (higher priority may cut in).
    if (now - lastPulseAt < HAPTIC_RULES.minGapMs && rank <= activeRank) {
      return false;
    }
    if (now - lastPulseAt < HAPTIC_RULES.minGapMs && !patternRunning) {
      return false;
    }

    // Selection scrubbing: at most one per 60 ms.
    const first = pattern.pulses[0];
    if (
      pattern.pulses.length === 1 &&
      first.kind === 'selection' &&
      now - lastSelectAt < HAPTIC_RULES.selectGapMs
    ) {
      return false;
    }

    if (patternRunning) cancelPending();

    // Low Power Mode: patterns with >= 3 pulses collapse to the first pulse.
    const pulses =
      deps.isLowPower?.() && pattern.pulses.length >= 3
        ? pattern.pulses.slice(0, 1)
        : pattern.pulses;

    lastEventAt.set(event, now);
    const last = pulses[pulses.length - 1];
    if (pulses.length > 1) {
      activeUntil = now + last.at + HAPTIC_RULES.minGapMs;
      activeRank = rank;
    } else {
      activeUntil = -Infinity;
      activeRank = -1;
    }

    for (const pulse of pulses) {
      if (pulse.at <= 0) {
        play(pulse);
      } else {
        timers.push(deps.setTimer(() => play(pulse), pulse.at));
      }
    }
    return true;
  }

  function reset() {
    cancelPending();
    lastPulseAt = -Infinity;
    lastSelectAt = -Infinity;
    lastEventAt.clear();
    activeUntil = -Infinity;
    activeRank = -1;
  }

  return { fire, reset };
}
