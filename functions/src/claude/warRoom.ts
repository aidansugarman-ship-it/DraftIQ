import * as functions from 'firebase-functions';
import { callClaudeConversation } from '../utils/claudeClient';

interface WarRoomUpdate {
  sessionId:       string;
  currentPick:     number;
  round:           number;
  userPickNumber:  number;
  recentPicks: Array<{
    team:       string;
    player:     string;
    position:   string;
    pickNumber: number;
  }>;
  userTeam: Array<{
    player:   string;
    position: string;
    round:    number;
  }>;
  targets: string[];    // user's flagged targets
  archetype: string;
  scoringType: string;
  sport: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// GM-tier only: real-time AI commentary during a live draft
export const getWarRoomUpdate = functions
  .runWith({ secrets: ['ANTHROPIC_API_KEY'] })
  .https.onCall(async (data: WarRoomUpdate) => {
    const picksUntilUser = data.userPickNumber - data.currentPick;

    const systemPrompt = `You are DraftIQ's War Room AI — a live draft advisor whispering in the manager's ear during their actual draft.
You track the board in real time. You alert them when targets fall. You pivot when positions run dry.
Be concise — managers are under time pressure. Max 2 sentences per alert.
Use urgency language when needed: "TARGET ALERT", "POSITION RUN", "PIVOT NOW", "GREAT VALUE AVAILABLE".`;

    const userMessage = `
Current draft status: Pick ${data.currentPick}, Round ${data.round}.
${picksUntilUser > 0 ? `${picksUntilUser} picks until your turn.` : 'YOUR PICK NOW.'}

Recent picks off the board: ${data.recentPicks.map(p => `${p.player} (${p.position})`).join(', ')}

Your team so far: ${data.userTeam.map(p => `${p.player} (${p.position})`).join(', ') || 'None yet'}

Your targets still available: ${data.targets.join(', ') || 'None flagged'}

Strategy: ${data.archetype}, ${data.scoringType}

Give me a quick war room alert. What should I know right now?`;

    const messages = [
      ...data.conversationHistory,
      { role: 'user' as const, content: userMessage },
    ];

    const response = await callClaudeConversation(systemPrompt, messages, { maxTokens: 200 });

    return { alert: response.trim() };
  });
