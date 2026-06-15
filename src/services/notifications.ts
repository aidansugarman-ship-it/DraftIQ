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

/**
 * The full daily retention loop. Schedules:
 *   - 10:00am "3 things to do today" (the morning hook)
 *   - 11:30am Sunday "lineup not set?" nag (game-day safety)
 *   - 8:00pm "keep your streak alive" nudge
 * All repeating + idempotent (clears prior schedule first).
 * `streak` is woven into the evening nudge for stakes.
 */
export async function scheduleDailyLoop(streak: number, morningBody?: string): Promise<boolean> {
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

    // Morning hook — the reason to open every day. Body is the REAL "3 moves"
    // generated on the last app open when available, else a generic nudge.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Your 3 moves today',
        body:  morningBody && morningBody.trim()
          ? morningBody.trim()
          : "DraftIQ lined up exactly what to do with your team. Tap in.",
      },
      trigger: { hour: 10, minute: 0, repeats: true },
    });

    // Evening streak nudge — stakes.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: streak > 1 ? `🔥 Don't break your ${streak}-day streak` : '🔥 Build your streak',
        body:  "10 seconds in the app keeps it alive. Your team misses you.",
      },
      trigger: { hour: 20, minute: 0, repeats: true },
    });

    // Sunday late-morning lineup safety net.
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 Lineup lock soon',
        body:  "Games are coming. Make sure no injured guys are still starting.",
      },
      trigger: { weekday: 1, hour: 11, minute: 30, repeats: true }, // 1 = Sunday
    });

    return true;
  } catch {
    return false;
  }
}

/** Turn off the whole daily loop. */
export async function disableDailyLoop(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* no-op */
  }
}

/**
 * Fire-and-forget local notification, used for breaking-news pings on
 * watchlisted players. Silently no-ops if permission isn't granted yet.
 */
export async function pingNow(title: string, body: string): Promise<void> {
  if (!Notifications) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // fire immediately
    });
  } catch {
    /* no-op */
  }
}

/** Request permission upfront — used when the user opts into watchlist alerts. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}
