/**
 * Local notification planning (docs/05 §6). Pure: given "now", prefs, history and the ledger it
 * returns at most one nudge per day for the next 7 days. The caller schedules/cancels (and re-plans
 * after every relevant action). Hard rules: max 1/day, max 4/week, never before 08:00 / after 21:30,
 * never during a pause or "quiet mode", never the same category twice in a row, auto-calming.
 * Timestamps are local `YYYY-MM-DDTHH:mm` strings (no timezone maths here).
 */

import { shiftIsoDate } from './adaptive';
import {
  isPausedOn,
  weekStartFor,
  weekdayOfIso,
  type LedgerDay,
  type PauseRange,
  type RhythmState,
} from './rhythm';

export type NudgeKind =
  | 'eveningNote'
  | 'trainingMorning'
  | 'proteinBridge'
  | 'sundayReview'
  | 'weighIn'
  | 'rhythmChance'
  | 'doorOpen'
  | 'monthReview';

export type NudgeCategory =
  'meals' | 'training' | 'reviews' | 'rhythm' | 'weight';

export const NUDGE_CATEGORY: Record<NudgeKind, NudgeCategory> = {
  eveningNote: 'meals',
  trainingMorning: 'training',
  proteinBridge: 'training',
  sundayReview: 'reviews',
  monthReview: 'reviews',
  weighIn: 'weight',
  rhythmChance: 'rhythm',
  doorOpen: 'rhythm',
};

/** Release-1 triggers (docs/05 §9: eveningNote, proteinBridge, sundayReview); the rest is planned but "later" in UI. */
export const NUDGE_PHASE: Record<NudgeKind, 'release1' | 'later'> = {
  eveningNote: 'release1',
  proteinBridge: 'release1',
  sundayReview: 'release1',
  trainingMorning: 'later',
  weighIn: 'later',
  rhythmChance: 'later',
  doorOpen: 'later',
  monthReview: 'later',
};

export const MAX_NUDGES_PER_DAY = 1;
export const MAX_NUDGES_PER_WEEK = 4;
export const EARLIEST_MINUTES = 8 * 60;
export const LATEST_MINUTES = 21 * 60 + 30;
export const PLAN_HORIZON_DAYS = 7;
export const IGNORED_BEFORE_MUTE = 3;
export const MUTE_DAYS = 14;
export const DOOR_OPEN_OFFSETS = [3, 10, 25] as const;
export const DOOR_OPEN_SILENCE_DAYS = 60;
export const PROTEIN_BRIDGE_RATIO = 0.6;
export const MIN_KEPT_DAYS_FOR_MONTH_REVIEW = 7;

export interface NudgePrefs {
  categories: Record<NudgeCategory, boolean>;
  /** "quiet mode" until this date (inclusive), null = off */
  quietUntil: string | null;
  /** user-chosen narrowing of the allowed window (minutes since midnight); never widens beyond 08:00–21:30 */
  earliestMinutes: number;
  latestMinutes: number;
  /** 0 = Sunday … 6 = Saturday (default Monday) */
  weighInWeekday: number;
}

export const DEFAULT_NUDGE_PREFS: NudgePrefs = {
  categories: {
    meals: true,
    training: true,
    reviews: true,
    rhythm: true,
    weight: false,
  },
  quietUntil: null,
  earliestMinutes: EARLIEST_MINUTES,
  latestMinutes: LATEST_MINUTES,
  weighInWeekday: 1,
};

export interface NudgeState {
  /** `YYYY-MM-DD` the kind was last sent */
  lastSentByKind: Partial<Record<NudgeKind, string>>;
  ignoredStreak: Partial<Record<NudgeKind, number>>;
  /** kind is muted through this date (inclusive) */
  mutedUntilByKind: Partial<Record<NudgeKind, string>>;
  sentThisWeek: number;
  /** week (Monday) `sentThisWeek` refers to; a different current week counts as 0 */
  sentWeekStart?: string;
  /** door-open nudges sent since the last app open (0..3) */
  doorOpenCount?: number;
  /** how many times a kind was auto-muted (2 -> ask "quieter?") */
  muteEvents?: number;
  askedQuieter?: boolean;
}

export const EMPTY_NUDGE_STATE: NudgeState = {
  lastSentByKind: {},
  ignoredStreak: {},
  mutedUntilByKind: {},
  sentThisWeek: 0,
};

export interface NudgePlan {
  kind: NudgeKind;
  /** local `YYYY-MM-DDTHH:mm` */
  at: string;
  /** i18n base key: `nudges.<kind>`; the variant rotates the wording */
  payloadKey: string;
  variant: 0 | 1 | 2;
}

