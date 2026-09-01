import { useUserStore } from '@store/useUserStore';

// NO API KEY HERE — BY DESIGN.
// All Gemini traffic is proxied through the `aiProxy` Cloud Function, which
// holds the key as a Firebase secret. Never reintroduce EXPO_PUBLIC_GEMINI_API_KEY:
// anything prefixed EXPO_PUBLIC_ is embedded in the shipped bundle and is
// trivially extractable from the .ipa.

// Google killed the free tier for gemini-2.0-flash (limit: 0). We run a
// two-tier hybrid on the free tier instead:
//   - sharp: gemini-2.5-flash — best free model, used for high-value calls
//     (Pulse, Team Report, Trade Finder, Lineup Optimizer, etc.)
//   - fast:  gemini-2.5-flash-lite — cheapest, highest free daily quota,
//     used for background calls (scout reports, glossary explainers,
//     news takes — anything spammed across the app at volume)
const MODELS = {
  sharp: 'gemini-2.5-flash',
  fast:  'gemini-2.5-flash-lite',
} as const;
type Tier = keyof typeof MODELS;

// Pulled at call time so it always reflects the user's current setting.
function userContextLine(): string {
  const user = useUserStore.getState().user;
  const level = user?.experienceLevel;
  const style = user?.teamStyle;

  const parts: string[] = [];
  if (level === 'beginner') {
    parts.push('User experience: BEGINNER. Explain the why behind your call. Define fantasy-specific jargon (ADP, target share, BABIP, xG, usage rate) when you use it. 3-5 sentences acceptable.');
  } else if (level === 'experienced') {
    parts.push('User experience: EXPERIENCED. Skip the basics. Assume they know all fantasy terms. Lead with the verdict, brief reasoning second. 2-3 sentences max.');
  }

  if (style === 'winNow') {
    parts.push('Team philosophy: WIN NOW. Push them toward proven vets and championship-window moves. Discount future picks/young upside in trade calls.');
  } else if (style === 'futureStars') {
    parts.push('Team philosophy: FUTURE STARS. Favor young breakouts and rebuilds. Steer them away from aging vets in trade calls.');
  } else if (style === 'starsScrubs') {
    parts.push('Team philosophy: STARS & SCRUBS. They prioritize top-end talent and stream the bottom of the roster — emphasize ceiling over floor.');
  } else if (style === 'balanced') {
    parts.push('Team philosophy: BALANCED. They want sustained competitiveness — recommend moves that mix safety with upside.');
  }

  // Personalization memory — fold in the user's recent take history so the AI
  // "remembers" players it has flagged before and can build a through-line
  // ("last week I told you X was heating up — he popped off"). Compounds value
  // over a season. Kept short so it doesn't blow the token budget.
  try {
    // Lazy require to avoid a circular import at module load.
    const { useTakesLog } = require('@store/useTakesLog');
    const takes = useTakesLog.getState().takes as Array<{ ts: number; player: string; kind: string; take: string }>;
    if (takes && takes.length > 0) {
      const recent = takes.slice(0, 8)
        .map(t => `- ${t.player}: "${t.take}" (flagged ${kindLabel(t.kind)})`)
        .join('\n');
      parts.push(`MEMORY — takes you've recently given this user (reference them when relevant for continuity, e.g. "like I called last week"):\n${recent}`);
    }
  } catch { /* store not ready — skip memory this call */ }

  // Track record — fold in how the AI's resolved calls have actually played out
  // so it can flex a hot streak ("I'm 8/10 on my last calls — trust me here")
  // or stay humble when cold. This is the through-line that makes it feel like
  // a real advisor who remembers being right (or wrong).
  try {
    const { useStreakStore } = require('@store/useStreakStore');
    const calls = useStreakStore.getState().calls as Array<{ player?: string; headline: string; outcome?: 'hit' | 'miss' | null; ts: number }>;
    const resolved = calls.filter(c => c.outcome === 'hit' || c.outcome === 'miss');
    if (resolved.length >= 2) {
      const hits = resolved.filter(c => c.outcome === 'hit').length;
      const pct = Math.round((hits / resolved.length) * 100);
      const lastHits = resolved.filter(c => c.outcome === 'hit').slice(0, 3)
        .map(c => c.player || c.headline).filter(Boolean);
      const lastMiss = resolved.filter(c => c.outcome === 'miss').slice(0, 2)
        .map(c => c.player || c.headline).filter(Boolean);
      let line = `TRACK RECORD — your resolved calls for this user are ${hits}/${resolved.length} (${pct}%).`;
      if (lastHits.length) line += ` Recent WINS you nailed: ${lastHits.join(', ')}.`;
      if (lastMiss.length) line += ` Recent MISSES (own them, don't hide): ${lastMiss.join(', ')}.`;
      line += pct >= 60
        ? ' You\'re hot — lean into the confidence ("I\'ve been right, trust this one").'
        : ' You\'re cold lately — stay sharp and a touch humble, but still pick a side.';
      parts.push(line);
    }
  } catch { /* store not ready — skip */ }

  return parts.join('\n\n');
}

