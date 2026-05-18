import * as functions from 'firebase-functions/v1';
import { callClaude } from '../utils/claudeClient';

interface RosterPlayer {
  name:         string;
  position:     string;
  team:         string;
  fantasyScore: number;
  injuryStatus: string;
  recentTrend:  'rising' | 'falling' | 'stable';
}

interface WaiverPlayer {
  name:         string;
  position:     string;
  team:         string;
  fantasyScore: number;
  adp:          number;
  recentNews?:  string;
}

interface AddDropRequest {
  userId:       string;
  sport:        string;
  scoringType:  string;
  numTeams:     number;
  tier:         string;
  roster:       RosterPlayer[];
  waiverWire:   WaiverPlayer[];
}

export const getAddDropRecommendations = functions
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data: AddDropRequest) => {
    const maxRecs = data.tier === 'gm' ? 10 : 5;

    const userMessage = `
You are advising a fantasy manager on waiver wire moves in ${data.sport} (${data.scoringType}, ${data.numTeams} teams).

CURRENT ROSTER:
${data.roster.map(p => `${p.name} (${p.position}, ${p.team}) — Score: ${p.fantasyScore}/100, Status: ${p.injuryStatus}, Trend: ${p.recentTrend}`).join('\n')}

AVAILABLE ON WAIVERS (top candidates):
${data.waiverWire.slice(0, 20).map(p => `${p.name} (${p.position}, ${p.team}) — Score: ${p.fantasyScore}/100, ADP: ${p.adp}${p.recentNews ? `, News: ${p.recentNews}` : ''}`).join('\n')}

Recommend up to ${maxRecs} moves. For each: who to drop, who to add, and why in 1–2 sentences.

Respond in JSON:
{
  "recommendations": [
    {
      "priority": 1-10,
      "drop": "player name",
      "add": "player name",
      "reasoning": "specific 1-2 sentence explanation",
      "type": "upgrade" | "streaming" | "handcuff" | "injury-replacement"
    }
  ],
  "weeklyStreamers": ["name1", "name2"],
  "holdAlert": "1 sentence about any roster player worth holding despite recent struggles"
}`;

    const response = await callClaude(
      'You are a sharp fantasy analyst who knows every waiver wire. Be specific about why each add/drop matters this week.',
      userMessage,
      { maxTokens: 800 }
    );

    try {
      return JSON.parse(response);
    } catch {
      return { recommendations: [], weeklyStreamers: [] };
    }
  });
