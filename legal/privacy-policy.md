# DraftIQ — Privacy Policy

_Last updated: September 1, 2026_

DraftIQ ("we", "us") is a fantasy-sports advisory app. This policy explains what
we collect, why, and your choices. We built DraftIQ to be a helper on top of your
existing fantasy leagues — we are not a fantasy platform and we never place trades
or roster moves on your behalf without your explicit action.

## Information we collect

**Account information.** When you sign up we collect your email address and, if you
provide one, a display name and profile photo. Authentication is handled by Google
Firebase.

**Anonymous session before sign-up.** So you can try the app's AI before creating
an account, we create an anonymous Firebase session on first launch. It is a random
identifier only — it contains no name, email, or device identifier, we do not use
it for advertising or tracking across apps or websites, and it is discarded when
you create a real account or delete the app.

**Crash diagnostics.** If crash reporting is enabled in a release, we collect
technical crash reports (error type, stack trace, app version, OS version) to fix
bugs. These are stripped of personal information before they leave your device: we
send only your account's random identifier — never your email, name, or IP address.

**Fantasy league data (read-only).** If you connect a Yahoo Fantasy account, we
request **read-only** access to your leagues, rosters, and standings so the app can
give you personalized advice. We do not have permission to modify your teams. You
can disconnect Yahoo at any time in Settings, which deletes the stored access token
from your device.

**Usage data stored on your device.** Your streak, favorites, saved mock drafts,
graded calls, and preferences are stored locally on your device (AsyncStorage) and
in your private Firestore profile.

**AI request content.** When you use an AI feature, the relevant context (e.g. your
roster, a player name, recent sports headlines) is sent to Google's Gemini API
through our secure server to generate a response. We do not sell this data.

## How we use it

- To provide personalized lineup, waiver, trade, and draft advice
- To operate account features (sign-in, streaks, saved drafts, alerts)
- To send optional notifications you enable (daily reminders, player news)
- To maintain and improve the service

## What we do NOT do

- We do not sell your personal information.
- We do not place trades, add/drops, or lineup changes on your behalf.
- We do not access your Yahoo account beyond read-only league data.

## Third-party services

- **Google Firebase** (authentication, database) — [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy)
- **Google Gemini API** (AI responses) — routed through our server; the API key is never in the app
- **Yahoo Fantasy API** (read-only league data, only if you connect)
- **ESPN / Sleeper / MLB / NHL public APIs** (public sports data — no personal data sent)
- **Sentry** (crash diagnostics, if enabled) — [sentry.io/privacy](https://sentry.io/privacy/)

## Notifications

Notifications are optional and off until you enable them. You can turn them off in
Settings or your device's system settings at any time.

## Data retention & deletion

Your local data is removed when you delete the app or sign out. To delete your
account and associated Firestore data, use **Settings → Delete Account**, or email
us at the address below and we will delete it within 30 days.

## Children

DraftIQ is not directed to children under 13 and we do not knowingly collect data
from them.

## Changes

We may update this policy; the "last updated" date will change. Material changes
will be surfaced in the app.

## Contact

Questions or deletion requests: **support@draftiq.app**
