import { day, GOALS, rhythmWeek } from './ledgerFixtures';
import {
  DEFAULT_NUDGE_PREFS,
  EMPTY_NUDGE_STATE,
  NUDGE_CATEGORY,
  planNudges,
  registerAppOpen,
  registerNudgeOutcome,
  registerNudgeSent,
  shouldAskQuieter,
  type NudgePlan,
  type NudgePrefs,
  type NudgeState,
  type PlanNudgesArgs,
} from './nudges';
import { computeRhythm, type LedgerDay } from './rhythm';

const NOW = '2026-01-14T10:00'; // Wednesday
const rhythmFor = (days: LedgerDay[], today = '2026-01-14') =>
  computeRhythm({
    days,
    today,
    plannedWeekdays: new Set(),
    goalsForWeek: () => GOALS,
    pauses: [],
  });

function plan(over: Partial<PlanNudgesArgs> = {}): NudgePlan[] {
  const ledger = over.ledger ?? [];
  return planNudges({
    now: NOW,
    prefs: DEFAULT_NUDGE_PREFS,
    state: EMPTY_NUDGE_STATE,
    ledger,
    rhythm: rhythmFor([...ledger]),
    plan: { weekdays: new Set<number>() },
    lastOpenDaysAgo: 0,
    pauses: [],
    lastWorkoutEndedAt: null,
    ...over,
  });
}

const prefs = (over: Partial<NudgePrefs> = {}): NudgePrefs => ({
  ...DEFAULT_NUDGE_PREFS,
  ...over,
  categories: { ...DEFAULT_NUDGE_PREFS.categories, ...(over.categories ?? {}) },
});

const kinds = (p: NudgePlan[]) => p.map((n) => n.kind);
const on = (p: NudgePlan[], date: string) =>
  p.find((n) => n.at.startsWith(date));

