import type { SportId } from '../constants/sports';
import type { PlayerSummary } from './player';

export type InjuryStatus   = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'day-to-day';
export type InjurySeverity = 'minor' | 'moderate' | 'severe' | 'season-ending';

export interface InjuryReport {
  playerId: string;
  player?: PlayerSummary;          // populated on fetch
  sport: SportId;
  status: InjuryStatus;
  severity: InjurySeverity;
  bodyPart: string;
  injuryType: string;              // "hamstring", "ACL", "concussion", etc.
  description: string;
  reportedAt: string;
  expectedReturnDate?: string;     // ISO
  expectedReturnWeek?: number;     // for NFL (1–18)
  missedGamesEstimate?: string;    // "2–4 weeks"

  fantasyImpact: number;           // 1–10, how much does this hurt fantasy value
  fantasyImpactNote: string;       // one-sentence explanation

  handcuffPlayerId?: string;       // backup player ID
  handcuffUrgency: 'low' | 'medium' | 'high'; // how important is the handcuff

  practiceStatus?: 'full' | 'limited' | 'dnp' | 'est';
  gameStatus: 'active' | 'inactive' | 'questionable' | 'out';

  lastUpdated: string;
  source: string;
}

export type InjuryFilter = {
  sport?: SportId;
  status?: InjuryStatus;
  severity?: InjurySeverity;
  position?: string;
  minFantasyImpact?: number;
};
