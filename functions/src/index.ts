// DraftIQ — Firebase Cloud Functions entry point
// All AI API keys are server-side only — never exposed to the client.
//
// Secret setup (run once via Firebase CLI):
//   firebase functions:secrets:set GEMINI_API_KEY
//   firebase functions:secrets:set YOUTUBE_API_KEY

import * as admin from 'firebase-admin';

admin.initializeApp();

// ── Claude-powered AI functions ───────────────────────────────────────────
export * from './claude/playerAnalysis';
export * from './claude/draftHotTake';
export * from './claude/draftGrade';
export * from './claude/tradeAnalyzer';
export * from './claude/addDropAdvisor';
export * from './claude/warRoom';
export * from './claude/weeklyReport';
export * from './claude/articleWriter';

// ── Gemini-powered functions (fast / high-frequency) ─────────────────────
export * from './claude/dfsOptimizer';

// ── Scheduled data sync ───────────────────────────────────────────────────
export * from './data/syncPlayers';
export * from './data/syncInjuries';
export * from './data/syncADP';

// ── Push notification triggers ────────────────────────────────────────────
export * from './notifications/injuryAlerts';
export * from './notifications/waiverAlerts';
export * from './notifications/gmReportReminder';
