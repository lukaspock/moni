/**
 * Achievements ("Stempel") as a data-driven catalog + pure evaluation (docs/05 §2.6, §3).
 * - Everything is derived from `AchievementFacts` (ledger + counters); nothing is stored here.
 * - 16 stamps are `phase: 'release1'`, the rest of the 43-stamp catalog is `'later'`.
 * - No stamp has a calorie floor (care rule L). Weight-related stamps are withheld while the
 *   care signal is active, and "unlocked" is never revoked (`mergeUnlocked`).
 * - Copy lives in i18n; the catalog only carries keys (`achievements.<id>.name|body|hint`).
 * Pure; no RN/Expo imports.
 */

import { daysBetween, shiftIsoDate } from './adaptive';
import {
  BMI_HEALTHY_MAX,
  BMI_UNDERWEIGHT,
  MIN_TARGET_DIFF_KG,
  calculateBMI,
} from './projection';
import {
  classifyDay,
  weekDates,
  weekStartFor,
  type DayContext,
  type LedgerDay,
  type PauseRange,
  type RhythmState,
  type WeekRings,
} from './rhythm';
import type { Goal } from './types';

export const ACHIEVEMENT_IDS = [
  // training
  'firstWorkout',
  'workouts10',
  'workouts50',
  'workouts100',
  'firstPr',
  'volume10t',
  'plusTen',
  'allRounder',
  // nutrition
  'firstMeal',
  'threeMeals',
  'meals100',
  'meals500',
  'wellFuelled',
  'proteinWeek',
  'proteinStreak4',
  'bridgeDay',
  // consistency
  'firstRhythm',
  'rhythm4',
  'rhythm12',
  'rhythm26',
  'fullWeek',
  'fullWeek4',
  'comeback',
  'goodPause',
  'weekendKeeper',
  'fullMonth',
  // body
  'firstWeigh',
  'trendReady',
  'adaptiveOn',
  'bodyGoal2kg',
  'strongAsYou',
  'goalReached',
  // explorer
  'firstPhoto',
  'firstVoice',
  'firstLabel',
  'scanner25',
  'firstFavorite',
  'ownExercise',
  'healthLinked',
  'patternFound',
  'reviews4',
  'sharedFirst',
  'oneYear',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];
export type AchievementCategory =
  'training' | 'nutrition' | 'consistency' | 'body' | 'explorer';
export type Rarity = 'common' | 'rare' | 'special';
export type AchievementPhase = 'release1' | 'later';

export interface AchievementCounts {
  workouts: number;
  foodLogs: number;
  photoLogs: number;
  barcodeLogs: number;
  voiceLogs: number;
  labelLogs: number;
  favorites: number;
  customExercises: number;
  routines: number;
  weightLogs: number;
}

