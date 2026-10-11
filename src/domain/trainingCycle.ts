/**
 * Training cycle (owner decision, Oct 2026): the plan is a cycle of N days
 * (default 7), each day a routine or rest, repeating forever from an anchor
 * date. On top of that an ordered log of shift events ("Heute nicht" /
 * "Doch trainieren") is replayed from the anchor, so the effective plan for a
 * date is deterministic and idempotent. Pure, no RN imports.
 *
 * Semantics (in sequence terms: the plan from date D on is the list
 * `[s_D, s_D+1, …]`):
 *
 * - **postpone** at D (s_D is training): a rest day is inserted at D, so D's
 *   training moves to D+1 and every following day shifts +1 — up to the next
 *   rest day within one cycle length after D, which absorbs the shift (that
 *   rest day is consumed). After it the plan continues exactly as before. No
 *   rest day within one cycle length → the +1 shift is permanent.
 *   `Mo Push · Di Pull · Mi — · Do Legs`, postpone Mo →
 *   `Mo — · Di Push · Mi Pull · Do Legs`.
 * - **pullForward** at D (s_D is rest): the next training day within one cycle
 *   length moves to D (replacing today's rest), every day after that training
 *   shifts −1, permanently. Rest days between D and that training stay. With a
 *   training right after D that is exactly "the whole plan one day earlier".
 *   `Mo — · Di Push · Mi Pull · Do —`, pull forward Mo →
 *   `Mo Push · Di Pull · Mi — · Do (old Fr) …`.
 *
 * Rules of the event log:
 * - events are replayed sorted by date (stable: input order breaks ties, the
 *   feature layer passes them sorted by `created_at`), duplicate ids count once;
 * - at most one event per date (later ones on the same date are ignored — the
 *   UI offers "undo" instead, which deletes the event);
 * - an event that doesn't apply (postpone on a rest day, pull forward on a
 *   training day or without a training ahead) is ignored;
 * - events before the anchor are ignored; dates before the anchor read the
 *   plain cycle backwards (no shifts).
 *
 * Editing the cycle starts it fresh: the anchor is reset (7-day cycles: Monday
 * of the current week, so slots read as weekdays; other lengths: today = day 1)
 * and the shift log is cleared — see `anchorForSavedCycle`.
 */

export const DEFAULT_CYCLE_LENGTH = 7;
export const MIN_CYCLE_LENGTH = 1;
export const MAX_CYCLE_LENGTH = 14;

/** One day of the cycle. `routineId: null` on a training day = "next routine in the rotation". */
export type CycleSlot =
  { kind: 'rest' } | { kind: 'training'; routineId: string | null };

/** Effective plan for one date (same shape as a slot). */
export type PlanDay = CycleSlot;

export type PlanShiftKind = 'postpone' | 'pullForward';

export interface PlanShift {
  id: string;
  /** local `YYYY-MM-DD` */
  date: string;
  kind: PlanShiftKind;
}

export interface PlanRangeDay {
  date: string;
  day: PlanDay;
  /** Cycle position this day comes from; null for a rest day inserted by "postpone". */
  slotIndex: number | null;
  /** The day differs from the plain cycle (a shift moved something here). */
  shifted: boolean;
}

const REST: PlanDay = { kind: 'rest' };

// -- Pure local-date math on `YYYY-MM-DD` (UTC-based, so no DST edge cases) --

