import * as functions from 'firebase-functions/v1';
import { callGeminiJSON, GEMINI_PRO } from '../utils/geminiClient';

interface DFSPlayer {
  name:          string;
  position:      string;
  team:          string;
  opponent:      string;
  salary:        number;
  projectedPoints: number;
  fantasyScore:  number;
  impliedTotal?: number;
  weather?:      string;
}

interface DFSOptimizerRequest {
  platform:   'draftkings' | 'fanduel';
  sport:      string;
  slate:      string;
  budget:     number;    // e.g. 50000 for DraftKings
  positions:  Record<string, number>;  // e.g. { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, DST: 1 }
  playerPool: DFSPlayer[];
  strategy:   'cash' | 'gpp' | 'balanced';
}

interface DFSLineup {
  lineup:       Array<{ position: string; playerName: string; salary: number; projectedPoints: number }>;
  totalSalary:  number;
  totalProjected: number;
  reasoning:    string;
  captainPick?: string;  // Showdown captain for some formats
}

// Gemini Pro handles DFS optimization — it excels at structured constraint-satisfaction problems
export const optimizeDFSLineup = functions
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data: DFSOptimizerRequest) => {
    const prompt = `
You are a DFS lineup optimizer for ${data.platform} ${data.sport}.

Slate: ${data.slate}
Budget: $${data.budget.toLocaleString()}
Strategy: ${data.strategy} (cash = safe floor, gpp = high ceiling, balanced = both)
Lineup format: ${JSON.stringify(data.positions)}

PLAYER POOL (sorted by projected points):
${data.playerPool
  .sort((a, b) => b.projectedPoints - a.projectedPoints)
  .slice(0, 30)
  .map(p => `${p.name} (${p.position}, ${p.team} vs ${p.opponent}) — Salary: $${p.salary.toLocaleString()}, Proj: ${p.projectedPoints} pts, Score: ${p.fantasyScore}/100${p.impliedTotal ? `, Implied Total: ${p.impliedTotal}` : ''}${p.weather ? `, Weather: ${p.weather}` : ''}`)
  .join('\n')}

Build the optimal lineup. Stay under the $${data.budget.toLocaleString()} budget.
For GPP: maximize ceiling and differentiation. For cash: maximize floor and safety.

Return JSON matching this exact structure:
{
  "lineup": [
    { "position": "QB", "playerName": "Name", "salary": 8000, "projectedPoints": 28.4 }
  ],
  "totalSalary": 49800,
  "totalProjected": 165.2,
  "reasoning": "2-3 sentence explanation of the key construction decisions and stack logic."
}`;

    return await callGeminiJSON<DFSLineup>(prompt, {
      model:     GEMINI_PRO,
      maxTokens: 1000,
    });
  });
