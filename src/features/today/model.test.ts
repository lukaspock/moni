import { emptyLedgerDay } from '@/domain';

import {
  dayOfYear,
  daysAwayFromLedger,
  hoursSince,
  ringStatus,
  startChecklist,
} from './model';

describe('ringStatus', () => {
  it('room left, near level, on level, above, spring tide', () => {
    const b = { baseKcal: 2000, bonusKcal: 0 };
    expect(ringStatus({ ...b, eatenKcal: 500 })?.kind).toBe('roomLeft');
    expect(ringStatus({ ...b, eatenKcal: 1950 })?.kind).toBe('nearLevel');
    expect(ringStatus({ ...b, eatenKcal: 2000 })?.kind).toBe('onLevel');
    expect(ringStatus({ ...b, eatenKcal: 2200 })?.kind).toBe('above');
    expect(ringStatus({ ...b, eatenKcal: 2500 })?.kind).toBe('springTide');
  });
  it('null without limit', () => {
    expect(ringStatus({ baseKcal: 0, bonusKcal: 0, eatenKcal: 0 })).toBeNull();
  });
});

describe('helpers', () => {
  it('dayOfYear', () => {
    expect(dayOfYear('2026-01-01')).toBe(1);
    expect(dayOfYear('2026-10-09')).toBe(282);
  });
  it('daysAwayFromLedger', () => {
    const d = { ...emptyLedgerDay('2026-10-01'), foodLogCount: 2 };
    expect(daysAwayFromLedger([d], '2026-10-09')).toBe(8);
    expect(daysAwayFromLedger([], '2026-10-09')).toBe(0);
  });
  it('hoursSince', () => {
    const now = new Date('2026-10-09T12:00:00Z');
    expect(hoursSince('2026-10-09T10:00:00Z', now)).toBe(2);
    expect(hoursSince(null, now)).toBeNull();
  });
  it('startChecklist', () => {
    const r = startChecklist({
      hasFood: false,
      hasWeight: true,
      hasTraining: false,
      healthConnected: false,
      accountAgeDays: 2,
    });
    expect(r.visible).toBe(true);
    expect(r.steps.filter((s) => s.done)).toHaveLength(1);
    expect(
      startChecklist({
        hasFood: false,
        hasWeight: false,
        hasTraining: false,
        healthConnected: false,
        accountAgeDays: 9,
      }).visible,
    ).toBe(false);
  });
});