export interface PlanNudgesArgs {
  /** local `YYYY-MM-DDTHH:mm` */
  now: string;
  prefs: NudgePrefs;
  state: NudgeState;
  ledger: readonly LedgerDay[];
  rhythm: RhythmState;
  plan: { weekdays: ReadonlySet<number> };
  lastOpenDaysAgo: number;
  pauses: readonly PauseRange[];
  /** local `YYYY-MM-DDTHH:mm` of the end of today's last workout */
  lastWorkoutEndedAt: string | null;
  careFlagged?: boolean;
}

// -- time helpers -----------------------------------------------------------

function splitLocal(ts: string): { date: string; minutes: number } {
  const [date, time = '00:00'] = ts.split('T');
  const [h, m] = time.split(':').map(Number);
  return { date, minutes: (h || 0) * 60 + (m || 0) };
}

function joinLocal(date: string, minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${date}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function dayOfYear(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
}

const PRIORITY: readonly NudgeKind[] = [
  'proteinBridge',
  'monthReview',
  'sundayReview',
  'rhythmChance',
  'trainingMorning',
  'weighIn',
  'doorOpen',
  'eveningNote',
];

function isActive(d: LedgerDay): boolean {
  return d.foodLogCount > 0 || d.workoutCount > 0;
}

export function planNudges(args: PlanNudgesArgs): NudgePlan[] {
  const { prefs, state, ledger } = args;
  const { date: today, minutes: nowMin } = splitLocal(args.now);
  const earliest = Math.max(EARLIEST_MINUTES, prefs.earliestMinutes);
  const latest = Math.min(LATEST_MINUTES, prefs.latestMinutes);
  if (latest < earliest) return [];

  const byDate = new Map(ledger.map((d) => [d.date, d]));
  const todayDay = byDate.get(today);
  const currentWeek = weekStartFor(today);
  const counts = new Map<string, number>();
  counts.set(
    currentWeek,
    state.sentWeekStart === currentWeek ? state.sentThisWeek : 0,
  );

  // category of the most recently sent nudge (for the "never twice in a row" rule)
  let prevCategory: NudgeCategory | null = null;
  let prevSentOn = '';
  for (const [kind, date] of Object.entries(state.lastSentByKind) as [
    NudgeKind,
    string,
  ][]) {
    if (date >= prevSentOn) {
      prevSentOn = date;
      prevCategory = NUDGE_CATEGORY[kind];
    }
  }

  const weighDates = ledger
    .filter((d) => d.weightLogged)
    .map((d) => d.date)
    .sort();
  const lastWeighIn = weighDates[weighDates.length - 1] ?? null;
  const openDate = shiftIsoDate(today, -Math.max(0, args.lastOpenDaysAgo));

  const out: NudgePlan[] = [];
  for (let offset = 0; offset < PLAN_HORIZON_DAYS; offset += 1) {
    const date = shiftIsoDate(today, offset);
    if (prefs.quietUntil && date <= prefs.quietUntil) continue;
    if (isPausedOn(args.pauses, date)) continue;
    const weekday = weekdayOfIso(date);
    const ws = weekStartFor(date);
    if ((counts.get(ws) ?? 0) >= MAX_NUDGES_PER_WEEK) continue;

    const clamp = (minutes: number) =>
      Math.min(latest, Math.max(earliest, minutes));
    const candidates = new Map<NudgeKind, number>(); // kind -> minutes

    // proteinBridge: only today, 20–40 min after the workout ended
    if (offset === 0 && args.lastWorkoutEndedAt) {
      const ended = splitLocal(args.lastWorkoutEndedAt);
      const target = todayDay?.targetProteinG ?? 0;
      if (ended.date === today && target > 0 && todayDay) {
        const low = todayDay.proteinG / target < PROTEIN_BRIDGE_RATIO;
        let at = ended.minutes + 30;
        if (at <= nowMin && nowMin < ended.minutes + 40) at = nowMin + 1;
        if (low && at > nowMin && at >= earliest && at <= latest) {
          candidates.set('proteinBridge', at);
        }
      }
    }
    // monthReview: 1st of the month, previous month had >= 7 kept days
    if (date.slice(8) === '01') {
      const prefix = shiftIsoDate(date, -1).slice(0, 7);
      const kept = ledger.filter(
        (d) =>
          d.date.startsWith(prefix) &&
          (d.workoutCount > 0 || d.foodLogCount >= 2),
      ).length;
      if (kept >= MIN_KEPT_DAYS_FOR_MONTH_REVIEW)
        candidates.set('monthReview', clamp(9 * 60 + 30));
    }
    // sundayReview
    if (weekday === 0) {
      const weekHasData =
        ws > currentWeek ||
        ledger.some((d) => weekStartFor(d.date) === ws && isActive(d));
      if (weekHasData) candidates.set('sundayReview', clamp(18 * 60));
    }
    // rhythmChance: Thursday of this week, one rhythm week still within reach
    if (
      weekday === 4 &&
      ws === currentWeek &&
      args.rhythm.current >= 2 &&
      args.rhythm.thisWeek === 'in-reach' &&
      !args.careFlagged
    ) {
      const last = state.lastSentByKind.rhythmChance;
      if (!last || last < shiftIsoDate(date, -6))
        candidates.set('rhythmChance', clamp(18 * 60));
    }
    // trainingMorning
    if (args.plan.weekdays.has(weekday)) {
      const done = offset === 0 && (todayDay?.workoutCount ?? 0) > 0;
      if (!done) candidates.set('trainingMorning', clamp(8 * 60 + 30));
    }
    // weighIn (opt-in category)
    if (weekday === prefs.weighInWeekday && !args.careFlagged) {
      const since =
        lastWeighIn === null ? Infinity : dateDiff(lastWeighIn, date);
      if (since >= 7) candidates.set('weighIn', clamp(8 * 60));
    }
    // doorOpen: 3, 10, 25 days after the last open
    const doorIdx = state.doorOpenCount ?? 0;
    if (doorIdx < DOOR_OPEN_OFFSETS.length && args.lastOpenDaysAgo >= 0) {
      if (date === shiftIsoDate(openDate, DOOR_OPEN_OFFSETS[doorIdx])) {
        candidates.set('doorOpen', clamp(17 * 60 + 30));
      }
    }
    // eveningNote: today only when the day is still empty
    if (
      offset > 0 ||
      ((todayDay?.foodLogCount ?? 0) < 2 && (todayDay?.workoutCount ?? 0) === 0)
    ) {
      candidates.set('eveningNote', clamp(20 * 60 + 30));
    }

    for (const kind of PRIORITY) {
      const at = candidates.get(kind);
      if (at === undefined) continue;
      const category = NUDGE_CATEGORY[kind];
      if (!prefs.categories[category]) continue;
      const muted = state.mutedUntilByKind[kind];
      if (muted && date <= muted) continue;
      if (category === prevCategory) continue;
      if (offset === 0 && at <= nowMin) continue;
      out.push({
        kind,
        at: joinLocal(date, at),
        payloadKey: `nudges.${kind}`,
        variant: (dayOfYear(date) % 3) as 0 | 1 | 2,
      });
      counts.set(ws, (counts.get(ws) ?? 0) + 1);
      prevCategory = category;
      break;
    }
  }
  return out;
}

function dateDiff(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/** Record that a nudge was delivered/planned for `date` (call when it is sent). */
export function registerNudgeSent(
  state: NudgeState,
  kind: NudgeKind,
  date: string,
): NudgeState {
  const ws = weekStartFor(date);
  const base = state.sentWeekStart === ws ? state.sentThisWeek : 0;
  const next: NudgeState = {
    ...state,
    lastSentByKind: { ...state.lastSentByKind, [kind]: date },
    sentThisWeek: base + 1,
    sentWeekStart: ws,
  };
  if (kind === 'doorOpen') {
    const count = (state.doorOpenCount ?? 0) + 1;
    next.doorOpenCount = count;
    if (count >= DOOR_OPEN_OFFSETS.length) {
      next.mutedUntilByKind = {
        ...next.mutedUntilByKind,
        doorOpen: shiftIsoDate(date, DOOR_OPEN_SILENCE_DAYS),
      };
    }
  }
  return next;
}

/** Opened = streak reset; ignored three times in a row = the kind is muted for 14 days. */
export function registerNudgeOutcome(
  state: NudgeState,
  kind: NudgeKind,
  opened: boolean,
  today: string,
): NudgeState {
  if (opened) {
    return { ...state, ignoredStreak: { ...state.ignoredStreak, [kind]: 0 } };
  }
  const streak = (state.ignoredStreak[kind] ?? 0) + 1;
  if (streak >= IGNORED_BEFORE_MUTE) {
    return {
      ...state,
      ignoredStreak: { ...state.ignoredStreak, [kind]: 0 },
      mutedUntilByKind: {
        ...state.mutedUntilByKind,
        [kind]: shiftIsoDate(today, MUTE_DAYS),
      },
      muteEvents: (state.muteEvents ?? 0) + 1,
    };
  }
  return {
    ...state,
    ignoredStreak: { ...state.ignoredStreak, [kind]: streak },
  };
}

/** The app was opened: the door-open series starts over. */
export function registerAppOpen(state: NudgeState): NudgeState {
  return { ...state, doorOpenCount: 0 };
}

/** After two auto-mutes in a row, ask once: "Should we be quieter?" */
export function shouldAskQuieter(state: NudgeState): boolean {
  return (state.muteEvents ?? 0) >= 2 && !state.askedQuieter;
}
