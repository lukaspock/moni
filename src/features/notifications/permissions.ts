import * as Notifications from 'expo-notifications';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

function toPermission(
  status: Notifications.NotificationPermissionsStatus,
): ReminderPermission {
  if (status.granted) return 'granted';
  const ios = status.ios?.status;
  if (
    ios === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    ios === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Shows the system permission prompt (only the first time; afterwards returns the stored answer). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  const status = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return toPermission(status);
}
