const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are DraftIQ's AI analyst — an elite fantasy sports expert with deep knowledge of NFL, NBA, MLB, and NHL.
You give sharp, confident, actionable analysis. Keep responses concise (2-4 sentences max unless asked for more).
Use fantasy-relevant stats. Be direct — no fluff, no disclaimers. Talk like a GM, not a journalist.`;

async function ask(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) return 'Add EXPO_PUBLIC_GEMINI_API_KEY to your .env to enable AI analysis.';

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No analysis available.';
}

// ── Public API ────────────────────────────────────────────────────────────────

export const gemini = {
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
