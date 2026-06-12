# DraftIQ — Engineer Handoff

You're the lead engineer on **DraftIQ** — a React Native (Expo SDK 52, expo-router)
fantasy sports advisor. **NOT a fantasy platform** — a HELPER that sits on top of
Yahoo/ESPN/Sleeper and delivers sharp, opinionated, TikTok-creator-voice AI takes.
Four sports, each its own isolated world: NFL, NBA, MLB, NHL.

Repo: `~/DraftIQ` (branch `claude/build-draftiq-app-rIRO0`). Read `CLAUDE.md` + git
log first — ~45 commits of context.

## Stack
- Expo + expo-router, Firebase auth/firestore
- Yahoo Fantasy OAuth (PKCE, **READ-ONLY scope** — no write scope granted yet)
- Gemini AI hybrid in `src/services/gemini.ts`: **"sharp" tier** = `gemini-2.5-flash`
  (high-value calls), **"fast" tier** = `gemini-2.5-flash-lite` (volume calls).
  `thinkingBudget:0`, 2048 max tokens, concurrency-capped at 3 with 429→fast
  fallback. Google free-tier killed `gemini-2.0-flash` so do **NOT** use it.
- Zustand stores + AsyncStorage persistence (all hydrated in `app/_layout.tsx`)
- Built **ONLY** via GitHub Actions: `.github/workflows/ios-simulator-build.yml`
  (sim) + `ios-device-ipa.yml` (AltStore IPA). No local Xcode. Commit+push triggers
  CI; Release config bundles JS so the app runs standalone.

## What exists (don't rebuild these — extend them)
Sport hubs with collapsible **TODAY / YOUR TEAM / YOUR LEAGUE / DISCOVER** sections.
Features: Lineup Optimizer (+pattern detection from lineup history), Team Report
(GM Score + history chart), Trade Center (Finder/Block/Analyzer tabs), What If sim
(external + in-roster swaps), Power Rankings (tappable teams + why-it-changed),
Playoff Sim, FAAB helper, Cheat Sheet, Am I Good?, Week Recap, Fantasy 101,
Achievements (12 badges), custom Alerts, Spotlight reel, Daily Snapshot (3 ranked
actions), Pulse (hot/cold takes). Plus: conversion onboarding (taste-a-take before
signup at `app/(auth)/quick-start.tsx`), tap-to-translate FAB (`ExplainThisFAB`),
inline glossary (`JargonText` + "got it forever"), per-sport rosters, personalized
Add/Drop scout reports (auto-expand top 5, verdicts reason about the user's roster).

## The 10x retention system (just shipped — this is the spine, build on it)
- **useDailyStreakStore**: consecutive-day open streak (current + best), resets on a
  missed day, checked in once per foreground. `StreakBadge` 🔥 in the hub hero.
- **scheduleDailyLoop()** in `notifications.ts`: 10am "your 3 moves today", 8pm
  "don't break your N-day streak", Sunday 11:30am "lineup lock soon". Re-armed each
  launch.
- **PERSONALIZATION MEMORY**: `userContextLine()` in `gemini.ts` folds the user's 8
  most recent logged takes (`useTakesLog`) into EVERY prompt so the AI references its
  own past calls ("like I told you last week"). Feed more history in here — this
  compounds over a season and is the highest-value lever.
- **ShareTakeButton**: branded shareable takes (growth loop). Wired into Pulse;
  spread it to every take card.

## Philosophy
Yahoo = clean data, Gemini = personality, DraftIQ = the only place they're stitched.
**EVERY AI take must be personalized to the user's actual roster, never generic.**
Voice: bold, confident, opinionated, brief, picks a side.

## Your mandate — keep making it ~10x more valuable WITHOUT new major features
Highest-leverage next moves, in order:
1. **Deepen MEMORY** — feed take outcomes (hit/miss from `useStreakStore`) back into
   prompts so the AI says "I was right about X, trust me on Y."
2. **Make the 10am push DYNAMIC** — generate the actual "3 moves today" via a
   background fetch so the notification body is real, not generic.
3. **Spread ShareTakeButton** + add a rendered image share (`react-native-view-shot`)
   for true screenshot virality.
4. **Wire the streak into stakes that matter** (unlockables, "sicko" tiers).

## Guardrails
- Keep AI cost-conscious (hybrid tiers — sharp only for decision-changing calls).
- Typecheck before every push: `npx tsc --noEmit` (ignore pre-existing errors in
  revenuecat / firebaseAuth / draft / player / onboarding route-typing).
- Commit+push = CI build.
- The ONE thing still blocked: **Lineup Auto-Apply** needs a Yahoo WRITE OAuth scope
  re-auth from the owner — don't attempt without it.
- Ask before destructive changes. **Read the repo and propose a plan before writing
  code.**

## Deferred (need their own focused session)
- Beginner mock drafts with ELI5 per-pick advice
- Auction draft mode
Both are full draft-room rebuilds (live turn-by-turn room, AI opponents, timer).
