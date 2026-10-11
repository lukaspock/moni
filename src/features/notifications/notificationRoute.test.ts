import { NUDGE_CATEGORY } from '../../domain';
import { NUDGE_ROUTE, routeForNotificationData } from './notificationRoute';

describe('routeForNotificationData', () => {
  it('opens log-food with the meal preselected for meal reminders', () => {
    expect(
      routeForNotificationData({
        kind: 'meal-reminder',
        meal: 'lunch',
        url: '/',
      }),
    ).toEqual({ pathname: '/log-food', params: { meal: 'lunch' } });
  });

  it('ignores an unknown meal but still opens log-food', () => {
    expect(
      routeForNotificationData({ kind: 'meal-reminder', meal: 'brunch' }),
    ).toEqual({ pathname: '/log-food' });
  });

  it('routes nudges per kind', () => {
    expect(
      routeForNotificationData({ kind: 'nudge', nudge: 'eveningNote' }),
    ).toEqual({ pathname: '/log-food' });
    expect(
      routeForNotificationData({ kind: 'nudge', nudge: 'trainingMorning' }),
    ).toEqual({ pathname: '/training' });
    expect(
      routeForNotificationData({ kind: 'nudge', nudge: 'sundayReview' }),
    ).toEqual({ pathname: '/insights/week' });
    expect(
      routeForNotificationData({ kind: 'nudge', nudge: 'weighIn' }),
    ).toEqual({ pathname: '/insights/weight-entry' });
  });

  it('falls back to Today for an unknown nudge kind', () => {
    expect(
      routeForNotificationData({ kind: 'nudge', nudge: 'toString' }),
    ).toEqual({ pathname: '/' });
  });

  it('returns null for foreign notifications', () => {
    expect(routeForNotificationData(undefined)).toBeNull();
    expect(routeForNotificationData({ kind: 'rest-timer' })).toBeNull();
  });

  it('has a route for every nudge kind', () => {
    expect(Object.keys(NUDGE_ROUTE).sort()).toEqual(
      Object.keys(NUDGE_CATEGORY).sort(),
    );
  });
});
