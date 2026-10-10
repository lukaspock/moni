/**
 * Workout Live Activity (lock screen + Dynamic Island) — public contract.
 *
 * Local updates only (ActivityKit from the running app, no push): møni signs
 * with a free personal team, which can't use APNs. Elapsed time and the rest
 * countdown tick natively (timer text), so the app only sends an update when
 * the displayed state actually changes.
 *
 * Every function is fire-and-forget: it never throws and is a no-op when Live
 * Activities aren't available (no native module, iOS < 16.2, jest, user
 * disabled Live Activities in Settings).
 */
import { useEffect } from 'react';

import { useActiveWorkoutStore } from '@/features/workout';

import {
  activityPropsKey,
  buildActivityProps,
  deriveActivityState,
} from './derive';
import {
  getWorkoutActivityFactory,
  type WorkoutActivityInstance,
} from './native';
import type {
  WorkoutActivityLabels,
  WorkoutActivityProps,
  WorkoutActivityState,
} from './types';

export type { WorkoutActivityLabels, WorkoutActivityState } from './types';

/** Tapping the activity reopens the running workout. */
const DEEP_LINK = 'moeni://workout/active';
/** How long a final summary stays on the lock screen after ending. */
const FINAL_DISMISS_MS = 2 * 60 * 1000;

let current: WorkoutActivityInstance | null = null;
let lastKey: string | null = null;
/** Serializes native calls so start/update/end never overtake each other. */
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void> | void): void {
  queue = queue.then(task).catch((err: unknown) => {
    console.warn('[liveActivity] call failed', err);
  });
}

export function isLiveActivitySupported(): boolean {
  return getWorkoutActivityFactory() !== null;
}

function staleDateFor(props: WorkoutActivityProps): Date | undefined {
  // After the rest ends the activity turns "stale" and the layout falls back
  // to the elapsed view, even while the app is suspended.
  return props.restEndsAtMs !== null ? new Date(props.restEndsAtMs) : undefined;
}

/** Re-attaches to an activity that survived an app restart; ends duplicates. */
function adoptExisting(): WorkoutActivityInstance | null {
  if (current) return current;
  const factory = getWorkoutActivityFactory();
  if (!factory) return null;
  const [first, ...rest] = factory.getInstances();
  for (const extra of rest) void extra.end('immediate').catch(() => undefined);
  current = first ?? null;
  lastKey = null;
  return current;
}

async function send(props: WorkoutActivityProps): Promise<void> {
  const factory = getWorkoutActivityFactory();
  if (!factory) return;
  const key = activityPropsKey(props);
  const existing = adoptExisting();
  if (existing) {
    if (key === lastKey) return;
    try {
      await existing.update(props, staleDateFor(props));
      lastKey = key;
      return;
    } catch {
      // Ended by the user/system meanwhile -> start a fresh one below.
      current = null;
    }
  }
  current = factory.start(props, DEEP_LINK, staleDateFor(props));
  lastKey = key;
}

/** Starts the activity (or updates an already running one). */
export function startWorkoutActivity(state: WorkoutActivityState): void {
  try {
    const props = buildActivityProps(state);
    enqueue(() => send(props));
  } catch (err) {
    console.warn('[liveActivity] start failed', err);
  }
}

/** Updates the running activity (starts one if none is running). No-op when unchanged. */
export function updateWorkoutActivity(state: WorkoutActivityState): void {
  startWorkoutActivity(state);
}

/**
 * Ends every workout activity. With `final`, its content is shown for a short
 * moment on the lock screen; without, it disappears immediately.
 */
export function endWorkoutActivity(final?: WorkoutActivityState): void {
  let finalProps: WorkoutActivityProps | undefined;
  try {
    finalProps = final
      ? { ...buildActivityProps(final), restEndsAtMs: null, restStartMs: null }
      : undefined;
  } catch {
    finalProps = undefined;
  }
  enqueue(async () => {
    const factory = getWorkoutActivityFactory();
    if (!factory) return;
    const all = factory.getInstances();
    if (current && !all.some((a) => a.getId() === current?.getId()))
      all.push(current);
    current = null;
    lastKey = null;
    await Promise.all(
      all.map((a) =>
        (finalProps
          ? a.end(
              { after: new Date(Date.now() + FINAL_DISMISS_MS) },
              finalProps,
            )
          : a.end('immediate')
        ).catch(() => undefined),
      ),
    );
  });
}

// ---- end on session reset (finish / discard), independent of any screen ----

let resetWatcherInstalled = false;

function installResetWatcher(): void {
  if (resetWatcherInstalled) return;
  resetWatcherInstalled = true;
  useActiveWorkoutStore.subscribe((s, prev) => {
    if (prev.workoutId && !s.workoutId) endWorkoutActivity();
  });
}

export interface UseWorkoutLiveActivityOptions {
  /** Localized routine name, or a generic fallback (e.g. the "Einheit" header title). */
  routineName: string;
  /** Exercise in focus on the live screen; defaults to the first open one. */
  focusedExerciseId?: string | null;
  /** Localized display name of an exercise id (`exerciseDisplayName`). */
  exerciseName: (exerciseId: string) => string;
  unit: 'kg' | 'lb';
  labels: WorkoutActivityLabels;
  /** Defaults to true; false ends a running activity. */
  enabled?: boolean;
}

/**
 * Keeps the Live Activity in sync with the active session store (read-only).
 * Mount once on the live workout screen. Updates are sent only when the
 * derived props change (set checked, focus moved, rest started/adjusted/ended),
 * never per second. Finishing/discarding (store reset) ends the activity even
 * if the screen is already gone.
 */
export function useWorkoutLiveActivity(
  opts: UseWorkoutLiveActivityOptions,
): void {
  const workoutId = useActiveWorkoutStore((s) => s.workoutId);
  const startedAt = useActiveWorkoutStore((s) => s.startedAt);
  const exercises = useActiveWorkoutStore((s) => s.exercises);
  const restEndsAt = useActiveWorkoutStore((s) => s.restEndsAt);
  const restTotalSeconds = useActiveWorkoutStore((s) => s.restTotalSeconds);
  const {
    routineName,
    focusedExerciseId,
    exerciseName,
    unit,
    labels,
    enabled = true,
  } = opts;

  useEffect(() => {
    if (!isLiveActivitySupported()) return;
    installResetWatcher();
    if (!enabled || !workoutId) {
      endWorkoutActivity();
      return;
    }
    const sync = () => {
      const state = deriveActivityState(
        { workoutId, startedAt, exercises, restEndsAt, restTotalSeconds },
        {
          routineName,
          focusedExerciseId,
          exerciseName,
          unit,
          labels,
          nowMs: Date.now(),
        },
      );
      if (state) updateWorkoutActivity(state);
    };
    sync();
    // Drop the countdown when the rest runs out while the app is in front
    // (in the background the staleDate takes care of it).
    const msLeft = restEndsAt !== null ? restEndsAt - Date.now() : -1;
    if (msLeft <= 0) return;
    const timer = setTimeout(sync, msLeft + 250);
    return () => clearTimeout(timer);
  }, [
    enabled,
    workoutId,
    startedAt,
    exercises,
    restEndsAt,
    restTotalSeconds,
    routineName,
    focusedExerciseId,
    exerciseName,
    unit,
    labels,
  ]);
}
