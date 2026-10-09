// Planning + scheduling orchestration for the smart nudges (docs/05 §6). No expo imports:
// everything platform-specific comes in through `NudgeNotifier`, so it is testable with a fake.
import {
  planNudges,
  registerAppOpen,
  type LedgerDay,
  type NudgeKind,
  type PauseRange,
  type RhythmState,
} from '../../domain';
import {
  buildNudgeContent,
  effectivePrefs,
  localDateFromAt,
  reconcileNudges,
  toScheduled,
  type NudgeSettings,
  type NudgeTranslate,
  type ScheduledNudge,
} from './nudgeLogic';

export interface NudgeNotifier {
  /** cancels every pending notification whose id starts with `moeni-nudge-` */
  cancelAllNudges(): Promise<void>;
  schedule(args: {
    id: string;
    kind: NudgeKind;
    title: string;
    body: string;
    date: Date;
  }): Promise<void>;
}

export interface NudgeInputs {
  /** local `YYYY-MM-DDTHH:mm` */
  now: string;
  ledger: readonly LedgerDay[];
  rhythm: RhythmState;
  plannedWeekdays: ReadonlySet<number>;
  pauses: readonly PauseRange[];
  careFlagged: boolean;
  lastWorkoutEndedAt: string | null;
  permissionGranted: boolean;
  /** the app is in the foreground right now (counts as an app open) */
  appOpened: boolean;
  t: NudgeTranslate;
  monthName: (isoDate: string) => string;
}

function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  return Math.max(
    0,
    Math.round(
      (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
    ),
  );
}

function latestBaseKcal(ledger: readonly LedgerDay[]): number | null {
  for (let i = ledger.length - 1; i >= 0; i -= 1) {
    const v = ledger[i].baseKcal;
    if (v !== null && v > 0) return v;
  }
  return null;
}

/**
 * One planning round: settle past nudges (sent/opened/ignored), register the app open, then
 * replace all pending nudges by a fresh plan. Pure w.r.t. `settings`; returns the next settings
 * (the caller persists them) after the notifier calls succeeded.
 */
export async function rescheduleNudges(
  settings: NudgeSettings,
  inputs: NudgeInputs,
  notifier: NudgeNotifier,
): Promise<NudgeSettings> {
  const today = inputs.now.slice(0, 10);

  const reconciled = reconcileNudges({
    state: settings.state,
    scheduled: settings.scheduled,
    openedIds: settings.openedIds,
    now: inputs.now,
  });
  let state = reconciled.state;
  let lastOpenDate = settings.lastOpenDate;
  const lastOpenDaysAgo = lastOpenDate ? daysBetween(lastOpenDate, today) : 0;
  if (inputs.appOpened) {
    state = registerAppOpen(state);
    lastOpenDate = today;
  }
  // Tapped ids are consumed; keep only those still pending (a future nudge can't be tapped yet).
  const pendingIds = new Set(reconciled.remaining.map((s) => s.id));
  const next: NudgeSettings = {
    ...settings,
    state,
    lastOpenDate: lastOpenDate ?? today,
    openedIds: settings.openedIds.filter((id) => pendingIds.has(id)),
    scheduled: [],
  };

  await notifier.cancelAllNudges();
  if (!settings.masterEnabled || !inputs.permissionGranted) return next;

  const plans = planNudges({
    now: inputs.now,
    prefs: effectivePrefs(settings.prefs, settings.suppressedDate),
    state,
    ledger: inputs.ledger,
    rhythm: inputs.rhythm,
    plan: { weekdays: inputs.plannedWeekdays },
    lastOpenDaysAgo: inputs.appOpened ? 0 : lastOpenDaysAgo,
    pauses: inputs.pauses,
    lastWorkoutEndedAt: inputs.lastWorkoutEndedAt,
    careFlagged: inputs.careFlagged,
  });

  const baseKcal = latestBaseKcal(inputs.ledger);
  const scheduled: ScheduledNudge[] = [];
  for (const plan of plans) {
    const content = buildNudgeContent(plan, inputs.t, {
      baseKcal,
      monthName: inputs.monthName,
      doorOpenCount: state.doorOpenCount ?? 0,
    });
    if (!content) continue;
    const entry = toScheduled(plan);
    await notifier.schedule({
      id: entry.id,
      kind: plan.kind,
      title: content.title,
      body: content.body,
      date: localDateFromAt(plan.at),
    });
    scheduled.push(entry);
  }
  return { ...next, scheduled };
}
