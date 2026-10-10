/**
 * Pure routine-editor logic (no RN/Expo imports, tested in routineDraft.test.ts).
 *
 * Storage model: `routine_exercises` has `target_sets`, `target_reps`,
 * `target_reps_min` and `superset_group`. The editor works on a richer draft:
 * - rep-based exercises (`weight_reps`, `reps`): `target_reps` = the **upper**
 *   end of the rep range (what the live session prefills / progresses against),
 *   `target_reps_min` = the optional lower end (older routines: device-local
 *   fallback in `repRangeStore.ts`).
 * - `supersetGroup`: adjacent exercises with the same number are a superset
 *   (2) or circuit (3+); pure grouping logic in `src/domain/supersets.ts`.
 * - time-based exercises (`duration`, `distance_duration`): `target_reps` =
 *   target **minutes** per set (rounds), no lower bound.
 * Exercises are unique within a routine (adding/swapping in a duplicate is a no-op).
 */
import type {
  ResolvedTemplateExercise,
  RoutineTemplate,
  TemplatePlan,
  TrainingSetting,
} from '@/domain/routineTemplates';
import {
  linkWithNext,
  normalizeSupersetGroups,
  unlinkAt,
} from '@/domain/supersets';
import type { RoutineExerciseInput } from '../routines';
import type { ExerciseCategory, TrackingType } from '../types';

export const SETS_MIN = 1;
export const SETS_MAX = 8;
export const REPS_MIN = 1;
export const REPS_MAX = 30;
export const MINUTES_MIN = 1;
export const MINUTES_MAX = 180;

export type TargetKind = 'reps' | 'minutes';

export interface DraftExercise {
  exerciseId: string;
  trackingType: TrackingType;
  sets: number;
  /** Lower end of the rep range; equals `repsMax` when no range is used. Unused for `minutes`. */
  repsMin: number;
  /** Upper rep target, or minutes per set for time-based exercises. */
  repsMax: number;
  /** Superset/circuit group; null/absent = standalone. */
  supersetGroup?: number | null;
}

export function targetKind(trackingType: TrackingType): TargetKind {
  return trackingType === 'duration' || trackingType === 'distance_duration'
    ? 'minutes'
    : 'reps';
}

export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Sensible starting target for a freshly added exercise. */
export function defaultTarget(
  trackingType: TrackingType,
  category: ExerciseCategory = 'strength',
): Pick<DraftExercise, 'sets' | 'repsMin' | 'repsMax'> {
  if (targetKind(trackingType) === 'minutes') {
    // Steady cardio / sport = one block of 30 min; holds (plank) = 3 x 1 min.
    return category === 'strength' || category === 'other'
      ? { sets: 3, repsMin: 1, repsMax: 1 }
      : { sets: 1, repsMin: 30, repsMax: 30 };
  }
  return { sets: 3, repsMin: 8, repsMax: 10 };
}

/** Minutes stepper: 1-min steps up to 10, then 5-min steps (snaps onto the 5 grid). */
export function stepMinutes(value: number, dir: 1 | -1): number {
  let next: number;
  if (dir === 1) next = value < 10 ? value + 1 : Math.floor(value / 5) * 5 + 5;
  else next = value <= 10 ? value - 1 : Math.ceil(value / 5) * 5 - 5;
  return clamp(next, MINUTES_MIN, MINUTES_MAX);
}

/** Sets the lower rep bound, pushing the upper bound up if needed. */
export function withRepsMin(d: DraftExercise, value: number): DraftExercise {
  const repsMin = clamp(value, REPS_MIN, REPS_MAX);
  return { ...d, repsMin, repsMax: Math.max(repsMin, d.repsMax) };
}

/** Sets the upper rep bound (or minutes), pulling the lower bound down if needed. */
export function withRepsMax(d: DraftExercise, value: number): DraftExercise {
  if (targetKind(d.trackingType) === 'minutes') {
    const minutes = clamp(value, MINUTES_MIN, MINUTES_MAX);
    return { ...d, repsMin: minutes, repsMax: minutes };
  }
  const repsMax = clamp(value, REPS_MIN, REPS_MAX);
  return { ...d, repsMax, repsMin: Math.min(repsMax, d.repsMin) };
}

export function withSets(d: DraftExercise, value: number): DraftExercise {
  return { ...d, sets: clamp(value, SETS_MIN, SETS_MAX) };
}

