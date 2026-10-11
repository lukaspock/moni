import { pickTodaySlot, type TodaySlotInput } from './todaySlot';

const base: TodaySlotInput = {
  isToday: true,
  hasTargets: true,
  firstRun: false,
  careOpen: false,
  nextStep: 'none',
  trainingPlanned: false,
  workoutDone: false,
  restDayOpen: false,
  fitAvailable: false,
};

describe('pickTodaySlot', () => {
  it('none without any candidate', () => {
    expect(pickTodaySlot(base)).toBe('none');
  });

  it('first run wins over everything', () => {
    expect(
      pickTodaySlot({
        ...base,
        firstRun: true,
        careOpen: true,
        restDayOpen: true,
        nextStep: 'logWeight',
        trainingPlanned: true,
        fitAvailable: true,
      }),
    ).toBe('firstRun');
  });

  it('care beats rest day, next step, training and fit', () => {
    expect(
      pickTodaySlot({
        ...base,
        careOpen: true,
        restDayOpen: true,
        nextStep: 'startWorkout',
        trainingPlanned: true,
        fitAvailable: true,
      }),
    ).toBe('care');
  });

  it('next step and fit beat an open rest day', () => {
    expect(
      pickTodaySlot({ ...base, restDayOpen: true, nextStep: 'logWeight' }),
    ).toBe('nextStep');
    expect(
      pickTodaySlot({ ...base, restDayOpen: true, fitAvailable: true }),
    ).toBe('fit');
    expect(pickTodaySlot({ ...base, restDayOpen: true })).toBe('restDay');
  });

  it('rest day never shows on a planned or trained day', () => {
    expect(
      pickTodaySlot({ ...base, restDayOpen: true, trainingPlanned: true }),
    ).toBe('trainingPlanned');
    expect(
      pickTodaySlot({ ...base, restDayOpen: true, workoutDone: true }),
    ).toBe('trainingDone');
  });

  it('only actionable next steps take the slot', () => {
    expect(pickTodaySlot({ ...base, nextStep: 'logWeight' })).toBe('nextStep');
    expect(pickTodaySlot({ ...base, nextStep: 'proteinBridge' })).toBe(
      'nextStep',
    );
    expect(pickTodaySlot({ ...base, nextStep: 'startWorkout' })).toBe(
      'nextStep',
    );
    expect(pickTodaySlot({ ...base, nextStep: 'logMeal' })).toBe('none');
    expect(pickTodaySlot({ ...base, nextStep: 'closeDay' })).toBe('none');
    expect(pickTodaySlot({ ...base, nextStep: 'weeklyReview' })).toBe('none');
  });

  it('next step needs targets', () => {
    expect(
      pickTodaySlot({ ...base, hasTargets: false, nextStep: 'logWeight' }),
    ).toBe('none');
  });

  it('next step beats planned training and fit', () => {
    expect(
      pickTodaySlot({
        ...base,
        nextStep: 'proteinBridge',
        trainingPlanned: true,
        fitAvailable: true,
      }),
    ).toBe('nextStep');
  });

  it('planned training beats fit; done training falls behind fit', () => {
    expect(
      pickTodaySlot({ ...base, trainingPlanned: true, fitAvailable: true }),
    ).toBe('trainingPlanned');
    expect(
      pickTodaySlot({
        ...base,
        trainingPlanned: true,
        workoutDone: true,
        fitAvailable: true,
      }),
    ).toBe('fit');
    expect(
      pickTodaySlot({ ...base, trainingPlanned: true, workoutDone: true }),
    ).toBe('trainingDone');
  });

  it('other days only show completed training', () => {
    const other = { ...base, isToday: false };
    expect(
      pickTodaySlot({
        ...other,
        firstRun: true,
        careOpen: true,
        fitAvailable: true,
        nextStep: 'logWeight',
      }),
    ).toBe('none');
    expect(pickTodaySlot({ ...other, workoutDone: true })).toBe('trainingDone');
  });
});
