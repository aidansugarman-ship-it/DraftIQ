# DraftIQ — Developer Brief

_A one-page state-of-the-app for the developer evaluating it for publish._

## What it is
DraftIQ is a **fantasy-sports advisor** (React Native / Expo SDK 52, expo-router).
It sits on top of a user's real Yahoo league and delivers sharp, personalized,
AI-generated advice across NFL / NBA / MLB / NHL. It is NOT a fantasy platform and
never modifies the user's teams — read-only.

## Tech at a glance
- **Frontend:** Expo (SDK 52) + expo-router, TypeScript, Zustand + AsyncStorage.
- **Auth/DB:** Firebase Auth + Firestore (security rules scoped: users own their data).
- **AI:** Google Gemini (2.5-flash / 2.5-flash-lite hybrid), routed through a
  server-side Firebase Cloud Function (`aiProxy`) so the key never ships in the app.
- **League data:** Yahoo Fantasy OAuth (PKCE, **read-only**) + public ESPN / Sleeper /
  MLB / NHL APIs.
- **Payments:** RevenueCat wired for subscriptions.
- **Builds:** GitHub Actions → sim `.app` + AltStore `.ipa` (no local Xcode needed).

## Health signals
- `npx tsc --noEmit` → **0 errors** (app) and **0 errors** (functions).
- App-wide **ErrorBoundary** — no white-screen crashes.
- App icon 1024×1024, splash, dark theme, bundle IDs set (`com.draftiq.app`).
- Working **Delete Account** + in-app **Privacy Policy / Terms**.

## Feature depth (all live)
Per-sport hubs with a top tool rail. Lineup Optimizer (+pattern detection), Team
Report (GM Score + history), Trade Center (Finder / Block / Analyzer), What-If sim,
Power Rankings, Playoff Sim, FAAB helper, Cheat Sheet, live **snake + auction draft
rooms**, Am I Good?, Week Recap, Track Record (grades AI calls, feeds a hit-rate the
AI references back), Fantasy 101, Achievements, custom Alerts, Spotlight reel, Pulse
takes, shareable image cards, conversion onboarding, tap-to-explain glossary.
Retention spine: daily streak + tiers, dynamic 10am push, personalization memory.

## AI security model (done — worth reviewing)
The app ships with **no Gemini key**. Every AI call goes through the deployed
`aiProxy` callable, which holds the key as a Firebase secret. Because the proxy
requires an auth context, the app opens an **anonymous Firebase session** for
pre-signup screens, and `app/_layout.tsx` explicitly does *not* treat an
anonymous session as signed-in for routing. Abuse controls in the proxy:
per-uid daily caps (12 anonymous / 400 real, Firestore-backed transaction),
a 24k-char prompt ceiling, and Firestore rules that deny all client access to
the `aiUsage` counters and restrict owned documents to non-anonymous users.

## Live URLs

- Privacy Policy: https://aidansugarman-ship-it.github.io/DraftIQ/privacy.html
- Terms of Service: https://aidansugarman-ship-it.github.io/DraftIQ/terms.html

Served by GitHub Pages from `/docs`, generated from `/legal/*.md` by
`scripts/build-legal-site.py`. The same markdown generates `src/constants/legal.ts`
for the in-app viewer, so hosted and in-app text cannot drift. Re-run the script
after editing the markdown.

## What's left before App Store submission (accounts/hosting, not code)

1. **Apple Developer account** ($99/yr) -> production build -> TestFlight.
2. **Rotate the Gemini API key.** The old key is compiled into every IPA built
   before the proxy landed; anyone holding one of those files can extract it.
   Issue a new key, set it with
   `firebase functions:secrets:set GEMINI_API_KEY`, then revoke the old one.
3. **Sentry DSN** (optional). Set `EXPO_PUBLIC_SENTRY_DSN` in `.env` and as a
   GitHub secret. Until then crash reporting is inert by design.
4. Optional: **Lineup Auto-Apply** (write to Yahoo) needs a Yahoo write-scope
   re-auth - deliberately not built since the granted scope is read-only.

## Security posture

- Gemini key is server-side only, in the `aiProxy` Cloud Function. No AI key
  ships in the bundle; `.env.example` documents why none may be added.
- Anonymous Firebase sessions let pre-signup screens reach the proxy. Firestore
  rules reject anonymous sessions everywhere via `isRealUser()`, so they can
  read the AI and nothing else.
- Per-user daily AI caps enforced in a Firestore transaction; the `aiUsage`
  collection is closed to all clients so a caller cannot reset its own counter.
- `.env` has never been committed (verified against full git history). The only
  key in history is the Firebase iOS key in `GoogleService-Info.plist`, which is
  public by design and gated by Firestore rules.
- Crash reports are scrubbed to the uid before leaving the device - no email,
  name, IP, device name, console or network breadcrumbs.

## Repo
Branch `claude/build-draftiq-app-rIRO0`. See `HANDOFF.md` for engineering context.
