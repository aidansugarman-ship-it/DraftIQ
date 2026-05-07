import * as functions from 'firebase-functions';
import { callClaude } from '../utils/claudeClient';
import { getCachedField, setCachedField, hashString } from '../utils/firestoreCache';

interface PlayerAnalysisRequest {
  playerId:    string;
  playerName:  string;
  sport:       string;
  position:    string;
  team:        string;
  recentNews:  string[];
  stats:       Record<string, number>;
  archetype?:  string;
  scoringType?: string;
}

const SYSTEM_PROMPT = `You are DraftIQ's lead fantasy sports analyst — sharp, opinionated, and human-sounding.
You write like a knowledgeable friend who covers the sport full-time, not like a stat bot.
Never use bullet points. Write in full paragraphs with a distinct voice.
Be specific — name actual injuries, schemes, coaches, situations. No generic advice.`;

export const getPlayerAnalysis = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data: PlayerAnalysisRequest) => {
    const newsHash = hashString(data.recentNews.join('|'));

    // Return cached analysis if news hasn't changed in the last 24 hours
    const cached = await getCachedField<{ whyDraft: string; whyAvoid: string }>(
      'players', data.playerId, 'aiAnalysis', 24, newsHash
    );
    if (cached) return cached;

    const userMessage = `
Analyze ${data.playerName} (${data.position}, ${data.team}) for ${data.sport} fantasy.
Scoring type: ${data.scoringType ?? 'PPR'}. Team archetype: ${data.archetype ?? 'Balanced'}.

Recent news:
${data.recentNews.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Key stats: ${JSON.stringify(data.stats)}

Write two separate paragraphs:
1. "WHY DRAFT" — make a compelling, specific case for drafting this player. Name the real reason this is a good play right now.
2. "WHY AVOID" — be honest about the real risks. Don't sugarcoat. Name specific injury history, scheme concerns, or competition.

Each paragraph should be 3–4 sentences. Sound like an analyst who watches every game, not a stats aggregator.`;

    const response = await callClaude(SYSTEM_PROMPT, userMessage, { maxTokens: 600 });

    // Parse the response into two sections
    const sections  = response.split(/WHY AVOID/i);
    const whyDraft  = sections[0].replace(/WHY DRAFT/i, '').trim();
    const whyAvoid  = sections[1]?.trim() ?? '';

    const result = { whyDraft, whyAvoid };
    await setCachedField('players', data.playerId, 'aiAnalysis', result, newsHash);
    return result;
  });

export const getBackgroundStory = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data: PlayerAnalysisRequest) => {
    const newsHash = hashString(data.playerName + data.team + data.sport);

    const cached = await getCachedField<{ headline: string; story: string; funFacts: string[] }>(
      'players', data.playerId, 'backgroundStory', 168 // 7 days
    );
    if (cached) return cached;

    const userMessage = `
Write a DraftIQ Player Background Story for ${data.playerName} (${data.position}, ${data.team}, ${data.sport}).

Include:
1. HEADLINE: One punchy sentence capturing their current narrative (e.g., "Playing for a contract extension with everything to prove in Year 5")
2. STORY: 2–3 paragraphs covering: their path to the NFL/NBA/MLB/NHL, what makes them unique beyond stats, why their current situation matters for fantasy RIGHT NOW. Sound like a beat writer who's covered this player for years.
3. FUN FACTS: 5 bite-sized nuggets most fantasy managers don't know — personality, locker room reputation, off-field stuff, historical quirks, cold-weather splits, anything that makes users feel like insiders.

Format your response as JSON:
{
  "headline": "...",
  "story": "...",
  "funFacts": ["...", "...", "...", "...", "..."]
}`;

    const response = await callClaude(SYSTEM_PROMPT, userMessage, { maxTokens: 900 });

    let result;
    try {
      result = JSON.parse(response);
    } catch {
      result = { headline: '', story: response, funFacts: [] };
    }

    await setCachedField('players', data.playerId, 'backgroundStory', result, newsHash);
    return result;
  });