/** Turns the rep range on (min = max - 2) or off (min = max). */
export function toggleRange(d: DraftExercise): DraftExercise {
  if (d.repsMin < d.repsMax) return { ...d, repsMin: d.repsMax };
  return { ...d, repsMin: Math.max(REPS_MIN, d.repsMax - 2) };
}

export function hasRange(d: DraftExercise): boolean {
  return targetKind(d.trackingType) === 'reps' && d.repsMin < d.repsMax;
}

/** Display pieces for the target chip: `sets` + `value` ("8–10", "10" or minutes). */
export function formatTarget(d: DraftExercise): {
  kind: TargetKind;
  sets: number;
  value: string;
} {
  const kind = targetKind(d.trackingType);
  const value = hasRange(d) ? `${d.repsMin}–${d.repsMax}` : String(d.repsMax);
  return { kind, sets: d.sets, value };
}

/** Moves an item; out-of-range indices return the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  )
    return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

export interface ExerciseMeta {
  trackingType: TrackingType;
  category: ExerciseCategory;
}

/** Appends exercises (skipping ones already in the list) with default targets. */
export function appendExercises(
  list: readonly DraftExercise[],
  ids: readonly string[],
  metaFor: (id: string) => ExerciseMeta | undefined,
): DraftExercise[] {
  const present = new Set(list.map((d) => d.exerciseId));
  const next = [...list];
  for (const id of ids) {
    if (present.has(id)) continue;
    present.add(id);
    const meta = metaFor(id) ?? {
      trackingType: 'weight_reps' as const,
      category: 'strength' as const,
    };
    next.push({
      exerciseId: id,
      trackingType: meta.trackingType,
      ...defaultTarget(meta.trackingType, meta.category),
    });
  }
  return next;
}

/**
 * Replaces the exercise at `index`. Keeps the targets when the tracking kind
 * matches, otherwise falls back to the new exercise's defaults. Swapping in an
 * exercise that is already in the routine is a no-op.
 */
export function swapExercise(
  list: readonly DraftExercise[],
  index: number,
  newId: string,
  meta: ExerciseMeta | undefined,
): DraftExercise[] {
  const current = list[index];
  if (!current || list.some((d) => d.exerciseId === newId)) return [...list];
  const trackingType = meta?.trackingType ?? current.trackingType;
  const keep = targetKind(trackingType) === targetKind(current.trackingType);
  const replaced: DraftExercise = keep
    ? { ...current, exerciseId: newId, trackingType }
    : {
        exerciseId: newId,
        trackingType,
        ...defaultTarget(trackingType, meta?.category),
      };
  return list.map((d, i) => (i === index ? replaced : d));
}

export function canSaveRoutine(
  name: string,
  exercises: readonly unknown[],
): boolean {
  return name.trim().length > 0 && exercises.length > 0;
}

/** Stored row -> draft. `repMin` = locally remembered lower bound, if any. */
export function draftFromStored(
  stored: {
    exerciseId: string;
    targetSets: number | null;
    targetReps: number | null;
    supersetGroup?: number | null;
  },
  meta: ExerciseMeta | undefined,
  repMin: number | undefined,
): DraftExercise {
  const group =
    stored.supersetGroup != null ? { supersetGroup: stored.supersetGroup } : {};
  const trackingType = meta?.trackingType ?? 'weight_reps';
  const fallback = defaultTarget(trackingType, meta?.category);
  const sets =
    stored.targetSets !== null
      ? clamp(stored.targetSets, SETS_MIN, SETS_MAX)
      : fallback.sets;
  if (targetKind(trackingType) === 'minutes') {
    const minutes =
      stored.targetReps !== null && stored.targetReps > 0
        ? clamp(stored.targetReps, MINUTES_MIN, MINUTES_MAX)
        : fallback.repsMax;
    return {
      exerciseId: stored.exerciseId,
      trackingType,
      sets,
      repsMin: minutes,
      repsMax: minutes,
      ...group,
    };
  }
  const repsMax =
    stored.targetReps !== null && stored.targetReps > 0
      ? clamp(stored.targetReps, REPS_MIN, REPS_MAX)
      : fallback.repsMax;
  const repsMin =
    repMin !== undefined
      ? clamp(Math.min(repMin, repsMax), REPS_MIN, REPS_MAX)
      : repsMax;
  return {
    exerciseId: stored.exerciseId,
    trackingType,
    sets,
    repsMin,
    repsMax,
    ...group,
  };
}

