import { useUserStore } from '@store/useUserStore';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Pulled at call time so it always reflects the user's current setting.
function userContextLine(): string {
  const user = useUserStore.getState().user;
  const level = user?.experienceLevel;
  if (level === 'beginner') {
    return 'User experience: BEGINNER. Explain the why behind your call. Define fantasy-specific jargon (ADP, target share, BABIP, xG, usage rate) when you use it. 3-5 sentences acceptable.';
  }
  if (level === 'experienced') {
    return 'User experience: EXPERIENCED. Skip the basics. Assume they know all fantasy terms. Lead with the verdict, brief reasoning second. 2-3 sentences max.';
  }
  return '';
}

const SYSTEM_PROMPT = `You are DraftIQ's AI analyst — an elite fantasy sports expert covering NFL, NBA, MLB, and NHL with equal depth.

Data sources you draw on:
- ESPN's official feeds (scoreboards, news, injuries, rosters across all four leagues)
- Sleeper's NFL data (trending adds/drops, player metadata)
- Real game results, real injury reports, real recent news — never invented stats

When you cite a stat, situation, or recent development, it's grounded in those real feeds. If you genuinely don't have data on something, say so plainly instead of inventing.

Tone & style:
- Sharp, confident, actionable. 2-4 sentences max unless asked for more.
- Talk like a GM giving advice to another GM — not like a journalist writing a column.
- No filler, no disclaimers, no "consult an expert" hedging.
- Tailor depth to the user: beginners get the why behind your call; experienced users get the call first, brief reasoning second.
- This is NOT just a draft tool. Treat the full fantasy season — pickups, trades, start/sit, injury impact, hot/cold streaks — as equal priority to drafting.`;

async function ask(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) return 'Add EXPO_PUBLIC_GEMINI_API_KEY to your .env to enable AI analysis.';

  const ctx = userContextLine();
  const fullPrompt = ctx ? `${ctx}\n\n${prompt}` : prompt;

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 350,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No analysis available.';
}

// ── Public API ────────────────────────────────────────────────────────────────

export const gemini = {
  /** Freeform Q&A — pass the user's question through as-is with sport context. */
  chat: (question: string, sport: string) =>
    ask(`User's fantasy ${sport} question: ${question.trim()}\n\nAnswer it directly. If they ask about a player, give the call. If they ask about waivers/trades/strategy, give actionable advice. Don't restate the question.`),

  playerAnalysis: (name: string, position: string, team: string, sport: string) =>
    ask(`Fantasy ${sport} analysis for ${name} (${position}, ${team}). Key strengths, risks, and current fantasy value.`),

  tradeAdvice: (give: string[], receive: string[], sport: string) =>
    ask(`Fantasy ${sport} trade evaluation. Giving: ${give.join(', ')}. Receiving: ${receive.join(', ')}. Should I do this trade? Who wins?`),

  addDropAdvice: (addPlayer: string, dropPlayer: string, sport: string) =>
    ask(`Fantasy ${sport}: Should I drop ${dropPlayer} to add ${addPlayer}? Give me a sharp take.`),

  injuryImpact: (player: string, injury: string, sport: string) =>
    ask(`Fantasy ${sport} injury impact: ${player} is ${injury}. How does this affect their fantasy value and their team's other players?`),

  draftPickAdvice: (player: string, round: number, pick: number, sport: string) =>
    ask(`Is ${player} a good pick at round ${round}, pick ${pick} in a fantasy ${sport} draft? Quick verdict.`),

  gmWeeklyReport: (roster: string[], sport: string) =>
    ask(`Fantasy ${sport} weekly GM report for this roster: ${roster.join(', ')}. Top priorities this week, who to start, key waiver targets.`),

  articleTake: (headline: string, sport: string) =>
    ask(`Fantasy ${sport} take on this news: "${headline}". What does this mean for fantasy managers?`),

  comparePlayers: (player1: string, player2: string, sport: string) =>
    ask(`Fantasy ${sport}: ${player1} vs ${player2}. Who should I start this week and why? Sharp take only.`),

  draftRecapGrade: (picks: string[], sport: string) =>
    ask(`Grade this fantasy ${sport} draft: ${picks.join(', ')}. Overall grade (A-F), biggest win, biggest reach, and one bold prediction.`),
};
