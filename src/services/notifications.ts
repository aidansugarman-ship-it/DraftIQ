/**
 * Guarded local-notification helpers.
 *
 * expo-notifications is a native module. If it's missing from the current
 * build, every call here no-ops instead of crashing the screen.
 */

let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

/** Whether the expo-notifications JS module loaded at all. */
export function notificationsModuleLoaded(): boolean {
  return !!Notifications;
}

/**
 * Request permission + schedule a daily "check your lineup" reminder.
 * Returns true only if a reminder is actually scheduled.
 */
export async function enableLineupReminders(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.status === 'granted';
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.status === 'granted';
    }
    if (!granted) return false;

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Lineup check',
        body:  "Lock your starters — don't leave an injured guy in your lineup.",
      },
      // Daily repeating reminder. Wrapped in try/catch in case the trigger
      // shape differs across expo-notifications versions.
      trigger: { hour: 9, minute: 0, repeats: true },
    });
    return true;
  } catch {
    return false;
  }
}

/** Cancel any scheduled lineup reminders. */
export async function disableLineupReminders(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* no-op */
  }
}
