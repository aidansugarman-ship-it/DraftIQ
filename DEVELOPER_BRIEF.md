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

## What's left before App Store submission (all accounts/hosting, not code)
1. **Host the legal docs** (`/legal/privacy-policy.md`, `/legal/terms-of-service.md`)
   at public URLs and put the Privacy Policy URL in App Store Connect.
2. **Apple Developer account** ($99/yr) → EAS/Xcode production build → TestFlight.
3. **Sentry** crash reporting — add the SDK + DSN; the ErrorBoundary hook is ready.
4. Optional: **Lineup Auto-Apply** (write to Yahoo) needs a Yahoo write-scope re-auth
   — deliberately not built since the granted scope is read-only.

## Repo
Branch `claude/build-draftiq-app-rIRO0`. See `HANDOFF.md` for engineering context.