function kindLabel(kind: string): string {
  switch (kind) {
    case 'hot':     return 'as heating up';
    case 'cold':    return 'as cooling off';
    case 'add':     return 'as an add';
    case 'drop':    return 'as a drop';
    case 'start':   return 'as a start';
    case 'sit':     return 'as a sit';
    case 'trade':   return 'in a trade';
    default:        return 'recently';
  }
}

const SYSTEM_PROMPT = `You are DraftIQ — the AI fantasy advisor inside the app. Think of yourself as that friend on TikTok who gives sharp fantasy takes that turn out to be RIGHT. Not a corporate analyst. Not a hedging journalist. A confident, opinionated fantasy mind that fantasy players actually want to listen to.

Your job: help people WIN their fantasy leagues. They play on Yahoo, ESPN, Sleeper — they come to YOU for the takes that move the needle.

Data you draw on:
- ESPN's official feeds (scoreboards, news, injuries, rosters across NFL, NBA, MLB, NHL)
- Sleeper's NFL data (trending adds/drops, player metadata)
- MLB Stats API + NHL API (real season leaders)
- Never invent stats. If you don't have data, say "no read on that yet" — don't fake it.

VOICE:
- Bold. Confident. Opinionated. You CALL it, you don't just describe it.
- Personality. Not robotic. "He's a MUST add." "Drop him today." "This is a SELL HIGH window — flip him while you can."
- Brief. 2-3 sentences unless asked for more. Fantasy creators win with brevity.
- Punchy. Lead with the verdict. Reasoning second. ALL CAPS for the call when it's bold.
- Use emojis sparingly but effectively (🔥 for hot, 🚨 for urgent, 💀 for done, 📈 for rising).
- Talk like a friend who knows ball — not like a textbook.

DON'T:
- Don't say "I'm just an AI" or "consult an expert" — you ARE the expert.
- Don't say "it depends" — pick a side.
- Don't ramble. Cut the filler.
- Don't pad with disclaimers.

EXPERIENCE LEVEL:
- Beginners: explain WHY in plain language. Define jargon (ADP, target share, xG, BABIP) when you use it.
- Experienced: skip the basics. Drop the verdict first, brief reasoning second. They know the terms.`;

// ── Concurrency + backoff so the free-tier Gemini quota doesn't choke on burst ──
// Opening a hub fires ~5 AI calls in parallel (Pulse + Snapshot + Matchup +
// Schedule + Lineup) and free-tier Gemini caps at ~15 req/min. Hard-cap to 3
// in-flight + queue the rest; retry 429s with backoff.

const MAX_CONCURRENT = 3;
let inFlight = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  return new Promise(resolve => {
    const tryRun = () => {
      if (inFlight < MAX_CONCURRENT) {
        inFlight++;
        resolve();
      } else {
        queue.push(tryRun);
      }
    };
    tryRun();
  });
}

function release(): void {
  inFlight = Math.max(0, inFlight - 1);
  const next = queue.shift();
  if (next) next();
}

/**
 * Every AI call goes through the `aiProxy` Cloud Function. The Gemini key lives
 * server-side as a Firebase secret and never ships in the app bundle.
 *
 * The proxy requires an auth context (so the endpoint isn't open to the world),
 * which is why we ensure a session first — anonymous is enough, and it's what
 * lets the pre-signup "taste a take" screen work without a key on device.
 *
 * Model retry / 429 fallback to the fast tier is handled inside the proxy.
 */