/**
 * Draft -> `useSaveRoutine` input (order = array order). The lower rep bound
 * goes into `targetRepsMin` only for real ranges; groups are normalized.
 */
export function toRoutineInput(
  list: readonly DraftExercise[],
): RoutineExerciseInput[] {
  const groups = normalizeSupersetGroups(list.map((d) => d.supersetGroup));
  return list.map((d, i) => ({
    exerciseId: d.exerciseId,
    targetSets: d.sets,
    targetReps: d.repsMax,
    targetRepsMin: hasRange(d) ? d.repsMin : null,
    supersetGroup: groups[i] ?? null,
  }));
}

function withGroups(
  list: readonly DraftExercise[],
  groups: readonly (number | null)[],
): DraftExercise[] {
  return list.map((d, i) => ({ ...d, supersetGroup: groups[i] ?? null }));
}

/** Re-derives groups after moving/removing (broken runs dissolve). */
export function normalizeDraftGroups(
  list: readonly DraftExercise[],
): DraftExercise[] {
  return withGroups(
    list,
    normalizeSupersetGroups(list.map((d) => d.supersetGroup)),
  );
}

/** "Couple with next": exercise `index` + the following one share a group. */
export function linkDraftWithNext(
  list: readonly DraftExercise[],
  index: number,
): DraftExercise[] {
  return withGroups(
    list,
    linkWithNext(
      list.map((d) => d.supersetGroup),
      index,
    ),
  );
}

/** "Uncouple": takes exercise `index` out of its group. */
export function unlinkDraft(
  list: readonly DraftExercise[],
  index: number,
): DraftExercise[] {
  return withGroups(
    list,
    unlinkAt(
      list.map((d) => d.supersetGroup),
      index,
    ),
  );
}

/** Lower rep bounds worth remembering locally (only real ranges). */
export function repMinsOf(
  list: readonly DraftExercise[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of list) if (hasRange(d)) out[d.exerciseId] = d.repsMin;
  return out;
}

/** Keys of the name suggestion chips (`routineEditor.names.<key>`). */
export const ROUTINE_NAME_KEYS = [
  'push',
  'pull',
  'legs',
  'fullBody',
  'upper',
  'lower',
] as const;
export type RoutineNameKey = (typeof ROUTINE_NAME_KEYS)[number];

/** Resolved template exercises -> draft (ranges kept, `durationMin` -> minutes). */
export function draftFromTemplate(
  exercises: readonly ResolvedTemplateExercise[],
  metaFor: (id: string) => ExerciseMeta | undefined,
): DraftExercise[] {
  const seen = new Set<string>();
  const out: DraftExercise[] = [];
  for (const ex of exercises) {
    if (seen.has(ex.exerciseId)) continue;
    seen.add(ex.exerciseId);
    const meta = metaFor(ex.exerciseId);
    const trackingType =
      meta?.trackingType ??
      (ex.durationMin !== null ? 'duration' : 'weight_reps');
    const base: DraftExercise = {
      exerciseId: ex.exerciseId,
      trackingType,
      ...defaultTarget(trackingType, meta?.category),
    };
    let d = withSets(base, ex.sets);
    if (targetKind(trackingType) === 'minutes') {
      if (ex.durationMin !== null) d = withRepsMax(d, ex.durationMin);
    } else {
      const max = ex.repsMax ?? ex.repsMin;
      if (max !== null) d = withRepsMax({ ...d, repsMin: max }, max);
      if (ex.repsMin !== null) d = withRepsMin(d, ex.repsMin);
    }
    out.push(d);
  }
  return out;
}

/** Every routine template once, grouped by setting (for the "Fill from template" menu). */
export function templatesBySetting(
  plans: readonly TemplatePlan[],
): { setting: TrainingSetting; templates: RoutineTemplate[] }[] {
  const groups = new Map<TrainingSetting, RoutineTemplate[]>();
  const seen = new Set<string>();
  for (const plan of plans) {
    const list = groups.get(plan.setting) ?? [];
    for (const r of plan.routines) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      list.push(r);
    }
    groups.set(plan.setting, list);
  }
  return Array.from(groups, ([setting, templates]) => ({ setting, templates }));
}
