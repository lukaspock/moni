import { DEFAULT_NUDGE_PREFS, EMPTY_NUDGE_STATE } from '../../domain';
import de from '../../i18n/locales/de/nudges.json';
import en from '../../i18n/locales/en/nudges.json';
import {
  applyQuieterChoice,
  buildNudgeContent,
  effectivePrefs,
  INITIAL_NUDGE_SETTINGS,
  localDateFromAt,
  migrateNudgeSettings,
  muteCategory,
  nudgeId,
  parseNudgeId,
  quietUntilFor,
  reconcileNudges,
} from './nudgeLogic';
import { rescheduleNudges, type NudgeNotifier } from './nudgeScheduler';

describe('migrateNudgeSettings', () => {
  it('keeps nudges off for new users and on for users with meal reminders', () => {
    expect(
      migrateNudgeSettings(INITIAL_NUDGE_SETTINGS, false).masterEnabled,
    ).toBe(false);
    const m = migrateNudgeSettings(INITIAL_NUDGE_SETTINGS, true);
    expect(m.masterEnabled).toBe(true);
    expect(m.migrated).toBe(true);
  });
  it('runs only once', () => {
    const done = { ...INITIAL_NUDGE_SETTINGS, migrated: true };
    expect(migrateNudgeSettings(done, true)).toBe(done);
  });
});

describe('ids and dates', () => {
  it('round-trips ids', () => {
    expect(parseNudgeId(nudgeId('sundayReview', '2026-10-11'))).toEqual({
      kind: 'sundayReview',
      date: '2026-10-11',
    });
    expect(parseNudgeId('moeni-meal-lunch')).toBeNull();
  });
  it('builds a local date', () => {
    const d = localDateFromAt('2026-10-11T18:05');
    expect([
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
    ]).toEqual([2026, 9, 11, 18, 5]);
  });
});

describe('prefs helpers', () => {
  it('suppresses today via quietUntil', () => {
    expect(effectivePrefs(DEFAULT_NUDGE_PREFS, '2026-10-09').quietUntil).toBe(
      '2026-10-09',
    );
    expect(
      effectivePrefs(
        { ...DEFAULT_NUDGE_PREFS, quietUntil: '2026-10-20' },
        '2026-10-09',
      ).quietUntil,
    ).toBe('2026-10-20');
  });
  it('quietUntilFor', () => {
    expect(quietUntilFor('2026-10-09', 7)).toBe('2026-10-16');
    expect(quietUntilFor('2026-10-09', 0)).toBeNull();
  });
  it('mutes a whole category', () => {
    const s = muteCategory(EMPTY_NUDGE_STATE, 'reviews', '2026-10-09');
    expect(s.mutedUntilByKind.sundayReview).toBe('2026-10-23');
    expect(s.mutedUntilByKind.monthReview).toBe('2026-10-23');
    expect(s.mutedUntilByKind.eveningNote).toBeUndefined();
  });
  it('quieter choices', () => {
    const base = {
      masterEnabled: true,
      prefs: DEFAULT_NUDGE_PREFS,
      state: EMPTY_NUDGE_STATE,
    };
    expect(applyQuieterChoice(base, 'off').masterEnabled).toBe(false);
    const only = applyQuieterChoice(base, 'reviewsOnly');
    expect(only.prefs.categories).toEqual({
      meals: false,
      training: false,
      reviews: true,
      rhythm: false,
      weight: false,
    });
    expect(only.state.askedQuieter).toBe(true);
    expect(applyQuieterChoice(base, 'less').prefs.categories.rhythm).toBe(true);
  });
});

describe('reconcileNudges', () => {
  const sched = (
    kind: 'eveningNote' | 'sundayReview',
    date: string,
    hhmm: string,
  ) => ({
    id: nudgeId(kind, date),
    kind,
    date,
    at: `${date}T${hhmm}`,
  });
  it('mutes a kind after three ignored nudges', () => {
    const list = ['06', '07', '08'].map((d) =>
      sched('eveningNote', `2026-10-${d}`, '20:30'),
    );
    const r = reconcileNudges({
      state: EMPTY_NUDGE_STATE,
      scheduled: list,
      openedIds: [],
      now: '2026-10-09T08:00',
    });
    expect(r.state.mutedUntilByKind.eveningNote).toBe('2026-10-23');
    expect(r.state.muteEvents).toBe(1);
    expect(r.remaining).toEqual([]);
  });
  it('opened resets the streak and future ones stay', () => {
    const a = sched('sundayReview', '2026-10-04', '18:00');
    const future = sched('eveningNote', '2026-10-10', '20:30');
    const r = reconcileNudges({
      state: { ...EMPTY_NUDGE_STATE, ignoredStreak: { sundayReview: 2 } },
      scheduled: [a, future],
      openedIds: [a.id],
      now: '2026-10-09T08:00',
    });
    expect(r.state.ignoredStreak.sundayReview).toBe(0);
    expect(r.state.lastSentByKind.sundayReview).toBe('2026-10-04');
    expect(r.remaining).toEqual([future]);
  });
});

