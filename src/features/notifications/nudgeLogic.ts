// Pure helpers around `src/domain/nudges.ts` (no RN/Expo imports, unit-tested):
// settings migration, outcome reconciliation, content building, quiet-mode maths.
import {
  DEFAULT_NUDGE_PREFS,
  EMPTY_NUDGE_STATE,
  MUTE_DAYS,
  NUDGE_CATEGORY,
  registerNudgeOutcome,
  registerNudgeSent,
  shiftIsoDate,
  type NudgeCategory,
  type NudgeKind,
  type NudgePlan,
  type NudgePrefs,
  type NudgeState,
} from '../../domain';

/** Notification identifier prefix (meal reminders use `moeni-meal-`). */
export const NUDGE_ID_PREFIX = 'moeni-nudge-';
export const NUDGE_CATEGORY_ID = 'moeni-nudge';
export const ACTION_NOT_TODAY = 'notToday';
export const ACTION_LESS_OF_THIS = 'lessOfThis';

/** A nudge we handed to iOS and have not reconciled yet. */
export interface ScheduledNudge {
  id: string;
  kind: NudgeKind;
  /** local `YYYY-MM-DD` */
  date: string;
  /** local `YYYY-MM-DDTHH:mm` */
  at: string;
}

export interface NudgeSettings {
  /** master switch for the smart nudges (default off until the user opts in) */
  masterEnabled: boolean;
  prefs: NudgePrefs;
  state: NudgeState;
  scheduled: ScheduledNudge[];
  /** notification ids the user tapped (default action), consumed by `reconcileNudges` */
  openedIds: string[];
  /** `YYYY-MM-DD` of the last app open, null = never recorded */
  lastOpenDate: string | null;
  /** "Not again today" -> no more nudges on this date */
  suppressedDate: string | null;
  /** one-time migration from the Sprint-2 meal reminders has run */
  migrated: boolean;
}

export const INITIAL_NUDGE_SETTINGS: NudgeSettings = {
  masterEnabled: false,
  prefs: DEFAULT_NUDGE_PREFS,
  state: EMPTY_NUDGE_STATE,
  scheduled: [],
  openedIds: [],
  lastOpenDate: null,
  suppressedDate: null,
  migrated: false,
};

/**
 * D12: the three fixed meal reminders are opt-in (default off, already the store default).
 * Users who had them on keep them (their flag is untouched) and — since they already granted
 * the permission and are used to prompts — start with the smart nudges on, too.
 */
export function migrateNudgeSettings(
  current: NudgeSettings,
  legacyMealRemindersEnabled: boolean,
): NudgeSettings {
  if (current.migrated) return current;
  return {
    ...current,
    migrated: true,
    masterEnabled: current.masterEnabled || legacyMealRemindersEnabled,
  };
}

// -- ids ---------------------------------------------------------------------

export function nudgeId(kind: NudgeKind, date: string): string {
  return `${NUDGE_ID_PREFIX}${kind}-${date}`;
}

export function toScheduled(plan: NudgePlan): ScheduledNudge {
  const date = plan.at.slice(0, 10);
  return { id: nudgeId(plan.kind, date), kind: plan.kind, date, at: plan.at };
}

/** `YYYY-MM-DDTHH:mm` (local) -> Date in the device time zone. */
export function localDateFromAt(at: string): Date {
  const [date, time = '00:00'] = at.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0, 0, 0);
}

export function localNowString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// -- prefs -------------------------------------------------------------------

/** Prefs as the planner should see them: "not again today" behaves like quiet mode for today. */
export function effectivePrefs(
  prefs: NudgePrefs,
  suppressedDate: string | null,
): NudgePrefs {
  if (!suppressedDate) return prefs;
  const quietUntil =
    prefs.quietUntil && prefs.quietUntil > suppressedDate
      ? prefs.quietUntil
      : suppressedDate;
  return { ...prefs, quietUntil };
}

/** Quiet mode until `today + days`; days <= 0 switches it off. */
export function quietUntilFor(today: string, days: number): string | null {
  return days > 0 ? shiftIsoDate(today, days) : null;
}

export function isQuietModeActive(prefs: NudgePrefs, today: string): boolean {
  return prefs.quietUntil !== null && prefs.quietUntil >= today;
}

/** "Less of this": mutes every kind of the category for 14 days. */
export function muteCategory(
  state: NudgeState,
  category: NudgeCategory,
  today: string,
): NudgeState {
  const until = shiftIsoDate(today, MUTE_DAYS);
  const muted = { ...state.mutedUntilByKind };
  for (const kind of Object.keys(NUDGE_CATEGORY) as NudgeKind[]) {
    if (NUDGE_CATEGORY[kind] === category) muted[kind] = until;
  }
  return { ...state, mutedUntilByKind: muted };
}

