import * as functions from 'firebase-functions';
import { callClaude } from '../utils/claudeClient';

interface WeeklyReportRequest {
  userId:      string;
  sport:       string;
  week:        number;
  scoringType: string;
  roster: Array<{
    name:         string;
    position:     string;
    team:         string;
    fantasyScore: number;
    injuryStatus: string;
    lastWeekPoints?: number;
    trend:        'rising' | 'falling' | 'stable';
  }>;
  record:      string;  // e.g. "6-4"
  standing:    string;  // e.g. "3rd place"
}

// GM tier only — delivered every Tuesday morning via push notification
export const generateWeeklyReport = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data: WeeklyReportRequest) => {
    const userMessage = `
Generate a personalized DraftIQ GM Report for a ${data.sport} fantasy manager.
Week ${data.week}. Record: ${data.record}. Standing: ${data.standing}. Scoring: ${data.scoringType}.

ROSTER:
${data.roster.map(p =>
  `${p.name} (${p.position}, ${p.team}) — Score: ${p.fantasyScore}/100, Status: ${p.injuryStatus}, Trend: ${p.trend}${p.lastWeekPoints !== undefined ? `, Last week: ${p.lastWeekPoints} pts` : ''}`
).join('\n')}

Write a GM Report with:
1. OVERVIEW: 2-sentence summary of where this team stands and the key storyline this week.
2. POSITION GRADES: Grade each position group (QB, RB, WR, TE) with a letter grade and 1-sentence note.
3. UNDERPERFORMERS: 1-2 players who need to be addressed with suggested waiver replacements.
4. MATCHUP ADVANTAGES: 1-2 players with great upcoming matchups to exploit.
5. BOLD MOVE: One aggressive suggestion — a high-risk high-reward add, drop, or trade target.

Write like a personal analyst who watches this manager's team every week. Be specific, not generic.

Respond in JSON:
{
  "overview": "...",
  "positionGrades": { "QB": { "grade": "A", "note": "..." }, "RB": { "grade": "B-", "note": "..." }, "WR": { "grade": "A-", "note": "..." }, "TE": { "grade": "C+", "note": "..." } },
  "underperformers": [{ "playerName": "...", "issue": "...", "suggestion": "..." }],
  "matchupAdvantages": [{ "playerName": "...", "opponent": "...", "insight": "..." }],
  "boldMove": "..."
}`;

    const response = await callClaude(
      'You are DraftIQ\'s GM analyst. Write like a trusted advisor who has studied this exact roster. Be specific, honest, and actionable.',
      userMessage,
      { maxTokens: 1000 }
    );

    try {
      const report = JSON.parse(response);
      // Cache in Firestore under users/{userId}/gmReports/{week}
      const admin = await import('firebase-admin');
      await admin.firestore()
        .collection('users').doc(data.userId)
        .collection('gmReports').doc(`week-${data.week}`)
        .set({ ...report, generatedAt: admin.firestore.FieldValue.serverTimestamp(), week: data.week });
      return report;
    } catch {
      return { overview: response, positionGrades: {}, underperformers: [], matchupAdvantages: [], boldMove: '' };
    }
  });
