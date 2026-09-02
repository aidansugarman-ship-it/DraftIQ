import * as Sentry from '@sentry/react-native';

/**
 * Crash + error reporting.
 *
 * Deliberately inert until EXPO_PUBLIC_SENTRY_DSN is set, so the app runs
 * identically with or without a Sentry account. Every export below is a no-op
 * when uninitialised — callers never need to check.
 *
 * The DSN is safe to ship in the client: it's a write-only ingest endpoint,
 * not a credential (this is Sentry's documented model). It is NOT like the
 * Gemini key — see src/services/gemini.ts.
 *
 * NOTE ON THE EXPO CONFIG PLUGIN:
 * "@sentry/react-native" is deliberately NOT in app.json's plugins array.
 * That plugin wraps the "Bundle React Native code and images" build phase in
 * `sentry-cli react-native xcode` to upload source maps. Without a configured
 * Sentry org/project/auth token it fails, and because the phase runs under
 * `set +e` it fails *silently* — producing an .app with no main.jsbundle that
 * crashes on launch with "No bundle URL present". CI still goes green.
 *
 * When you have a Sentry account: add the org/project/authToken config, add
 * the plugin back to app.json, and verify the built .app actually contains
 * main.jsbundle before shipping it.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let initialised = false;

/** True once Sentry is live. False when no DSN is configured. */
export const isReportingEnabled = (): boolean => initialised;

/**
 * Strip anything user-identifying or sensitive before it leaves the device.
 * Fantasy prompts can contain league names, team names and free-text the user
 * typed, so we don't ship request bodies or breadcrumb data wholesale.
 */
// Derived from the SDK's own option signature rather than a named export, so
// it keeps compiling if Sentry reshuffles its exported types on upgrade.
type ScrubbableEvent = Parameters<NonNullable<Sentry.ReactNativeOptions['beforeSend']>>[0];

function scrub(event: ScrubbableEvent): ScrubbableEvent | null {
  if (event.user) {
    // Keep only the opaque uid — never email, username or IP.
    event.user = event.user.id ? { id: event.user.id } : {};
  }
  delete event.contexts?.device?.name;
  if (event.request) delete event.request.data;
  event.breadcrumbs = event.breadcrumbs?.filter(
    (b: Sentry.Breadcrumb) => b.category !== 'console' && b.category !== 'xhr',
  );
  return event;
}

export function initErrorReporting(): void {
  if (initialised || !DSN) return;
  try {
    Sentry.init({
      dsn: DSN,
      environment: __DEV__ ? 'development' : 'production',
      // Don't attach IP / cookies / headers automatically.
      sendDefaultPii: false,
      // Performance tracing is useful but noisy; sample lightly in prod.
      tracesSampleRate: __DEV__ ? 0 : 0.2,
      enableAutoSessionTracking: true,
      beforeSend: scrub,
    });
    initialised = true;
  } catch {
    // Reporting must never be the reason the app fails to start.
    initialised = false;
  }
}

/** Report a caught error with optional context. Safe to call anywhere. */
export function captureError(
  error: unknown,
  context?: { scope?: string; extra?: Record<string, unknown> },
): void {
  if (!initialised) return;
  try {
    Sentry.captureException(error, {
      tags: { scope: context?.scope ?? 'app' },
      extra: context?.extra,
    });
  } catch { /* never throw from the reporter */ }
}

/**
 * Associate crashes with a user so a bug report can be traced to a session.
 * Only the Firebase uid is sent — never email or display name.
 */
export function setReportingUser(uid: string | null): void {
  if (!initialised) return;
  try {
    Sentry.setUser(uid ? { id: uid } : null);
  } catch { /* ignore */ }
}