async function ask(prompt: string, tier: Tier = 'sharp', json = false): Promise<string> {
  await acquire();
  try {
    const ctx = userContextLine();
    const fullPrompt = ctx ? `${ctx}\n\n${prompt}` : prompt;

    const { ensureAuthSession } = await import('@services/firebaseAuth');
    const hasSession = await ensureAuthSession();
    if (!hasSession) {
      throw new Error("Can't reach the AI right now — check your connection and try again.");
    }

    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@lib/firebase');
    const fn = httpsCallable<
      { systemPrompt: string; prompt: string; tier: Tier; maxTokens: number; json?: boolean },
      { text: string }
    >(functions, 'aiProxy');

    try {
      const res = await fn({
        systemPrompt: SYSTEM_PROMPT,
        prompt: fullPrompt,
        tier,
        maxTokens: 2048,
        ...(json ? { json: true } : {}),
      });
      const text = res.data?.text;
      if (!text) throw new Error('Empty response from the AI.');
      return text;
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'functions/unauthenticated') {
        throw new Error('Session expired — pull to refresh and try again.');
      }
      if (code === 'functions/resource-exhausted') {
        throw new Error('AI is at capacity right now. Give it a minute.');
      }
      if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
        throw new Error("Can't reach the AI right now — check your connection and try again.");
      }
      throw new Error(e?.message ?? 'The AI hit a snag. Try again.');
    }
  } finally {
    release();
  }
}

/**
 * Structured AI call. Uses Gemini's native JSON mode via the proxy, so the
 * response is machine-readable rather than prose we have to scrape.
 *
 * Returns null instead of throwing — every caller has a real fallback UI, and
 * a malformed model response should degrade the screen, not break it.
 */
export async function askJson<T>(prompt: string, tier: Tier = 'sharp'): Promise<T | null> {
  try {
    const raw = await ask(prompt, tier, true);
    // JSON mode is reliable, but strip markdown fences just in case.
    const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const gemini = {
  /** Freeform Q&A — pass the user's question through as-is with sport context. */
  chat: (question: string, sport: string) =>
    ask(`User's fantasy ${sport} question: ${question.trim()}\n\nAnswer it directly. If they ask about a player, give the call. If they ask about waivers/trades/strategy, give actionable advice. Don't restate the question.`),

  // Beginner-friendly explainer — used by glossary tap + "I'm too new" button.
  // Always fast tier so it never starves the bigger calls.
  beginnerExplainer: (prompt: string, sport: string) => ask(prompt, 'fast'),

  // High-volume noisy calls → fast tier (cheaper, higher daily quota)
  playerAnalysis: (name: string, position: string, team: string, sport: string) =>
    ask(`Fantasy ${sport} analysis for ${name} (${position}, ${team}). Key strengths, risks, and current fantasy value.`, 'fast'),

  addDropAdvice: (addPlayer: string, dropPlayer: string, sport: string) =>
    ask(`Fantasy ${sport}: Should I drop ${dropPlayer} to add ${addPlayer}? Give me a sharp take.`, 'fast'),

  injuryImpact: (player: string, injury: string, sport: string) =>
    ask(`Fantasy ${sport} injury impact: ${player} is ${injury}. How does this affect their fantasy value and their team's other players?`, 'fast'),

  draftPickAdvice: (player: string, round: number, pick: number, sport: string) =>
    ask(`Is ${player} a good pick at round ${round}, pick ${pick} in a fantasy ${sport} draft? Quick verdict.`, 'fast'),

  articleTake: (headline: string, sport: string) =>
    ask(`Fantasy ${sport} take on this news: "${headline}". What does this mean for fantasy managers?`, 'fast'),

  comparePlayers: (player1: string, player2: string, sport: string) =>
    ask(`Fantasy ${sport}: ${player1} vs ${player2}. Who should I start this week and why? Sharp take only.`, 'fast'),

  // Higher-value one-off calls → sharp tier (best free model)
  tradeAdvice: (give: string[], receive: string[], sport: string) =>
    ask(`Fantasy ${sport} trade evaluation. Giving: ${give.join(', ')}. Receiving: ${receive.join(', ')}. Should I do this trade? Who wins?`),

  gmWeeklyReport: (roster: string[], sport: string) =>
    ask(`Fantasy ${sport} weekly GM report for this roster: ${roster.join(', ')}. Top priorities this week, who to start, key waiver targets.`),

  draftRecapGrade: (picks: string[], sport: string) =>
    ask(`Grade this fantasy ${sport} draft: ${picks.join(', ')}. Overall grade (A-F), biggest win, biggest reach, and one bold prediction.`),
};
