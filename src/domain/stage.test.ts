import { STAGES, displayedStage, stageAscent, stageForWeeks } from './stage';

describe('stageForWeeks', () => {
  it('has the six stages in order', () => {
    expect(STAGES.map((s) => s.key)).toEqual([
      'warmup',
      'inTune',
      'inStep',
      'inSync',
      'metronome',
      'original',
    ]);
    expect(STAGES.map((s) => s.minWeeks)).toEqual([0, 3, 8, 16, 30, 52]);
  });

  it.each([
    [0, 1],
    [2, 1],
    [3, 2],
    [7, 2],
    [8, 3],
    [15, 3],
    [16, 4],
    [29, 4],
    [30, 5],
    [51, 5],
    [52, 6],
    [500, 6],
  ])('maps %i weeks to stage %i', (weeks, index) => {
    expect(stageForWeeks(weeks).stage.index).toBe(index);
  });

  it('reports the next stage, weeks to go and progress', () => {
    const r = stageForWeeks(5);
    expect(r.stage.key).toBe('inTune');
    expect(r.next?.key).toBe('inStep');
    expect(r.weeksToNext).toBe(3);
    expect(r.progress).toBeCloseTo(2 / 5);
    expect(stageForWeeks(0).progress).toBe(0);
    expect(stageForWeeks(2).weeksToNext).toBe(1);
  });

  it('has no next stage at the top', () => {
    const r = stageForWeeks(60);
    expect(r.next).toBeNull();
    expect(r.weeksToNext).toBeNull();
    expect(r.progress).toBe(1);
  });

  it('is defensive against bad input', () => {
    expect(stageForWeeks(-4).stage.index).toBe(1);
    expect(stageForWeeks(Number.NaN).stage.index).toBe(1);
    expect(stageForWeeks(2.9).stage.index).toBe(1);
  });
});

describe('stages never sink', () => {
  it('keeps the highest stage seen', () => {
    expect(displayedStage(2, 3).stage.index).toBe(3);
    expect(displayedStage(2, 3).progress).toBe(0);
    expect(displayedStage(10, 3).stage.index).toBe(3);
    expect(displayedStage(20, 3).stage.index).toBe(4);
    expect(displayedStage(0, null).stage.index).toBe(1);
  });

  it('clamps an out-of-range stored index', () => {
    expect(displayedStage(0, 99).stage.index).toBe(6);
  });

  it('announces an ascent exactly once', () => {
    expect(stageAscent(null, 0)).toBeNull();
    expect(stageAscent(1, 2)).toBeNull();
    expect(stageAscent(1, 3)?.key).toBe('inTune');
    expect(stageAscent(2, 3)).toBeNull();
    expect(stageAscent(2, 8)?.key).toBe('inStep');
    // first evaluation on a veteran device: ascent to the stage reached
    expect(stageAscent(null, 20)?.key).toBe('inSync');
    // a lower computed value never announces anything
    expect(stageAscent(4, 5)).toBeNull();
  });
});