export interface AchievementFacts {
  today: string;
  days: readonly LedgerDay[];
  /** the rhythm replay (completed weeks) incl. `thisWeekRings` */
  rhythm: RhythmState;
  dayContext: DayContext;
  pauses: readonly PauseRange[];
  counts: AchievementCounts;
  strength: {
    totalVolumeKg: number;
    bestOneRmGainPct: number | null;
    firstPrDate: string | null;
    bodyweightLiftDone: boolean;
  };
  body: {
    startWeightKg: number | null;
    trendWeightKg: number | null;
    targetWeightKg: number | null;
    goal: Goal | null;
    heightCm: number | null;
  };
  flags: {
    healthConnected: boolean;
    healthWorkoutImported: boolean;
    adaptiveTdeeAvailable: boolean;
    /** first correlation hint visible in Insights */
    patternFound: boolean;
    sharedCount: number;
    reviewsViewed: number;
    /** ISO timestamp or date of account creation */
    accountCreatedAt: string;
  };
  /** care signal active: weight-related stamps are withheld */
  careFlagged: boolean;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementStatus {
  id: AchievementId;
  unlocked: boolean;
  /** earliest provable date; null = unknown (use the detection date) */
  unlockedOn: string | null;
  progress: AchievementProgress | null;
  /** condition met but held back by the care signal */
  withheld: boolean;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type CounterKey = keyof AchievementCounts;

type CustomCheck =
  | 'firstPr'
  | 'volume10t'
  | 'plusTen'
  | 'allRounder'
  | 'threeMeals'
  | 'wellFuelled'
  | 'proteinWeek'
  | 'proteinStreak4'
  | 'bridgeDay'
  | 'firstRhythm'
  | 'rhythm4'
  | 'rhythm12'
  | 'rhythm26'
  | 'fullWeek'
  | 'fullWeek4'
  | 'comeback'
  | 'goodPause'
  | 'weekendKeeper'
  | 'fullMonth'
  | 'trendReady'
  | 'adaptiveOn'
  | 'bodyGoal2kg'
  | 'strongAsYou'
  | 'goalReached'
  | 'healthLinked'
  | 'patternFound'
  | 'reviews4'
  | 'sharedFirst'
  | 'oneYear';

export type AchievementRule =
  | { kind: 'count'; counter: CounterKey; target: number }
  | { kind: 'custom'; check: CustomCheck };

export interface AchievementDef {
  id: AchievementId;
  category: AchievementCategory;
  rarity: Rarity;
  /** name and condition are only revealed after unlocking */
  hidden: boolean;
  phase: AchievementPhase;
  /** held back while the care signal is active */
  weightRelated: boolean;
  rule: AchievementRule;
  /** i18n keys (no copy here) */
  nameKey: string;
  bodyKey: string;
  hintKey: string;
}

type DefSeed = {
  id: AchievementId;
  category: AchievementCategory;
  rarity: Rarity;
  rule: AchievementRule;
  hidden?: boolean;
  later?: boolean;
  weightRelated?: boolean;
};

const count = (counter: CounterKey, target: number): AchievementRule => ({
  kind: 'count',
  counter,
  target,
});
const custom = (check: CustomCheck): AchievementRule => ({
  kind: 'custom',
  check,
});

const SEEDS: readonly DefSeed[] = [
  // training
  {
    id: 'firstWorkout',
    category: 'training',
    rarity: 'common',
    rule: count('workouts', 1),
  },
  {
    id: 'workouts10',
    category: 'training',
    rarity: 'common',
    rule: count('workouts', 10),
  },
  {
    id: 'workouts50',
    category: 'training',
    rarity: 'rare',
    rule: count('workouts', 50),
    later: true,
  },
  {
    id: 'workouts100',
    category: 'training',
    rarity: 'special',
    rule: count('workouts', 100),
    later: true,
  },
  {
    id: 'firstPr',
    category: 'training',
    rarity: 'common',
    rule: custom('firstPr'),
  },
  {
    id: 'volume10t',
    category: 'training',
    rarity: 'rare',
    rule: custom('volume10t'),
    later: true,
  },
  {
    id: 'plusTen',
    category: 'training',
    rarity: 'rare',
    rule: custom('plusTen'),
    later: true,
  },
  {
    id: 'allRounder',
    category: 'training',
    rarity: 'common',
    rule: custom('allRounder'),
  },
  // nutrition
  {
    id: 'firstMeal',
    category: 'nutrition',
    rarity: 'common',
    rule: count('foodLogs', 1),
  },
  {
    id: 'threeMeals',
    category: 'nutrition',
    rarity: 'common',
    rule: custom('threeMeals'),
  },
  {
    id: 'meals100',
    category: 'nutrition',
    rarity: 'common',
    rule: count('foodLogs', 100),
    later: true,
  },
  {
    id: 'meals500',
    category: 'nutrition',
    rarity: 'rare',
    rule: count('foodLogs', 500),
    later: true,
  },
  {
    id: 'wellFuelled',
    category: 'nutrition',
    rarity: 'rare',
    rule: custom('wellFuelled'),
  },
  {
    id: 'proteinWeek',
    category: 'nutrition',
    rarity: 'common',
    rule: custom('proteinWeek'),
  },
  {
    id: 'proteinStreak4',
    category: 'nutrition',
    rarity: 'rare',
    rule: custom('proteinStreak4'),
    later: true,
  },
  {
    id: 'bridgeDay',
    category: 'nutrition',
    rarity: 'common',
    rule: custom('bridgeDay'),
    hidden: true,
    later: true,
  },
  // consistency
  {
    id: 'firstRhythm',
    category: 'consistency',
    rarity: 'common',
    rule: custom('firstRhythm'),
  },
  {
    id: 'rhythm4',
    category: 'consistency',
    rarity: 'common',
    rule: custom('rhythm4'),
  },
  {
    id: 'rhythm12',
    category: 'consistency',
    rarity: 'special',
    rule: custom('rhythm12'),
    later: true,
  },
  {
    id: 'rhythm26',
    category: 'consistency',
    rarity: 'special',
    rule: custom('rhythm26'),
    later: true,
  },
  {
    id: 'fullWeek',
    category: 'consistency',
    rarity: 'rare',
    rule: custom('fullWeek'),
  },
  {
    id: 'fullWeek4',
    category: 'consistency',
    rarity: 'special',
    rule: custom('fullWeek4'),
    later: true,
  },
  {
    id: 'comeback',
    category: 'consistency',
    rarity: 'rare',
    rule: custom('comeback'),
  },
  {
    id: 'goodPause',
    category: 'consistency',
    rarity: 'common',
    rule: custom('goodPause'),
    later: true,
  },
  {
    id: 'weekendKeeper',
    category: 'consistency',
    rarity: 'rare',
    rule: custom('weekendKeeper'),
    later: true,
  },
  {
    id: 'fullMonth',
    category: 'consistency',
    rarity: 'special',
    rule: custom('fullMonth'),
    later: true,
  },
  // body
  {
    id: 'firstWeigh',
    category: 'body',
    rarity: 'common',
    rule: count('weightLogs', 1),
  },
  {
    id: 'trendReady',
    category: 'body',
    rarity: 'common',
    rule: custom('trendReady'),
  },
  {
    id: 'adaptiveOn',
    category: 'body',
    rarity: 'rare',
    rule: custom('adaptiveOn'),
    later: true,
  },
  {
    id: 'bodyGoal2kg',
    category: 'body',
    rarity: 'rare',
    rule: custom('bodyGoal2kg'),
    later: true,
    weightRelated: true,
  },
  {
    id: 'strongAsYou',
    category: 'body',
    rarity: 'rare',
    rule: custom('strongAsYou'),
    later: true,
  },
  {
    id: 'goalReached',
    category: 'body',
    rarity: 'special',
    rule: custom('goalReached'),
    later: true,
    weightRelated: true,
  },
  // explorer
  {
    id: 'firstPhoto',
    category: 'explorer',
    rarity: 'common',
    rule: count('photoLogs', 1),
  },
  {
    id: 'firstVoice',
    category: 'explorer',
    rarity: 'common',
    rule: count('voiceLogs', 1),
    later: true,
  },
  {
    id: 'firstLabel',
    category: 'explorer',
    rarity: 'common',
    rule: count('labelLogs', 1),
    later: true,
  },
  {
    id: 'scanner25',
    category: 'explorer',
    rarity: 'common',
    rule: count('barcodeLogs', 25),
    later: true,
  },
  {
    id: 'firstFavorite',
    category: 'explorer',
    rarity: 'common',
    rule: count('favorites', 1),
    later: true,
  },
  {
    id: 'ownExercise',
    category: 'explorer',
    rarity: 'common',
    rule: count('customExercises', 1),
    later: true,
  },
  {
    id: 'healthLinked',
    category: 'explorer',
    rarity: 'common',
    rule: custom('healthLinked'),
  },
  {
    id: 'patternFound',
    category: 'explorer',
    rarity: 'rare',
    rule: custom('patternFound'),
    later: true,
  },
  {
    id: 'reviews4',
    category: 'explorer',
    rarity: 'common',
    rule: custom('reviews4'),
    later: true,
  },
  {
    id: 'sharedFirst',
    category: 'explorer',
    rarity: 'common',
    rule: custom('sharedFirst'),
    hidden: true,
    later: true,
  },
  {
    id: 'oneYear',
    category: 'explorer',
    rarity: 'special',
    rule: custom('oneYear'),
    later: true,
  },
];

export function achievementKeys(id: AchievementId): {
  nameKey: string;
  bodyKey: string;
  hintKey: string;
} {
  return {
    nameKey: `achievements.${id}.name`,
    bodyKey: `achievements.${id}.body`,
    hintKey: `achievements.${id}.hint`,
  };
}

export const ACHIEVEMENT_CATALOG: readonly AchievementDef[] = SEEDS.map(
  (s) => ({
    id: s.id,
    category: s.category,
    rarity: s.rarity,
    hidden: s.hidden ?? false,
    phase: s.later ? ('later' as const) : ('release1' as const),
    weightRelated: s.weightRelated ?? false,
    rule: s.rule,
    ...achievementKeys(s.id),
  }),
);

export function achievementDef(id: AchievementId): AchievementDef {
  const def = ACHIEVEMENT_CATALOG.find((d) => d.id === id);
  if (!def) throw new Error(`Unknown achievement id: ${id}`);
  return def;
}

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

interface Eval {
  unlocked: boolean;
  unlockedOn: string | null;
  progress: AchievementProgress | null;
}

const NO: Eval = { unlocked: false, unlockedOn: null, progress: null };

function sortedDays(days: readonly LedgerDay[]): LedgerDay[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

function firstDay(
  days: readonly LedgerDay[],
  pred: (d: LedgerDay) => boolean,
): string | null {
  return sortedDays(days).find(pred)?.date ?? null;
}

function cumulativeDate(
  days: readonly LedgerDay[],
  amount: (d: LedgerDay) => number,
  target: number,
): string | null {
  let sum = 0;
  for (const d of sortedDays(days)) {
    sum += amount(d);
    if (sum >= target) return d.date;
  }
  return null;
}

const COUNTER_PER_DAY: Record<CounterKey, ((d: LedgerDay) => number) | null> = {
  workouts: (d) => d.workoutCount,
  foodLogs: (d) => d.foodLogCount,
  photoLogs: (d) => d.sources.photo,
  barcodeLogs: (d) => d.sources.barcode,
  voiceLogs: (d) => d.sources.voice,
  labelLogs: (d) => d.sources.label,
  weightLogs: (d) => (d.weightLogged ? 1 : 0),
  favorites: null,
  customExercises: null,
  routines: null,
};

function evalCount(
  rule: Extract<AchievementRule, { kind: 'count' }>,
  f: AchievementFacts,
): Eval {
  const current = f.counts[rule.counter];
  const unlocked = current >= rule.target;
  const perDay = COUNTER_PER_DAY[rule.counter];
  return {
    unlocked,
    unlockedOn:
      unlocked && perDay ? cumulativeDate(f.days, perDay, rule.target) : null,
    progress: { current: Math.min(current, rule.target), target: rule.target },
  };
}

function allWeeks(f: AchievementFacts): WeekRings[] {
  return [...f.rhythm.weeks.map((w) => w.rings), f.rhythm.thisWeekRings];
}

function weekEndOrToday(weekStart: string, today: string): string {
  const end = shiftIsoDate(weekStart, 6);
  return end < today ? end : today;
}

function isKept(f: AchievementFacts, d: LedgerDay): boolean {
  return classifyDay(d, d.date, f.dayContext) === 'kept';
}

/** Longest rhythm run reached so far and the date it first hit `n`. */
function rhythmRunReached(f: AchievementFacts, n: number): string | null {
  let run = 0;
  for (const w of f.rhythm.weeks) {
    if (w.outcome === 'rhythm') {
      run += 1;
      if (run >= n) return shiftIsoDate(w.weekStart, 6);
    } else if (w.outcome === 'broken' || w.outcome === 'idle') {
      run = 0;
    }
  }
  return null;
}

function rhythmBest(f: AchievementFacts): number {
  return Math.max(f.rhythm.best, f.rhythm.current);
}

function bmiOk(weightKg: number, heightCm: number | null): boolean {
  if (heightCm === null || heightCm <= 0) return false;
  return calculateBMI(weightKg, heightCm) >= BMI_UNDERWEIGHT;
}

const CUSTOM: Record<CustomCheck, (f: AchievementFacts) => Eval> = {
  firstPr: (f) => ({
    unlocked: f.strength.firstPrDate !== null,
    unlockedOn: f.strength.firstPrDate,
    progress: null,
  }),
  volume10t: (f) => ({
    unlocked: f.strength.totalVolumeKg >= 10_000,
    unlockedOn: null,
    progress: {
      current: Math.floor(Math.min(f.strength.totalVolumeKg, 10_000)),
      target: 10_000,
    },
  }),
  plusTen: (f) => {
    const gain = f.strength.bestOneRmGainPct;
    return {
      unlocked: gain !== null && gain >= 10,
      unlockedOn: null,
      progress: {
        current: Math.round(Math.max(0, Math.min(gain ?? 0, 10))),
        target: 10,
      },
    };
  },
  allRounder: (f) => {
    const byWeek = new Map<
      string,
      { strength: string | null; cardio: string | null }
    >();
    for (const d of sortedDays(f.days)) {
      if (!d.hadStrength && !d.hadCardioOrSport) continue;
      const ws = weekStartFor(d.date);
      const w = byWeek.get(ws) ?? { strength: null, cardio: null };
      if (d.hadStrength && w.strength === null) w.strength = d.date;
      if (d.hadCardioOrSport && w.cardio === null) w.cardio = d.date;
      byWeek.set(ws, w);
    }
    let on: string | null = null;
    for (const w of byWeek.values()) {
      if (w.strength && w.cardio) {
        const d = w.strength > w.cardio ? w.strength : w.cardio;
        if (on === null || d < on) on = d;
      }
    }
    return { unlocked: on !== null, unlockedOn: on, progress: null };
  },
  threeMeals: (f) => {
    const on = firstDay(
      f.days,
      (d) => d.meals.breakfast > 0 && d.meals.lunch > 0 && d.meals.dinner > 0,
    );
    return { unlocked: on !== null, unlockedOn: on, progress: null };
  },
  wellFuelled: (f) => {
    // Two-sided corridor with a floor on entries — never a reward for eating less.
    const on = firstDay(f.days, (d) => {
      if (d.workoutCount < 1 || d.foodLogCount < 3) return false;
      if (d.targetKcal === null || d.targetKcal <= 0) return false;
      const ratio = d.kcalEaten / d.targetKcal;
      return ratio >= 0.9 && ratio <= 1.15;
    });
    return { unlocked: on !== null, unlockedOn: on, progress: null };
  },
  proteinWeek: (f) => {
    const weeks = allWeeks(f)
      .filter((w) => w.protein.closed)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const first = weeks[0];
    return {
      unlocked: !!first,
      unlockedOn: first ? weekEndOrToday(first.weekStart, f.today) : null,
      progress: null,
    };
  },
  proteinStreak4: (f) => {
    let run = 0;
    let on: string | null = null;
    for (const w of f.rhythm.weeks) {
      if (w.rings.isPaused) continue;
      if (w.rings.protein.closed) {
        run += 1;
        if (run >= 4 && on === null) on = shiftIsoDate(w.weekStart, 6);
      } else {
        run = 0;
      }
    }
    return {
      unlocked: on !== null,
      unlockedOn: on,
      progress: { current: Math.min(run, 4), target: 4 },
    };
  },
  bridgeDay: (f) => {
    const on = firstDay(f.days, (d) => d.bridgeProteinG >= 25);
    return { unlocked: on !== null, unlockedOn: on, progress: null };
  },
  firstRhythm: (f) => {
    const first = f.rhythm.weeks.find((w) => w.outcome === 'rhythm');
    return {
      unlocked: f.rhythm.lifetimeWeeks >= 1,
      unlockedOn: first ? shiftIsoDate(first.weekStart, 6) : null,
      progress: null,
    };
  },
  rhythm4: (f) => rhythmEval(f, 4),
  rhythm12: (f) => rhythmEval(f, 12),
  rhythm26: (f) => rhythmEval(f, 26),
  fullWeek: (f) => {
    const weeks = allWeeks(f)
      .filter((w) => w.isFull)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const first = weeks[0];
    return {
      unlocked: !!first,
      unlockedOn: first ? weekEndOrToday(first.weekStart, f.today) : null,
      progress: null,
    };
  },
  fullWeek4: (f) => {
    const weeks = allWeeks(f)
      .filter((w) => w.isFull)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const fourth = weeks[3];
    return {
      unlocked: weeks.length >= 4,
      unlockedOn: fourth ? weekEndOrToday(fourth.weekStart, f.today) : null,
      progress: { current: Math.min(weeks.length, 4), target: 4 },
    };
  },
  comeback: (f) => {
    // A rhythm week after >= 2 consecutive completed non-rhythm weeks, with an earlier rhythm week.
    let seenRhythm = false;
    let gap = 0;
    for (const w of f.rhythm.weeks) {
      if (w.outcome === 'paused') continue;
      if (w.outcome === 'rhythm') {
        if (seenRhythm && gap >= 2) {
          return {
            unlocked: true,
            unlockedOn: shiftIsoDate(w.weekStart, 6),
            progress: null,
          };
        }
        seenRhythm = true;
        gap = 0;
      } else if (seenRhythm) {
        gap += 1;
      }
    }
    return NO;
  },
  goodPause: (f) => {
    for (const p of [...f.pauses].sort((a, b) =>
      a.from.localeCompare(b.from),
    )) {
      if (daysBetween(p.from, p.to) + 1 < 5) continue;
      if (p.to >= f.today) continue;
      const hit = firstDay(f.days, (d) => {
        const after = daysBetween(p.to, d.date);
        return (
          after >= 1 &&
          after <= 3 &&
          (d.foodLogCount >= 2 || d.workoutCount >= 1)
        );
      });
      if (hit) return { unlocked: true, unlockedOn: hit, progress: null };
    }
    return NO;
  },
  weekendKeeper: (f) => {
    const byDate = new Map(f.days.map((d) => [d.date, d]));
    const sorted = sortedDays(f.days);
    if (sorted.length === 0) return NO;
    // Saturdays (Mon-based week: start + 5), oldest first.
    let sat = shiftIsoDate(weekStartFor(sorted[0].date), 5);
    let run = 0;
    for (; shiftIsoDate(sat, 1) <= f.today; sat = shiftIsoDate(sat, 7)) {
      const sun = shiftIsoDate(sat, 1);
      const states = [sat, sun].map((dt) =>
        classifyDay(byDate.get(dt), dt, f.dayContext),
      );
      if (states.every((s) => s === 'paused')) continue;
      if (states.every((s) => s === 'kept' || s === 'paused')) {
        run += 1;
        if (run >= 4)
          return { unlocked: true, unlockedOn: sun, progress: null };
      } else {
        run = 0;
      }
    }
    return {
      unlocked: false,
      unlockedOn: null,
      progress: { current: Math.min(run, 4), target: 4 },
    };
  },
  fullMonth: (f) => {
    const byStart = new Map(f.rhythm.weeks.map((w) => [w.weekStart, w]));
    const months = new Set<string>();
    for (const w of f.rhythm.weeks) {
      for (const d of weekDates(w.weekStart)) months.add(d.slice(0, 7));
    }
    let best: string | null = null;
    for (const month of [...months].sort()) {
      const starts = new Set<string>();
      const inMonth = new Map<string, number>();
      for (let day = 1; day <= 31; day += 1) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        if (date.slice(0, 7) !== month || shiftIsoDate(date, 0) !== date)
          continue;
        const ws = weekStartFor(date);
        starts.add(ws);
        inMonth.set(ws, (inMonth.get(ws) ?? 0) + 1);
      }
      const needed = [...starts].filter((ws) => (inMonth.get(ws) ?? 0) >= 4);
      if (needed.length === 0) continue;
      const ok = needed.every((ws) => {
        const w = byStart.get(ws);
        return !!w && w.outcome === 'rhythm' && w.rings.isComplete;
      });
      if (ok) {
        const end = shiftIsoDate(needed[needed.length - 1], 6);
        if (best === null || end < best) best = end;
      }
    }
    return { unlocked: best !== null, unlockedOn: best, progress: null };
  },
  trendReady: (f) => {
    const weighDays = sortedDays(f.days).filter((d) => d.weightLogged);
    let lo = 0;
    for (let hi = 0; hi < weighDays.length; hi += 1) {
      while (daysBetween(weighDays[lo].date, weighDays[hi].date) > 27) lo += 1;
      if (hi - lo + 1 >= 8) {
        return {
          unlocked: true,
          unlockedOn: weighDays[hi].date,
          progress: null,
        };
      }
    }
    const recent = weighDays.filter(
      (d) => daysBetween(d.date, f.today) <= 27,
    ).length;
    return {
      unlocked: false,
      unlockedOn: null,
      progress: { current: Math.min(recent, 8), target: 8 },
    };
  },
  adaptiveOn: (f) => ({
    unlocked: f.flags.adaptiveTdeeAvailable,
    unlockedOn: null,
    progress: null,
  }),
  bodyGoal2kg: (f) => {
    const {
      startWeightKg: start,
      trendWeightKg: trend,
      goal,
      heightCm,
    } = f.body;
    if (start === null || trend === null || !goal || goal === 'maintain')
      return NO;
    const moved = goal === 'lose' ? start - trend : trend - start;
    const unlocked =
      moved >= 2 &&
      (goal === 'lose'
        ? bmiOk(trend, heightCm)
        : heightCm !== null &&
          heightCm > 0 &&
          calculateBMI(trend, heightCm) <= BMI_HEALTHY_MAX);
    return {
      unlocked,
      unlockedOn: null,
      progress: { current: Math.max(0, Math.min(moved, 2)), target: 2 },
    };
  },
  strongAsYou: (f) => ({
    unlocked: f.strength.bodyweightLiftDone,
    unlockedOn: null,
    progress: null,
  }),
  goalReached: (f) => {
    const {
      startWeightKg: start,
      trendWeightKg: trend,
      targetWeightKg: target,
      goal,
      heightCm,
    } = f.body;
    if (
      start === null ||
      trend === null ||
      target === null ||
      !goal ||
      goal === 'maintain'
    )
      return NO;
    if (Math.abs(start - target) < MIN_TARGET_DIFF_KG) return NO;
    // Never celebrate a target below the healthy BMI range.
    if (!bmiOk(target, heightCm)) return NO;
    return {
      unlocked: Math.abs(trend - target) <= 0.3,
      unlockedOn: null,
      progress: null,
    };
  },
  healthLinked: (f) => ({
    unlocked: f.flags.healthConnected && f.flags.healthWorkoutImported,
    unlockedOn: null,
    progress: null,
  }),
  patternFound: (f) => ({
    unlocked: f.flags.patternFound,
    unlockedOn: null,
    progress: null,
  }),
  reviews4: (f) => ({
    unlocked: f.flags.reviewsViewed >= 4,
    unlockedOn: null,
    progress: { current: Math.min(f.flags.reviewsViewed, 4), target: 4 },
  }),
  sharedFirst: (f) => ({
    unlocked: f.flags.sharedCount >= 1,
    unlockedOn: null,
    progress: null,
  }),
  oneYear: (f) => {
    const created = f.flags.accountCreatedAt.slice(0, 10);
    const ageOk =
      /^\d{4}-\d{2}-\d{2}$/.test(created) &&
      daysBetween(created, f.today) >= 365;
    const from = shiftIsoDate(f.today, -29);
    const kept = f.days.filter(
      (d) => d.date >= from && d.date <= f.today && isKept(f, d),
    ).length;
    return { unlocked: ageOk && kept >= 8, unlockedOn: null, progress: null };
  },
};

function rhythmEval(f: AchievementFacts, n: number): Eval {
  const best = rhythmBest(f);
  const unlocked = best >= n;
  return {
    unlocked,
    unlockedOn: unlocked ? rhythmRunReached(f, n) : null,
    progress: { current: Math.min(best, n), target: n },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EvaluateOptions {
  /** also evaluate `phase: 'later'` stamps (default false: only the Release-1 set) */
  includeLater?: boolean;
}

export function evaluateAchievements(
  facts: AchievementFacts,
  opts: EvaluateOptions = {},
): AchievementStatus[] {
  const out: AchievementStatus[] = [];
  for (const def of ACHIEVEMENT_CATALOG) {
    if (def.phase === 'later' && !opts.includeLater) continue;
    const e =
      def.rule.kind === 'count'
        ? evalCount(def.rule, facts)
        : CUSTOM[def.rule.check](facts);
    const withheld = e.unlocked && def.weightRelated && facts.careFlagged;
    out.push({
      id: def.id,
      unlocked: e.unlocked && !withheld,
      unlockedOn: e.unlocked && !withheld ? e.unlockedOn : null,
      progress: e.progress,
      withheld,
    });
  }
  return out;
}

/** Unlocked statuses the user has not seen yet. */
export function newlyUnlocked(
  prevSeen: ReadonlySet<string>,
  now: readonly AchievementStatus[],
): AchievementStatus[] {
  return now.filter((s) => s.unlocked && !prevSeen.has(s.id));
}

/**
 * No revocation: previously persisted unlocks stay unlocked (date kept), new unlocks get their
 * provable date or `today` as detection date. Returns the updated persisted record + statuses.
 */
export function mergeUnlocked(
  persisted: Readonly<Record<string, string>>,
  statuses: readonly AchievementStatus[],
  today: string,
): { record: Record<string, string>; statuses: AchievementStatus[] } {
  const record: Record<string, string> = { ...persisted };
  const merged = statuses.map((s) => {
    const prev = record[s.id];
    if (s.unlocked) {
      if (!prev) record[s.id] = s.unlockedOn ?? today;
      else if (s.unlockedOn && s.unlockedOn < prev) record[s.id] = s.unlockedOn;
      return { ...s, unlockedOn: record[s.id] };
    }
    if (prev)
      return { ...s, unlocked: true, withheld: false, unlockedOn: prev };
    return s;
  });
  return { record, statuses: merged };
}

export const MAX_CELEBRATIONS_PER_OPEN = 1;
export const MAX_CELEBRATIONS_PER_DAY = 2;

export interface UnlockPresentation {
  /** show a celebration moment for these (mark as seen) */
  celebrate: AchievementStatus[];
  /** unlocked but throttled: stays unseen, shown later / in the profile */
  stacked: AchievementStatus[];
  /** mark as seen without any moment (restore after reinstall) */
  silent: AchievementStatus[];
  /** "found again: N stamps" summary hint (reinstall) */
  restoredCount: number;
  /** ids to add to the persisted seen set right now */
  markSeen: string[];
}

/**
 * Celebration throttle (docs/05 §2.6): `seen === null` means this device never stored a seen set
 * (fresh install / device change): everything already earned is marked silently and summarized.
 * Otherwise at most 1 moment per app open and 2 per day; the rest is stacked.
 */
export function planUnlockPresentation(args: {
  seen: ReadonlySet<string> | null;
  statuses: readonly AchievementStatus[];
  celebratedToday: number;
  celebratedThisOpen: number;
}): UnlockPresentation {
  const unlocked = args.statuses.filter((s) => s.unlocked);
  if (args.seen === null) {
    return {
      celebrate: [],
      stacked: [],
      silent: unlocked,
      restoredCount: unlocked.length,
      markSeen: unlocked.map((s) => s.id),
    };
  }
  const fresh = newlyUnlocked(args.seen, args.statuses);
  const room = Math.max(
    0,
    Math.min(
      MAX_CELEBRATIONS_PER_OPEN - args.celebratedThisOpen,
      MAX_CELEBRATIONS_PER_DAY - args.celebratedToday,
    ),
  );
  const celebrate = fresh.slice(0, room);
  return {
    celebrate,
    stacked: fresh.slice(room),
    silent: [],
    restoredCount: 0,
    markSeen: celebrate.map((s) => s.id),
  };
}
