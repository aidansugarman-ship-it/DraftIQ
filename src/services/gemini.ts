import { useUserStore } from '@store/useUserStore';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

  return parts.join('\n\n');
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