export type QuieterChoice = 'less' | 'reviewsOnly' | 'off';

/** Result of the "Should we be quieter?" question. Always marks the question as asked. */
export function applyQuieterChoice(
  settings: Pick<NudgeSettings, 'masterEnabled' | 'prefs' | 'state'>,
  choice: QuieterChoice,
): Pick<NudgeSettings, 'masterEnabled' | 'prefs' | 'state'> {
  const state = { ...settings.state, askedQuieter: true };
  if (choice === 'off') {
    return { masterEnabled: false, prefs: settings.prefs, state };
  }
  const categories: Record<NudgeCategory, boolean> =
    choice === 'reviewsOnly'
      ? {
          meals: false,
          training: false,
          reviews: true,
          rhythm: false,
          weight: false,
        }
      : {
          ...settings.prefs.categories,
          meals: false,
          training: false,
          weight: false,
        };
  return {
    masterEnabled: settings.masterEnabled,
    prefs: { ...settings.prefs, categories },
    state,
  };
}

// -- reconciliation ----------------------------------------------------------

/**
 * Settle every scheduled nudge whose time has passed: it counts as sent, and as opened if the
 * user tapped it, otherwise as ignored (-> 3x ignored mutes the kind, see `registerNudgeOutcome`).
 * Future entries are returned unchanged (the caller replans them anyway).
 */
export function reconcileNudges(args: {
  state: NudgeState;
  scheduled: readonly ScheduledNudge[];
  openedIds: readonly string[];
  /** local `YYYY-MM-DDTHH:mm` */
  now: string;
}): { state: NudgeState; remaining: ScheduledNudge[] } {
  const today = args.now.slice(0, 10);
  const opened = new Set(args.openedIds);
  let state = args.state;
  const remaining: ScheduledNudge[] = [];
  const due = [...args.scheduled]
    .filter((s) => s.at <= args.now)
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  for (const s of args.scheduled) if (s.at > args.now) remaining.push(s);
  for (const s of due) {
    state = registerNudgeSent(state, s.kind, s.date);
    state = registerNudgeOutcome(state, s.kind, opened.has(s.id), today);
  }
  return { state, remaining };
}

// -- content -----------------------------------------------------------------

export type NudgeTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export interface NudgeContentContext {
  /** latest known daily limit without bonus, for `trainingMorning` */
  baseKcal: number | null;
  /** localized long month name of the reviewed month, for `monthReview` */
  monthName: (isoDate: string) => string;
  /** number of door-open nudges already sent (0..2 -> early/mid/late) */
  doorOpenCount: number;
}

/** Localized title/body at planning time, or null if a needed value is missing. */
export function buildNudgeContent(
  plan: NudgePlan,
  t: NudgeTranslate,
  ctx: NudgeContentContext,
): { title: string; body: string } | null {
  const date = plan.at.slice(0, 10);
  switch (plan.kind) {
    case 'trainingMorning': {
      if (ctx.baseKcal === null || ctx.baseKcal <= 0) return null;
      const opts = { kcal: Math.round(ctx.baseKcal) };
      return {
        title: t('nudges.trainingMorning.title', opts),
        body: t('nudges.trainingMorning.body', opts),
      };
    }
    case 'rhythmChance':
      return {
        title: t('nudges.taktChance.title'),
        body: t('nudges.taktChance.body'),
      };
    case 'doorOpen': {
      const stage = (['early', 'mid', 'late'] as const)[
        Math.min(2, Math.max(0, ctx.doorOpenCount))
      ];
      return {
        title: t(`nudges.doorOpen.${stage}.title`),
        body: t(`nudges.doorOpen.${stage}.body`),
      };
    }
    case 'monthReview': {
      const opts = { month: ctx.monthName(shiftIsoDate(date, -1)) };
      return {
        title: t('nudges.monthReview.title', opts),
        body: t('nudges.monthReview.body', opts),
      };
    }
    default:
      return {
        title: t(`nudges.${plan.kind}.title`),
        body: t(`nudges.${plan.kind}.body`),
      };
  }
}

/** Parses `moeni-nudge-<kind>-<YYYY-MM-DD>`; null for foreign ids. */
export function parseNudgeId(
  id: string,
): { kind: NudgeKind; date: string } | null {
  if (!id.startsWith(NUDGE_ID_PREFIX)) return null;
  const m = /^(\w+)-(\d{4}-\d{2}-\d{2})$/.exec(
    id.slice(NUDGE_ID_PREFIX.length),
  );
  if (!m || !(m[1] in NUDGE_CATEGORY)) return null;
  return { kind: m[1] as NudgeKind, date: m[2] };
}
