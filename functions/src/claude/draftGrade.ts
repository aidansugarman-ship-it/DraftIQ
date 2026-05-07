import * as functions from 'firebase-functions';
import { callClaude } from '../utils/claudeClient';

interface DraftGradeRequest {
  userId:        string;
  sport:         string;
  scoringType:   string;
  archetype:     string;
  draftPosition: number;
  numTeams:      number;
  picks: Array<{
    round:         number;
    pickNumber:    number;
    playerName:    string;
    position:      string;
    consensusADP:  number;
  }>;
}

export const getDraftGrade = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data: DraftGradeRequest) => {
    const pickSummary = data.picks
      .map(p => `R${p.round} Pick ${p.pickNumber}: ${p.playerName} (${p.position}) — ADP ${p.consensusADP}`)
      .join('\n');

    const userMessage = `
Grade this ${data.sport} fantasy draft for a manager who played the ${data.archetype} strategy.

League: ${data.numTeams} teams, ${data.scoringType} scoring, draft position ${data.draftPosition}

Picks:
${pickSummary}

Provide:
1. OVERALL_GRADE: A single letter grade (A+, A, B+, B, C+, C, D, F)
2. QB_GRADE, RB_GRADE, WR_GRADE, TE_GRADE (or sport-appropriate positions)
3. BEST_PICKS: Top 3 picks with a one-sentence explanation each
4. SUGGESTIONS: Exactly 3 specific things to do differently next time

Be honest and specific. If a pick was bad, say it clearly.

Respond in JSON:
{
  "overallGrade": "B+",
  "positionGrades": { "QB": "A", "RB": "B", "WR": "A-", "TE": "C" },
  "bestPicks": [
    { "playerName": "...", "round": 3, "reason": "..." },
    { "playerName": "...", "round": 6, "reason": "..." },
    { "playerName": "...", "round": 9, "reason": "..." }
  ],
  "suggestions": ["...", "...", "..."]
}`;

    const response = await callClaude(
      'You are a sharp, honest fantasy sports draft analyst. Give real grades — not everyone gets an A.',
      userMessage,
      { maxTokens: 700 }
    );

    try {
      return JSON.parse(response);
    } catch {
      return { overallGrade: 'B', positionGrades: {}, bestPicks: [], suggestions: [] };
    }
  });