describe('content', () => {
  const t = (key: string, o?: Record<string, unknown>) =>
    o ? `${key}:${JSON.stringify(o)}` : key;
  const ctx = {
    baseKcal: 2100.4,
    monthName: () => 'September',
    doorOpenCount: 1,
  };
  const kinds = [
    'eveningNote',
    'trainingMorning',
    'proteinBridge',
    'sundayReview',
    'weighIn',
    'rhythmChance',
    'doorOpen',
    'monthReview',
  ] as const;
  const plan = (kind: (typeof kinds)[number]) => ({
    kind,
    at: '2026-10-12T08:30',
    payloadKey: '',
    variant: 0 as const,
  });
  it('maps kinds to existing keys', () => {
    expect(buildNudgeContent(plan('trainingMorning'), t, ctx)?.body).toContain(
      '"kcal":2100',
    );
    expect(buildNudgeContent(plan('rhythmChance'), t, ctx)?.title).toBe(
      'nudges.taktChance.title',
    );
    expect(buildNudgeContent(plan('doorOpen'), t, ctx)?.title).toBe(
      'nudges.doorOpen.mid.title',
    );
    expect(
      buildNudgeContent(plan('trainingMorning'), t, { ...ctx, baseKcal: null }),
    ).toBeNull();
  });
  it('every produced key exists in de and en', () => {
    const has = (json: unknown, key: string) =>
      key
        .split('.')
        .slice(1)
        .reduce<unknown>(
          (o, k) => (o as Record<string, unknown> | undefined)?.[k],
          json,
        ) !== undefined;
    for (const doorOpenCount of [0, 1, 2]) {
      for (const kind of kinds) {
        const seen: string[] = [];
        buildNudgeContent(plan(kind), (k) => (seen.push(k), k), {
          ...ctx,
          doorOpenCount,
        });
        expect(seen.length).toBeGreaterThan(0);
        for (const k of seen) {
          expect(has(de, k)).toBe(true);
          expect(has(en, k)).toBe(true);
        }
      }
    }
  });
});

describe('rescheduleNudges', () => {
  function fakeNotifier() {
    const calls: { id: string }[] = [];
    let cancelled = 0;
    const n: NudgeNotifier = {
      cancelAllNudges: async () => void (cancelled += 1),
      schedule: async (a) => void calls.push({ id: a.id }),
    };
    return { n, calls, cancelled: () => cancelled };
  }
  const inputs = {
    now: '2026-10-09T10:00',
    ledger: [],
    rhythm: { current: 0, thisWeek: 'idle' } as never,
    plannedWeekdays: new Set<number>(),
    pauses: [],
    careFlagged: false,
    lastWorkoutEndedAt: null,
    permissionGranted: true,
    appOpened: true,
    t: (k: string) => k,
    monthName: () => 'x',
  };
  it('only cancels when master is off', async () => {
    const f = fakeNotifier();
    const out = await rescheduleNudges(INITIAL_NUDGE_SETTINGS, inputs, f.n);
    expect(f.cancelled()).toBe(1);
    expect(f.calls).toEqual([]);
    expect(out.scheduled).toEqual([]);
    expect(out.lastOpenDate).toBe('2026-10-09');
  });
  it('schedules at most one per day', async () => {
    const f = fakeNotifier();
    const out = await rescheduleNudges(
      { ...INITIAL_NUDGE_SETTINGS, masterEnabled: true },
      inputs,
      f.n,
    );
    expect(f.calls.length).toBe(out.scheduled.length);
    expect(f.calls.length).toBeGreaterThan(0);
    const days = out.scheduled.map((s) => s.date);
    expect(new Set(days).size).toBe(days.length);
  });
});
