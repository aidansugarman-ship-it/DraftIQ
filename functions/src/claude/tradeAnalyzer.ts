import * as functions from 'firebase-functions';
import { callClaude } from '../utils/claudeClient';
import { hashString } from '../utils/firestoreCache';

interface TradePlayer {
  name:          string;
  position:      string;
  team:          string;
  age:           number;
  fantasyScore:  number;
  injuryStatus:  string;
  contractYear:  boolean;
  recentNews?:   string;
}

interface TradeAnalyzerRequest {
  userId:       string;
  sport:        string;
  scoringType:  string;
  numTeams:     number;
  isDynasty:    boolean;
  giving:       TradePlayer[];
  receiving:    TradePlayer[];
}

export const analyzeTradeValue = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data: TradeAnalyzerRequest) => {
    const formatPlayer = (p: TradePlayer) =>
      `${p.name} (${p.position}, ${p.team}) — Age ${p.age}, Fantasy Score ${p.fantasyScore}/100, Status: ${p.injuryStatus}${p.contractYear ? ', CONTRACT YEAR' : ''}${p.recentNews ? `, News: ${p.recentNews}` : ''}`;

    const userMessage = `
Analyze this ${data.sport} fantasy trade (${data.scoringType}, ${data.numTeams} teams${data.isDynasty ? ', DYNASTY' : ''}).

GIVING UP:
${data.giving.map(formatPlayer).join('\n')}

RECEIVING:
${data.receiving.map(formatPlayer).join('\n')}

Analyze this trade completely. Be direct about who wins and why.

Respond in JSON:
{
  "winner": "giving" | "receiving" | "even",
  "winnerLabel": "You WIN this trade" | "You LOSE this trade" | "This is a fair trade",
  "confidenceLevel": "low" | "medium" | "high",
  "shortTermWinner": "giving" | "receiving" | "even",
  "longTermWinner": "giving" | "receiving" | "even",
  "reasoning": "Full 3-4 sentence analysis paragraph. Be specific, name the real reasons.",
  "givingAnalysis": "2-sentence breakdown of what you're giving up.",
  "receivingAnalysis": "2-sentence breakdown of what you're getting.",
  "valueScore": { "giving": 0-100, "receiving": 0-100 },
  "riskFactors": ["specific risk 1", "specific risk 2"],
  "upsideFactors": ["specific upside 1", "specific upside 2"],
  "dynastyNote": "Only if dynasty — multi-year implications in 1-2 sentences"
}`;

    const response = await callClaude(
      'You are DraftIQ\'s trade analyst. Give honest, specific assessments. Name real players, real injuries, real schedule situations. No generic advice.',
      userMessage,
      { maxTokens: 900 }
    );

    try {
      const result = JSON.parse(response);
      // Save to Firestore trades collection
      const tradeId = hashString(JSON.stringify(data) + Date.now());
      const admin = await import('firebase-admin');
      await admin.firestore().collection('trades').doc(tradeId).set({
        userId:     data.userId,
        input:      data,
        verdict:    result,
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ...result, tradeId };
    } catch {
      return { winner: 'even', winnerLabel: 'Unable to analyze', reasoning: response };
    }
  });
