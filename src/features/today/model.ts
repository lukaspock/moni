/**
 * Small pure presentation helpers for the Today screen (mapping already-computed domain values
 * to copy kinds / visibility). Real calculations live in `src/domain`.
 */
import { computeKcalRingModel, daysAwayFrom, type LedgerDay } from '@/domain';

export type RingStatusKind =
  'roomLeft' | 'nearLevel' | 'onLevel' | 'above' | 'springTide';

export interface RingStatus {
  kind: RingStatusKind;
  kcal: number;
}

/** Calm wording for the ring state; `null` without a limit. Never a warning. */
export function ringStatus(input: {
  eatenKcal: number;
  baseKcal: number;
  bonusKcal: number;
}): RingStatus | null {
  const m = computeKcalRingModel(input);
  if (m.limitKcal <= 0) return null;
  if (m.isOver) {
    if (m.overKcal <= m.limitKcal * 0.03) return { kind: 'onLevel', kcal: 0 };
    if (m.overKcal > m.limitKcal * 0.15) {
      return { kind: 'springTide', kcal: m.overKcal };
    }
    return { kind: 'above', kcal: m.overKcal };
  }
  if (m.remainingKcal <= 0) return { kind: 'onLevel', kcal: 0 };
  if (m.remainingKcal <= m.limitKcal * 0.05) {
    return { kind: 'nearLevel', kcal: m.remainingKcal };
  }
  return { kind: 'roomLeft', kcal: m.remainingKcal };
}

/** Day of the year (1..366) of a `YYYY-MM-DD` date. */
export function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (
    Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1
  );
}

/** Days since the newest day with any activity (food, workout, weight); 0 for new users. */
export function daysAwayFromLedger(
  days: readonly LedgerDay[],
  today: string,
): number {
  let last: string | null = null;
  for (const d of days) {
    if (d.date > today) continue;
    if (d.foodLogCount > 0 || d.workoutCount > 0 || d.weightLogged) {
      if (last === null || d.date > last) last = d.date;
    }
  }
  return daysAwayFrom(last, today);
}

/** Hours between an ISO timestamp and `now`; null when missing or in the future. */
export function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const ms = now.getTime() - new Date(iso).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms / 3_600_000 : null;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return daysAwayFrom(fromIso, toIso);
}

export interface StartStep {
  id: 'meal' | 'weight' | 'training';
  done: boolean;
}

/** First-run checklist; hidden when everything is done or the account is 7+ days old. */
export function startChecklist(input: {
  hasFood: boolean;
  hasWeight: boolean;
  hasTraining: boolean;
  healthConnected: boolean;
  accountAgeDays: number | null;
}): { steps: StartStep[]; visible: boolean } {
  const steps: StartStep[] = [
    { id: 'meal', done: input.hasFood },
    { id: 'weight', done: input.hasWeight },
    { id: 'training', done: input.hasTraining || input.healthConnected },
  ];
  const allDone = steps.every((s) => s.done);
  const young = input.accountAgeDays === null || input.accountAgeDays < 7;
  return { steps, visible: !allDone && young };
}
