import {
  createHapticsEngine,
  HAPTIC_PATTERNS,
  type HapticEvent,
  type HapticPulse,
} from './hapticsEngine';

function setup(opts: { enabled?: boolean; lowPower?: boolean } = {}) {
  let t = 1000;
  const played: { t: number; pulse: HapticPulse }[] = [];
  const timers: { id: number; at: number; fn: () => void }[] = [];
  let nextId = 1;
  const state = {
    enabled: opts.enabled ?? true,
    lowPower: opts.lowPower ?? false,
  };
  const engine = createHapticsEngine({
    driver: (pulse) => played.push({ t, pulse }),
    now: () => t,
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.push({ id, at: t + ms, fn });
      return id;
    },
    clearTimer: (id) => {
      const i = timers.findIndex((x) => x.id === id);
      if (i >= 0) timers.splice(i, 1);
    },
    isEnabled: () => state.enabled,
    isLowPower: () => state.lowPower,
  });
  const advance = (ms: number) => {
    const target = t + ms;
    for (;;) {
      const due = timers
        .filter((x) => x.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers.splice(timers.indexOf(due), 1);
      t = due.at;
      due.fn();
    }
    t = target;
  };
  return { engine, played, advance, state };
}

describe('haptic pattern table', () => {
  it('covers the documented events with valid pulses', () => {
    const events = Object.keys(HAPTIC_PATTERNS) as HapticEvent[];
    expect(events.length).toBeGreaterThanOrEqual(25);
    for (const e of events) {
      const p = HAPTIC_PATTERNS[e];
      expect(p.pulses.length).toBeGreaterThan(0);
      expect(p.pulses[0].at).toBe(0);
    }
  });

  it('never uses an error haptic for "over the limit"', () => {
    expect(HAPTIC_PATTERNS.limitExceeded.pulses[0]).toMatchObject({
      kind: 'notification',
      type: 'warning',
    });
  });
});

describe('haptics engine', () => {
  it('is a no-op when disabled', () => {
    const { engine, played, state } = setup({ enabled: false });
    expect(engine.fire('tap')).toBe(false);
    state.enabled = true;
    expect(engine.fire('tap')).toBe(true);
    expect(played).toHaveLength(1);
  });

  it('plays multi-pulse patterns on schedule', () => {
    const { engine, played, advance } = setup();
    engine.fire('goalReached');
    expect(played).toHaveLength(1);
    advance(110);
    expect(played).toHaveLength(2);
    expect(played.map((p) => p.pulse.kind)).toEqual(['impact', 'impact']);
  });

  it('drops a different event within the 40 ms global gap', () => {
    const { engine, played, advance } = setup();
    expect(engine.fire('tap')).toBe(true);
    advance(20);
    expect(engine.fire('toggle')).toBe(false);
    advance(30);
    expect(engine.fire('toggle')).toBe(true);
    expect(played).toHaveLength(2);
  });

  it('debounces the same event within 250 ms', () => {
    const { engine, advance } = setup();
    expect(engine.fire('mealSaved')).toBe(true);
    advance(100);
    expect(engine.fire('mealSaved')).toBe(false);
    advance(200);
    expect(engine.fire('mealSaved')).toBe(true);
  });

  it('limits selection scrubbing to one per 60 ms', () => {
    const { engine, advance } = setup();
    expect(engine.fire('select')).toBe(true);
    advance(45);
    expect(engine.fire('select')).toBe(false);
    advance(20);
    expect(engine.fire('select')).toBe(true);
  });

  it('lets a running pattern exclude lower/equal priorities', () => {
    const { engine, played, advance } = setup();
    engine.fire('goalReached'); // milestone, 110 ms
    advance(60);
    expect(engine.fire('mealSaved')).toBe(false); // confirm < milestone
    advance(60);
    expect(played).toHaveLength(2);
  });

  it('cancels a running pattern for a higher priority one', () => {
    const { engine, played, advance } = setup();
    engine.fire('bonusGained'); // reward: 0, 120
    advance(60);
    expect(engine.fire('goalReached')).toBe(true); // milestone
    advance(300);
    // bonusGained pulse 1 + goalReached 2 pulses; pending bonus pulse cancelled
    expect(played).toHaveLength(3);
  });

  it('collapses patterns with >= 3 pulses in Low Power Mode', () => {
    const { engine, played, advance } = setup({ lowPower: true });
    engine.fire('rhythmMilestone');
    advance(500);
    expect(played).toHaveLength(1);
  });

  it('swallows driver errors', () => {
    let t = 0;
    const engine = createHapticsEngine({
      driver: () => {
        throw new Error('boom');
      },
      now: () => t++ * 1000,
      setTimer: () => 0,
      clearTimer: () => {},
      isEnabled: () => true,
    });
    expect(() => engine.fire('tap')).not.toThrow();
  });
});
