import type { Player } from './player';
import type { LeagueSettings } from './draft';

export interface TradeInput {
  giving: Player[];
  receiving: Player[];
  leagueSettings?: Partial<LeagueSettings>;
}

export type TradeWinner = 'giving' | 'receiving' | 'even';

export interface TradeVerdict {
  winner: TradeWinner;
  winnerLabel: string;          // "You WIN this trade" / "You LOSE this trade" / "Even trade"
  confidenceLevel: 'low' | 'medium' | 'high';

  shortTermWinner: TradeWinner;
  longTermWinner: TradeWinner;   // dynasty context

  reasoning: string;            // full AI paragraph — the main analysis
  givingAnalysis: string;       // what you're giving up
  receivingAnalysis: string;    // what you're getting

  valueScore: {
    giving: number;             // 0–100
    receiving: number;
  };

  riskFactors: string[];        // bullet points of red flags
  upsideFactors: string[];      // bullet points of reasons this could be great

  dynastyNote?: string;         // GM tier: multi-year implications
  scheduleNote?: string;        // upcoming schedule advantage/disadvantage

  generatedAt: string;
  newsHash: string;
}

export interface Trade {
  id: string;
  userId: string;
  input: TradeInput;
  verdict: TradeVerdict;
  createdAt: string;
}