describe('planNudges hard rules', () => {
  it('plans at most one nudge per day, within the 7-day horizon, in order', () => {
    const p = plan();
    const dates = p.map((n) => n.at.slice(0, 10));
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates).toEqual([...dates].sort());
    expect(p.length).toBeLessThanOrEqual(7);
    for (const d of dates) {
      expect(d >= '2026-01-14' && d <= '2026-01-20').toBe(true);
    }
  });

  it('keeps every nudge between 08:00 and 21:30', () => {
    const p = plan({
      plan: { weekdays: new Set([1, 2, 3, 4, 5, 6, 0]) },
      ledger: [day('2026-01-13', { foodLogCount: 2 })],
    });
    expect(p.length).toBeGreaterThan(0);
    for (const n of p) {
      const t = n.at.slice(11);
      expect(t >= '08:00' && t <= '21:30').toBe(true);
    }
  });

  it('never plans the same category twice in a row', () => {
    const p = plan({ plan: { weekdays: new Set([1, 2, 3, 4, 5, 6, 0]) } });
    for (let i = 1; i < p.length; i += 1) {
      expect(NUDGE_CATEGORY[p[i].kind]).not.toBe(NUDGE_CATEGORY[p[i - 1].kind]);
    }
  });

  it('caps nudges at four per week', () => {
    const p = plan({
      plan: { weekdays: new Set([0, 1, 2, 3, 4, 5, 6]) },
      ledger: [day('2026-01-13', { foodLogCount: 2 })],
    });
    const thisWeek = p.filter((n) => n.at.slice(0, 10) <= '2026-01-18');
    expect(thisWeek.length).toBeLessThanOrEqual(4);
    const already = plan({
      state: {
        ...EMPTY_NUDGE_STATE,
        sentThisWeek: 4,
        sentWeekStart: '2026-01-12',
      },
      plan: { weekdays: new Set([0, 1, 2, 3, 4, 5, 6]) },
    });
    expect(already.filter((n) => n.at.slice(0, 10) <= '2026-01-18')).toEqual(
      [],
    );
    expect(already.some((n) => n.at.slice(0, 10) > '2026-01-18')).toBe(true);
  });

  it('ignores a stale weekly counter from an earlier week', () => {
    const p = plan({
      state: {
        ...EMPTY_NUDGE_STATE,
        sentThisWeek: 4,
        sentWeekStart: '2026-01-05',
      },
    });
    expect(p.length).toBeGreaterThan(0);
  });

  it('plans nothing during quiet mode, within its date range', () => {
    const p = plan({ prefs: prefs({ quietUntil: '2026-01-16' }) });
    expect(p.every((n) => n.at.slice(0, 10) > '2026-01-16')).toBe(true);
    expect(plan({ prefs: prefs({ quietUntil: '2026-02-01' }) })).toEqual([]);
  });

  it('plans nothing during a pause', () => {
    const p = plan({ pauses: [{ from: '2026-01-14', to: '2026-01-16' }] });
    expect(p.every((n) => n.at.slice(0, 10) > '2026-01-16')).toBe(true);
    expect(
      plan({ pauses: [{ from: '2026-01-10', to: '2026-01-30' }] }),
    ).toEqual([]);
  });

  it('respects disabled categories', () => {
    const none = prefs({
      categories: {
        meals: false,
        training: false,
        reviews: false,
        rhythm: false,
        weight: false,
      },
    });
    expect(plan({ prefs: none })).toEqual([]);
    const noMeals = plan({
      prefs: prefs({
        categories: { meals: false } as NudgePrefs['categories'],
      }),
    });
    expect(kinds(noMeals)).not.toContain('eveningNote');
  });

  it('can narrow the allowed window but never widen it', () => {
    const narrow = plan({ prefs: prefs({ latestMinutes: 20 * 60 }) });
    expect(on(narrow, '2026-01-14')?.at).toBe('2026-01-14T20:00');
    const wide = plan({
      prefs: prefs({ latestMinutes: 23 * 60, earliestMinutes: 5 * 60 }),
    });
    expect(on(wide, '2026-01-14')?.at).toBe('2026-01-14T20:30');
    expect(
      plan({
        prefs: prefs({ earliestMinutes: 22 * 60, latestMinutes: 9 * 60 }),
      }),
    ).toEqual([]);
  });

  it('is pure and deterministic', () => {
    const state: NudgeState = {
      ...EMPTY_NUDGE_STATE,
      lastSentByKind: { sundayReview: '2026-01-11' },
    };
    const snapshot = JSON.stringify(state);
    expect(plan({ state })).toEqual(plan({ state }));
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('puts payload keys and rotating variants on the plan', () => {
    const p = plan();
    expect(p[0].payloadKey).toBe(`nudges.${p[0].kind}`);
    expect([0, 1, 2]).toContain(p[0].variant);
  });
});

describe('eveningNote', () => {
  it('is planned for 20:30 today when the day is still empty', () => {
    expect(on(plan(), '2026-01-14')).toMatchObject({
      kind: 'eveningNote',
      at: '2026-01-14T20:30',
    });
  });

  it('is dropped today when the day was already active', () => {
    const food = plan({ ledger: [day('2026-01-14', { foodLogCount: 2 })] });
    expect(on(food, '2026-01-14')).toBeUndefined();
    const trained = plan({ ledger: [day('2026-01-14', { workoutCount: 1 })] });
    expect(on(trained, '2026-01-14')).toBeUndefined();
    // a single entry is not enough to cancel it
    expect(
      on(
        plan({ ledger: [day('2026-01-14', { foodLogCount: 1 })] }),
        '2026-01-14',
      )?.kind,
    ).toBe('eveningNote');
  });

  it('is not planned when its time has passed', () => {
    expect(on(plan({ now: '2026-01-14T20:45' }), '2026-01-14')).toBeUndefined();
  });

  it('is blocked right after the same category was sent', () => {
    const state = {
      ...EMPTY_NUDGE_STATE,
      lastSentByKind: { eveningNote: '2026-01-13' },
    };
    expect(on(plan({ state }), '2026-01-14')).toBeUndefined();
  });
});

describe('proteinBridge', () => {
  const ledger = [
    day('2026-01-14', {
      workoutCount: 1,
      proteinG: 30,
      targetProteinG: 150,
      foodLogCount: 1,
    }),
  ];
  it('lands 30 minutes after the workout ended', () => {
    const p = plan({
      now: '2026-01-14T17:05',
      ledger,
      lastWorkoutEndedAt: '2026-01-14T17:00',
    });
    expect(p[0]).toMatchObject({
      kind: 'proteinBridge',
      at: '2026-01-14T17:30',
    });
  });
  it('uses "right away" inside the 20–40 minute window', () => {
    const p = plan({
      now: '2026-01-14T17:35',
      ledger,
      lastWorkoutEndedAt: '2026-01-14T17:00',
    });
    expect(p[0]).toMatchObject({
      kind: 'proteinBridge',
      at: '2026-01-14T17:36',
    });
  });
  it('is dropped after the window, when protein is fine, or for another day', () => {
    expect(
      on(
        plan({
          now: '2026-01-14T17:50',
          ledger,
          lastWorkoutEndedAt: '2026-01-14T17:00',
        }),
        '2026-01-14',
      )?.kind,
    ).not.toBe('proteinBridge');
    const fine = [
      day('2026-01-14', {
        workoutCount: 1,
        proteinG: 100,
        targetProteinG: 150,
      }),
    ];
    expect(
      kinds(
        plan({
          now: '2026-01-14T17:05',
          ledger: fine,
          lastWorkoutEndedAt: '2026-01-14T17:00',
        }),
      ),
    ).not.toContain('proteinBridge');
    expect(
      kinds(
        plan({
          now: '2026-01-14T17:05',
          ledger,
          lastWorkoutEndedAt: '2026-01-13T17:00',
        }),
      ),
    ).not.toContain('proteinBridge');
  });
  it('needs a protein target', () => {
    const noTarget = [
      day('2026-01-14', {
        workoutCount: 1,
        proteinG: 10,
        targetProteinG: null,
      }),
    ];
    expect(
      kinds(
        plan({
          now: '2026-01-14T17:05',
          ledger: noTarget,
          lastWorkoutEndedAt: '2026-01-14T17:00',
        }),
      ),
    ).not.toContain('proteinBridge');
  });
  it('is dropped when it would fall after the allowed window', () => {
    const p = plan({
      now: '2026-01-14T21:10',
      ledger,
      lastWorkoutEndedAt: '2026-01-14T21:05',
    });
    expect(kinds(p)).not.toContain('proteinBridge');
  });
});

describe('sundayReview', () => {
  it('is planned for Sunday 18:00 when the week has data', () => {
    const p = plan({ ledger: [day('2026-01-13', { foodLogCount: 2 })] });
    expect(on(p, '2026-01-18')).toMatchObject({
      kind: 'sundayReview',
      at: '2026-01-18T18:00',
    });
  });
  it('is skipped for a week without data', () => {
    expect(on(plan(), '2026-01-18')?.kind).not.toBe('sundayReview');
  });
  it('takes a week with only a workout', () => {
    expect(
      on(
        plan({ ledger: [day('2026-01-12', { workoutCount: 1 })] }),
        '2026-01-18',
      )?.kind,
    ).toBe('sundayReview');
  });
});

describe('monthReview', () => {
  it('fires on the 1st when the previous month had >= 7 kept days', () => {
    const ledger = Array.from({ length: 7 }, (_, i) =>
      day(`2026-01-${String(i + 2).padStart(2, '0')}`, { workoutCount: 1 }),
    );
    const p = plan({
      now: '2026-01-30T10:00',
      ledger,
      rhythm: rhythmFor(ledger, '2026-01-30'),
    });
    expect(on(p, '2026-02-01')).toMatchObject({
      kind: 'monthReview',
      at: '2026-02-01T09:30',
    });
  });
  it('stays quiet after a thin month', () => {
    const ledger = Array.from({ length: 6 }, (_, i) =>
      day(`2026-01-${String(i + 2).padStart(2, '0')}`, { workoutCount: 1 }),
    );
    const p = plan({
      now: '2026-01-30T10:00',
      ledger,
      rhythm: rhythmFor(ledger, '2026-01-30'),
    });
    expect(kinds(p)).not.toContain('monthReview');
  });
});

describe('rhythmChance', () => {
  const inReach = (over = {}) => ({
    ...rhythmFor([]),
    current: 3,
    thisWeek: 'in-reach' as const,
    ...over,
  });
  it('invites on Thursday at 18:00 when a rhythm week is within reach', () => {
    expect(on(plan({ rhythm: inReach() }), '2026-01-15')).toMatchObject({
      kind: 'rhythmChance',
      at: '2026-01-15T18:00',
    });
  });
  it('needs a running rhythm of 2+, an "in-reach" week and no recent send', () => {
    expect(
      on(plan({ rhythm: inReach({ current: 1 }) }), '2026-01-15')?.kind,
    ).not.toBe('rhythmChance');
    expect(
      on(plan({ rhythm: inReach({ thisWeek: 'open' }) }), '2026-01-15')?.kind,
    ).not.toBe('rhythmChance');
    const state = {
      ...EMPTY_NUDGE_STATE,
      lastSentByKind: { rhythmChance: '2026-01-12' },
    };
    expect(on(plan({ rhythm: inReach(), state }), '2026-01-15')?.kind).not.toBe(
      'rhythmChance',
    );
  });
  it('is never planned under the care signal', () => {
    expect(kinds(plan({ rhythm: inReach(), careFlagged: true }))).not.toContain(
      'rhythmChance',
    );
  });
  it('is not planned for next week (unknown state)', () => {
    expect(
      on(plan({ now: '2026-01-16T10:00', rhythm: inReach() }), '2026-01-22'),
    ).toBeUndefined();
  });
});

describe('trainingMorning, weighIn, doorOpen', () => {
  it('invites on planned training days at 08:30', () => {
    const p = plan({ plan: { weekdays: new Set([4]) } }); // Thursday
    expect(on(p, '2026-01-15')).toMatchObject({
      kind: 'trainingMorning',
      at: '2026-01-15T08:30',
    });
  });
  it('skips today when the workout is already done or the time passed', () => {
    const done = plan({
      plan: { weekdays: new Set([3]) },
      ledger: [day('2026-01-14', { workoutCount: 1 })],
    });
    expect(on(done, '2026-01-14')?.kind).not.toBe('trainingMorning');
    expect(
      on(plan({ plan: { weekdays: new Set([3]) } }), '2026-01-14')?.kind,
    ).not.toBe('trainingMorning');
  });

  it('weighIn is opt-in and needs 7+ days since the last weigh-in', () => {
    const enabled = prefs({
      categories: { weight: true } as NudgePrefs['categories'],
      weighInWeekday: 1,
    });
    expect(on(plan({ prefs: enabled }), '2026-01-19')).toMatchObject({
      kind: 'weighIn',
      at: '2026-01-19T08:00',
    });
    expect(kinds(plan())).not.toContain('weighIn');
    const recent = [day('2026-01-14', { weightLogged: true })];
    expect(
      on(plan({ prefs: enabled, ledger: recent }), '2026-01-19')?.kind,
    ).not.toBe('weighIn');
    expect(kinds(plan({ prefs: enabled, careFlagged: true }))).not.toContain(
      'weighIn',
    );
  });

  it('doorOpen follows 3, 10 and 25 days after the last open', () => {
    const p = plan({
      now: '2026-01-14T10:00',
      lastOpenDaysAgo: 0,
      prefs: prefs({
        categories: { meals: false } as NudgePrefs['categories'],
      }),
    });
    expect(on(p, '2026-01-17')).toMatchObject({
      kind: 'doorOpen',
      at: '2026-01-17T17:30',
    });
    const second = plan({
      state: { ...EMPTY_NUDGE_STATE, doorOpenCount: 1 },
      lastOpenDaysAgo: 4,
      prefs: prefs({
        categories: { meals: false } as NudgePrefs['categories'],
      }),
    });
    expect(on(second, '2026-01-20')?.kind).toBe('doorOpen'); // open on 01-10 + 10
    const silent = plan({
      state: {
        ...EMPTY_NUDGE_STATE,
        doorOpenCount: 3,
        mutedUntilByKind: { doorOpen: '2026-03-01' },
      },
      lastOpenDaysAgo: 25,
    });
    expect(kinds(silent)).not.toContain('doorOpen');
  });

  it('muted kinds are skipped until the mute ends', () => {
    const state = {
      ...EMPTY_NUDGE_STATE,
      mutedUntilByKind: { eveningNote: '2026-01-15' },
    };
    const p = plan({ state });
    expect(on(p, '2026-01-14')).toBeUndefined();
    expect(on(p, '2026-01-15')).toBeUndefined();
    expect(on(p, '2026-01-16')?.kind).toBe('eveningNote');
  });
});

describe('state transitions', () => {
  it('records sends and the weekly count', () => {
    const a = registerNudgeSent(EMPTY_NUDGE_STATE, 'eveningNote', '2026-01-14');
    expect(a.lastSentByKind.eveningNote).toBe('2026-01-14');
    expect(a.sentThisWeek).toBe(1);
    expect(a.sentWeekStart).toBe('2026-01-12');
    const b = registerNudgeSent(a, 'sundayReview', '2026-01-18');
    expect(b.sentThisWeek).toBe(2);
    const c = registerNudgeSent(b, 'eveningNote', '2026-01-19'); // new week
    expect(c.sentThisWeek).toBe(1);
    expect(c.sentWeekStart).toBe('2026-01-19');
    expect(EMPTY_NUDGE_STATE.sentThisWeek).toBe(0);
  });

  it('auto-calms after three ignored nudges in a row (14 days)', () => {
    let s: NudgeState = EMPTY_NUDGE_STATE;
    s = registerNudgeOutcome(s, 'eveningNote', false, '2026-01-14');
    s = registerNudgeOutcome(s, 'eveningNote', false, '2026-01-15');
    expect(s.ignoredStreak.eveningNote).toBe(2);
    expect(s.mutedUntilByKind.eveningNote).toBeUndefined();
    s = registerNudgeOutcome(s, 'eveningNote', false, '2026-01-16');
    expect(s.mutedUntilByKind.eveningNote).toBe('2026-01-30');
    expect(s.ignoredStreak.eveningNote).toBe(0);
    expect(s.muteEvents).toBe(1);
  });

  it('resets the ignore streak when a nudge is opened', () => {
    let s = registerNudgeOutcome(
      EMPTY_NUDGE_STATE,
      'eveningNote',
      false,
      '2026-01-14',
    );
    s = registerNudgeOutcome(s, 'eveningNote', false, '2026-01-15');
    s = registerNudgeOutcome(s, 'eveningNote', true, '2026-01-16');
    s = registerNudgeOutcome(s, 'eveningNote', false, '2026-01-17');
    expect(s.ignoredStreak.eveningNote).toBe(1);
    expect(s.mutedUntilByKind.eveningNote).toBeUndefined();
  });

  it('asks "quieter?" once after two auto-mutes', () => {
    let s: NudgeState = EMPTY_NUDGE_STATE;
    const mute = (st: NudgeState, kind: 'eveningNote' | 'sundayReview') => {
      let x = st;
      for (let i = 0; i < 3; i += 1)
        x = registerNudgeOutcome(x, kind, false, '2026-01-14');
      return x;
    };
    s = mute(s, 'eveningNote');
    expect(shouldAskQuieter(s)).toBe(false);
    s = mute(s, 'sundayReview');
    expect(shouldAskQuieter(s)).toBe(true);
    expect(shouldAskQuieter({ ...s, askedQuieter: true })).toBe(false);
  });

  it('silences door-open for 60 days after the third one and restarts on app open', () => {
    let s: NudgeState = EMPTY_NUDGE_STATE;
    s = registerNudgeSent(s, 'doorOpen', '2026-01-17');
    s = registerNudgeSent(s, 'doorOpen', '2026-01-24');
    expect(s.mutedUntilByKind.doorOpen).toBeUndefined();
    s = registerNudgeSent(s, 'doorOpen', '2026-02-08');
    expect(s.doorOpenCount).toBe(3);
    expect(s.mutedUntilByKind.doorOpen).toBe('2026-04-09');
    expect(registerAppOpen(s).doorOpenCount).toBe(0);
  });
});

describe('integration with a real rhythm', () => {
  it('works with a computed rhythm state', () => {
    const ledger = rhythmWeek('2026-01-05');
    const p = plan({ ledger, rhythm: rhythmFor(ledger) });
    expect(Array.isArray(p)).toBe(true);
  });
});
