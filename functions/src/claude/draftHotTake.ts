import * as functions from 'firebase-functions/v1';
import { callGemini, GEMINI_FLASH } from '../utils/geminiClient';

interface HotTakeRequest {
  playerName:      string;
  position:        string;
  pickNumber:      number;
  round:           number;
  consensusADP:    number;
  userArchetype:   string;
  scoringType:     string;
  recentContext?:  string; // injury note, news, etc.
}

// Gemini Flash handles hot-takes — they're high-frequency (one per pick) and need to be fast.
// Claude handles the deeper background stories and trade analysis.
export const getDraftHotTake = functions
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data: HotTakeRequest) => {
    const valueGap = data.consensusADP - data.pickNumber;
    const isValue  = valueGap > 5;
    const isReach  = valueGap < -8;

    const prompt = `You are DraftIQ's live draft commentator. Give a sharp, one-sentence hot take on this pick.
Be opinionated and entertaining — like an ESPN analyst reacting in real time. No hedging.

Pick: ${data.playerName} (${data.position}), Round ${data.round}, Pick ${data.pickNumber}
Consensus ADP: ${data.consensusADP} (${isValue ? `great value — ${valueGap} spots early` : isReach ? `slight reach — ${Math.abs(valueGap)} spots late` : 'right on ADP'})
League scoring: ${data.scoringType}
Manager archetype: ${data.userArchetype}
${data.recentContext ? `Context: ${data.recentContext}` : ''}

Write ONE punchy sentence. Max 20 words. Lead with value judgment, then the key reason.
Example: "Steal of the draft — he's a top-5 RB in PPR leagues and nobody else noticed."`;

    const hotTake = await callGemini(prompt, {
      model:       GEMINI_FLASH,
      maxTokens:   80,
      temperature: 0.85,
    });

    return { hotTake: hotTake.trim() };
  });
