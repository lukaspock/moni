// Opens the matching screen when the user taps a møni notification (meal reminder / nudge).
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { routeForNotificationData } from './notificationRoute';

/**
 * Responses already routed in this JS session. `getLastNotificationResponse()`
 * keeps returning the cold-start tap, so a remount (e.g. sign-out → sign-in)
 * must not navigate again.
 */
const handled = new Set<string>();

function responseKey(r: Notifications.NotificationResponse): string {
  return `${r.notification.request.identifier}@${r.notification.date}`;
}

function routeResponse(response: Notifications.NotificationResponse): void {
  // Action buttons ("not today", "less of this") stay in the background.
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER)
    return;
  const key = responseKey(response);
  if (handled.has(key)) return;
  handled.add(key);
  const route = routeForNotificationData(
    response.notification.request.content.data,
  );
  if (!route) return;
  router.navigate(
    (route.params
      ? { pathname: route.pathname, params: route.params }
      : route.pathname) as Href,
  );
}

/**
 * Mount ONCE inside the signed-in navigator (it runs from `useNudgeScheduler`,
 * which lives in `app/(tabs)/_layout.tsx`): routing only makes sense once the
 * auth gate shows the tabs. Covers cold start (the tap that launched the app)
 * and taps while running / in the background.
 */
export function useNotificationRouting(): void {
  useEffect(() => {
    const last = Notifications.getLastNotificationResponse();
    if (last) routeResponse(last);
    const sub =
      Notifications.addNotificationResponseReceivedListener(routeResponse);
    return () => sub.remove();
  }, []);
}