function toUtcMs(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const date = new Date(ms);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function cycleDaysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function cycleAddDays(isoDate: string, days: number): string {
  return fromUtcMs(toUtcMs(isoDate) + days * 86_400_000);
}

/** 0 = Sunday … 6 = Saturday (same convention as `src/lib/date.ts#weekdayOf`). */
export function cycleWeekdayOf(isoDate: string): number {
  return new Date(toUtcMs(isoDate)).getUTCDay();
}

/** Monday of the week containing `isoDate`. */
export function mondayOf(isoDate: string): string {
  return cycleAddDays(isoDate, -((cycleWeekdayOf(isoDate) + 6) % 7));
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function clampCycleLength(length: number): number {
  if (!Number.isFinite(length)) return DEFAULT_CYCLE_LENGTH;
  return Math.min(
    MAX_CYCLE_LENGTH,
    Math.max(MIN_CYCLE_LENGTH, Math.round(length)),
  );
}

/** Plain cycle (no shifts) for a date; works before the anchor too. */
export function baseSlotIndex(
  length: number,
  anchorDate: string,
  date: string,
): number {
  return mod(cycleDaysBetween(anchorDate, date), length);
}

// -- Replay -----------------------------------------------------------------

interface Cell {
  day: PlanDay;
  slotIndex: number | null;
}

/** Valid events (≥ anchor, ≤ until), deduped by id, one per date, sorted by date (stable). */
function normalizeShifts(
  shifts: readonly PlanShift[],
  anchorDate: string,
  until: string,
): PlanShift[] {
  const seenIds = new Set<string>();
  const unique: PlanShift[] = [];
  for (const shift of shifts) {
    if (seenIds.has(shift.id)) continue;
    seenIds.add(shift.id);
    if (shift.date < anchorDate || shift.date > until) continue;
    unique.push(shift);
  }
  // Array#sort is stable: equal dates keep their input order.
  unique.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const seenDates = new Set<string>();
  return unique.filter((s) =>
    seenDates.has(s.date) ? false : (seenDates.add(s.date), true),
  );
}

/**
 * Materializes the effective plan from the anchor up to `until` (inclusive)
 * by replaying the shift log over the plain cycle. Returns cells indexed by
 * days since the anchor, or null when `until` is before the anchor.
 */
function replay(
  slots: readonly CycleSlot[],
  anchorDate: string,
  shifts: readonly PlanShift[],
  until: string,
): Cell[] | null {
  const n = slots.length;
  const last = cycleDaysBetween(anchorDate, until);
  if (last < 0) return null;
  const events = normalizeShifts(shifts, anchorDate, until);
  // Each event looks at most one cycle ahead and moves the plan by at most one
  // day, so this margin always covers `until` after all splices.
  const size = last + 1 + (events.length + 2) * n;
  const cells: Cell[] = new Array(size);
  for (let i = 0; i < size; i += 1) {
    const slotIndex = i % n;
    cells[i] = { day: slots[slotIndex]!, slotIndex };
  }
  for (const event of events) {
    const at = cycleDaysBetween(anchorDate, event.date);
    const current = cells[at]!;
    if (event.kind === 'postpone') {
      if (current.day.kind !== 'training') continue;
      let restAt = -1;
      for (let i = at + 1; i <= at + n && i < cells.length; i += 1) {
        if (cells[i]!.day.kind === 'rest') {
          restAt = i;
          break;
        }
      }
      if (restAt !== -1) cells.splice(restAt, 1);
      cells.splice(at, 0, { day: REST, slotIndex: null });
    } else {
      if (current.day.kind !== 'rest') continue;
      let trainingAt = -1;
      for (let i = at + 1; i <= at + n && i < cells.length; i += 1) {
        if (cells[i]!.day.kind === 'training') {
          trainingAt = i;
          break;
        }
      }
      if (trainingAt === -1) continue;
      const [moved] = cells.splice(trainingAt, 1);
      cells[at] = moved!;
    }
  }
  return cells;
}

function samePlanDay(a: PlanDay, b: PlanDay): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'rest' || b.kind === 'rest') return true;
  return a.routineId === b.routineId;
}

/**
 * Effective plan for a date: the cycle repeated from `anchorDate` with the
 * shift log replayed on top. An empty cycle is always rest.
 */
export function effectivePlanForDate(
  cycle: readonly CycleSlot[],
  anchorDate: string,
  shifts: readonly PlanShift[],
  date: string,
): PlanDay {
  return effectivePlanRange(cycle, anchorDate, shifts, date, 1)[0]!.day;
}

/** Effective plan for `days` consecutive dates starting at `startDate`. */
export function effectivePlanRange(
  cycle: readonly CycleSlot[],
  anchorDate: string,
  shifts: readonly PlanShift[],
  startDate: string,
  days: number,
): PlanRangeDay[] {
  const count = Math.max(0, Math.floor(days));
  if (count === 0) return [];
  const n = cycle.length;
  const dates = Array.from({ length: count }, (_, i) =>
    cycleAddDays(startDate, i),
  );
  if (n === 0) {
    return dates.map((date) => ({
      date,
      day: REST,
      slotIndex: null,
      shifted: false,
    }));
  }
  const cells = replay(cycle, anchorDate, shifts, dates[dates.length - 1]!);
  return dates.map((date) => {
    const offset = cycleDaysBetween(anchorDate, date);
    const base = baseSlotIndex(n, anchorDate, date);
    if (offset < 0 || !cells) {
      return { date, day: cycle[base]!, slotIndex: base, shifted: false };
    }
    const cell = cells[offset]!;
    return {
      date,
      day: cell.day,
      slotIndex: cell.slotIndex,
      shifted: !samePlanDay(cell.day, cycle[base]!),
    };
  });
}

/** The shift recorded for a date (after dedupe; the first one wins), or null. */
export function shiftOnDate(
  shifts: readonly PlanShift[],
  date: string,
): PlanShift | null {
  return shifts.find((s) => s.date === date) ?? null;
}

/** "Heute nicht" is possible: a training day on/after the anchor without a shift yet. */
export function canPostpone(
  cycle: readonly CycleSlot[],
  anchorDate: string,
  shifts: readonly PlanShift[],
  date: string,
): boolean {
  if (cycle.length === 0 || date < anchorDate) return false;
  if (shiftOnDate(shifts, date)) return false;
  return (
    effectivePlanForDate(cycle, anchorDate, shifts, date).kind === 'training'
  );
}

