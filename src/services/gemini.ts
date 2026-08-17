import { useUserStore } from '@store/useUserStore';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

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

function urlFor(tier: Tier): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODELS[tier]}:generateContent?key=${GEMINI_API_KEY}`;
}

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

// Call the server-side aiProxy Cloud Function (key stays off-device). Returns
// null if the function isn't deployed/reachable so we can fall back locally.
let proxyDisabledUntil = 0;
async function askViaProxy(systemPrompt: string, fullPrompt: string, tier: Tier): Promise<string | null> {
  // If the proxy recently failed hard (e.g. not deployed), skip it for a while
  // so we don't add a slow round-trip to every call.
  if (Date.now() < proxyDisabledUntil) return null;
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@lib/firebase');
    const fn = httpsCallable<{ systemPrompt: string; prompt: string; tier: Tier; maxTokens: number }, { text: string }>(functions, 'aiProxy');
    const res = await fn({ systemPrompt, prompt: fullPrompt, tier, maxTokens: 2048 });
    return res.data?.text ?? null;
  } catch (e: any) {
    // "not-found"/"internal" on an undeployed function → stop trying for 5 min.
    const code = e?.code ?? '';
    if (code === 'functions/not-found' || code === 'functions/internal' || code === 'functions/unavailable') {
      proxyDisabledUntil = Date.now() + 5 * 60 * 1000;
    }
    return null;
  }
}

async function ask(prompt: string, tier: Tier = 'sharp'): Promise<string> {
  await acquire();
  try {
    const ctx = userContextLine();
    const fullPrompt = ctx ? `${ctx}\n\n${prompt}` : prompt;

    // 1) Preferred path: server-side proxy (no key on device).
    const viaProxy = await askViaProxy(SYSTEM_PROMPT, fullPrompt, tier);
    if (viaProxy) return viaProxy;

    // 2) Fallback: direct call, only possible if a client key is present.
    //    Once the proxy is deployed + verified, remove EXPO_PUBLIC_GEMINI_API_KEY
    //    from the build and this path goes dark automatically.
    if (!GEMINI_API_KEY) return 'AI is warming up — the server key isn\'t set yet. Add it and try again.';

    const body = JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature:     0.8,
        // Plenty of headroom for the JSON-returning prompts (Pulse, Team Report,
        // What If, Spotlight reel, etc.).
        maxOutputTokens: 2048,
        // Both 2.5 models burn tokens on internal "thinking" by default.
        // Zero it out so the full 2048 goes to our actual response.
        thinkingConfig:  { thinkingBudget: 0 },
      },
    });

    // One retry with backoff on 429 (rate limit) or 503 (transient).
    // If the SHARP tier rate-limits, the retry falls back to the FAST tier so
    // the user never sees a hard error from a per-model minute cap.
    for (let attempt = 0; attempt < 2; attempt++) {
      const url = attempt === 1 && tier === 'sharp' ? urlFor('fast') : urlFor(tier);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
        const finish = data.candidates?.[0]?.finishReason;
        if (finish === 'MAX_TOKENS') throw new Error('Response truncated — try a smaller ask.');
        if (finish === 'SAFETY')     throw new Error('Response blocked by safety filter.');
        throw new Error('Empty response from Gemini.');
      }

      if ((res.status === 429 || res.status === 503) && attempt === 0) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      let detail = '';
      try {
        const errBody = await res.json();
        detail = errBody?.error?.message ? ` — ${errBody.error.message}` : '';
      } catch { /* ignore */ }
      throw new Error(`Gemini ${res.status}${detail}`);
    }
    throw new Error('Gemini retried and still failed.');
  } finally {
    release();
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
