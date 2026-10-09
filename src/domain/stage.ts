/**
 * Stages (titles) driven by lifetime rhythm weeks — they never go down
 * (docs/05 §2.4). Names are working titles (IDENTITY-PLAN D4): the keys are
 * stable identifiers, the copy lives in i18n (`rhythm.stage.<key>`).
 */

export type StageKey =
  'warmup' | 'inTune' | 'inStep' | 'inSync' | 'metronome' | 'original';

export interface Stage {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  key: StageKey;
  /** lifetime rhythm weeks needed */
  minWeeks: number;
}

export const STAGES: readonly Stage[] = [
  { index: 1, key: 'warmup', minWeeks: 0 },
  { index: 2, key: 'inTune', minWeeks: 3 },
  { index: 3, key: 'inStep', minWeeks: 8 },
  { index: 4, key: 'inSync', minWeeks: 16 },
  { index: 5, key: 'metronome', minWeeks: 30 },
  { index: 6, key: 'original', minWeeks: 52 },
];

export interface StageProgress {
  stage: Stage;
  next: Stage | null;
  weeksToNext: number | null;
  /** 0..1 within the current stage (1 at the top stage) */
  progress: number;
}

function sanitize(weeks: number): number {
  return Number.isFinite(weeks) ? Math.max(0, Math.floor(weeks)) : 0;
}

export function stageForWeeks(lifetimeWeeks: number): StageProgress {
  const weeks = sanitize(lifetimeWeeks);
  let idx = 0;
  for (let i = 0; i < STAGES.length; i += 1) {
    if (weeks >= STAGES[i].minWeeks) idx = i;
  }
  const stage = STAGES[idx];
  const next = STAGES[idx + 1] ?? null;
  if (!next) return { stage, next: null, weeksToNext: null, progress: 1 };
  const span = next.minWeeks - stage.minWeeks;
  return {
    stage,
    next,
    weeksToNext: next.minWeeks - weeks,
    progress: (weeks - stage.minWeeks) / span,
  };
}

/**
 * Stages never sink: given the highest stage index seen before (persisted) and the
 * currently computed lifetime weeks, returns the stage to display.
 */
export function displayedStage(
  lifetimeWeeks: number,
  highestSeenIndex: number | null,
): StageProgress {
  const computed = stageForWeeks(lifetimeWeeks);
  if (highestSeenIndex === null || highestSeenIndex <= computed.stage.index) {
    return computed;
  }
  const stage = STAGES[Math.min(STAGES.length, highestSeenIndex) - 1];
  const next = STAGES[stage.index] ?? null;
  return {
    stage,
    next,
    weeksToNext: next
      ? Math.max(0, next.minWeeks - sanitize(lifetimeWeeks))
      : null,
    progress: next ? 0 : 1,
  };
}

/** The stage reached for the first time (celebration), or null if nothing new. */
export function stageAscent(
  highestSeenIndex: number | null,
  lifetimeWeeks: number,
): Stage | null {
  const { stage } = stageForWeeks(lifetimeWeeks);
  if (highestSeenIndex === null) return stage.index > 1 ? stage : null;
  return stage.index > highestSeenIndex ? stage : null;
}