/**
 * "Doch trainieren" is possible: a rest day on/after the anchor without a
 * shift yet, with a training day within one cycle length ahead.
 */
export function canPullForward(
  cycle: readonly CycleSlot[],
  anchorDate: string,
  shifts: readonly PlanShift[],
  date: string,
): boolean {
  if (cycle.length === 0 || date < anchorDate) return false;
  if (shiftOnDate(shifts, date)) return false;
  const range = effectivePlanRange(
    cycle,
    anchorDate,
    shifts,
    date,
    cycle.length + 1,
  );
  if (range[0]!.day.kind !== 'rest') return false;
  return range.slice(1).some((d) => d.day.kind === 'training');
}

/** Next training day strictly after `date` within `horizon` days (default one cycle), or null. */
export function nextTrainingAfter(
  cycle: readonly CycleSlot[],
  anchorDate: string,
  shifts: readonly PlanShift[],
  date: string,
  horizon: number = cycle.length,
): PlanRangeDay | null {
  if (cycle.length === 0) return null;
  const range = effectivePlanRange(
    cycle,
    anchorDate,
    shifts,
    cycleAddDays(date, 1),
    Math.max(1, horizon),
  );
  return range.find((d) => d.day.kind === 'training') ?? null;
}

// -- Editing ------------------------------------------------------------------

/**
 * Anchor for a cycle saved on `today`: a 7-day cycle is anchored on the Monday
 * of the current week (slot 0 = Monday, reads as a weekly plan); any other
 * length starts today (slot 0 = "day 1" = today). Saving always clears the
 * shift log.
 */
export function anchorForSavedCycle(length: number, today: string): string {
  return length === 7 ? mondayOf(today) : today;
}

/**
 * Slots as the editor should show them for a cycle saved on `today`, so that
 * saving without changes keeps the plain plan: 7 days → slot 0 = Monday;
 * other lengths → rotated so slot 0 is today's position in the plain cycle.
 */
export function slotsForEditor(
  slots: readonly CycleSlot[],
  anchorDate: string,
  today: string,
): CycleSlot[] {
  const n = slots.length;
  if (n === 0) return [];
  const start = baseSlotIndex(n, anchorDate, anchorForSavedCycle(n, today));
  return Array.from({ length: n }, (_, i) => slots[(start + i) % n]!);
}

/** Grows (new days are rest) or shrinks (drops the tail) the slot list to `length`. */
export function resizeCycle(
  slots: readonly CycleSlot[],
  length: number,
): CycleSlot[] {
  const target = clampCycleLength(length);
  const next = slots.slice(0, target);
  while (next.length < target) next.push(REST);
  return next;
}

/** Slots rotated so that index 0 is `slots[start]` (negative/large `start` wrap). */
export function rotateCycle(
  slots: readonly CycleSlot[],
  start: number,
): CycleSlot[] {
  const n = slots.length;
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => slots[mod(start + i, n)]!);
}

/**
 * Length change in the editor. Editor slots start on Monday for 7 days and on
 * today otherwise (`slotsForEditor`), so crossing that boundary re-bases slot 0
 * — today keeps its plan; then the tail grows (rest) or is dropped.
 */
export function resizeEditorCycle(
  slots: readonly CycleSlot[],
  nextLength: number,
  today: string,
): CycleSlot[] {
  const target = clampCycleLength(nextLength);
  const fromWeek = slots.length === 7;
  const toWeek = target === 7;
  const offset = cycleDaysBetween(mondayOf(today), today);
  const base = fromWeek && !toWeek ? rotateCycle(slots, offset) : slots;
  const resized = resizeCycle(base, target);
  return !fromWeek && toWeek ? rotateCycle(resized, -offset) : resized;
}

/**
 * Default 7-day cycle (Monday first) from training weekdays (0 = Sunday …
 * 6 = Saturday), assigning `routineIds` round-robin to the training days in
 * Monday-first order (`null` = rotation when there are no routines).
 */
export function weeklyCycleFromWeekdays(
  weekdays: readonly number[],
  routineIds: readonly string[] = [],
): CycleSlot[] {
  const set = new Set(weekdays);
  let k = 0;
  return Array.from({ length: 7 }, (_, position) => {
    const weekday = (position + 1) % 7;
    if (!set.has(weekday)) return REST;
    const routineId =
      routineIds.length > 0 ? routineIds[k % routineIds.length]! : null;
    k += 1;
    return { kind: 'training', routineId };
  });
}

/** Number of training days in the cycle. */
export function trainingDayCount(slots: readonly CycleSlot[]): number {
  return slots.filter((s) => s.kind === 'training').length;
}
