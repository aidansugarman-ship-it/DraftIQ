import type { SportId, ScoringTypeId } from '../constants/sports';
import type { Player } from './player';

export type TeamArchetype =
  | 'rb-heavy'
  | 'wr-heavy'
  | 'zero-rb'
  | 'balanced'
  | 'stars-scrubs'
  | 'upside-chaser'
  | 'safe-floor';

export type DraftPositionCategory = 'early' | 'middle' | 'late';
export type DraftFormat = 'snake' | 'auction';

export interface TeamArchetypeDefinition {
  id: TeamArchetype;
  label: string;
  emoji: string;
  description: string;
  strategy: string;
  bestFor: string[];
  avoid: string[];
}

export const ARCHETYPES: Record<TeamArchetype, TeamArchetypeDefinition> = {
  'rb-heavy': {
    id: 'rb-heavy',
    label: 'RB Heavy',
    emoji: '🏃',
    description: 'Secure elite RBs early and often. Safe floor, consistent weekly scoring.',
    strategy: 'Draft 3 RBs in your first 4 picks. Accept lesser WR talent.',
    bestFor: ['Standard scoring', 'Shallow leagues', 'Risk-averse managers'],
    avoid: ['PPR leagues with pass-heavy teams'],
  },
  'wr-heavy': {
    id: 'wr-heavy',
    label: 'WR Heavy',
    emoji: '🙌',
    description: 'Load up on volume receivers with high floors in PPR formats.',
    strategy: 'Target WRs in rounds 1–3. Fill RB via late rounds and waivers.',
    bestFor: ['PPR leagues', '12+ team leagues', 'Pass-heavy offenses'],
    avoid: ['Standard scoring', 'Managers who hate waiver wire stress'],
  },
  'zero-rb': {
    id: 'zero-rb',
    label: 'Zero RB',
    emoji: '🎯',
    description: 'Skip RBs entirely in early rounds. Attack the WR/TE elite tier.',
    strategy: 'Draft elite WRs and TEs first. Pivot to RBs round 5+.',
    bestFor: ['PPR', 'Managers comfortable with risk', 'Deep waiver leagues'],
    avoid: ['Shallow leagues', 'Standard scoring'],
  },
  balanced: {
    id: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    description: 'Best player available every pick. No position bias.',
    strategy: 'Follow ADP closely. React to the board, not a script.',
    bestFor: ['All formats', 'New fantasy managers', 'Any league size'],
    avoid: ['Nothing — flexible by design'],
  },
  'stars-scrubs': {
    id: 'stars-scrubs',
    label: 'Stars & Scrubs',
    emoji: '⭐',
    description: 'Pair elite studs with cheap high-upside picks. Boom-or-bust.',
    strategy: 'Reach for 2 elite players. Fill rest with value picks.',
    bestFor: ['Playoff-format leagues', 'Managers who love upside'],
    avoid: ['Consistency-first managers'],
  },
  'upside-chaser': {
    id: 'upside-chaser',
    label: 'Upside Chaser',
    emoji: '🚀',
    description: 'Target breakout candidates, injury returns, and scheme upgrades.',
    strategy: 'Prioritize ceiling over floor at every position.',
    bestFor: ['Large leagues', 'DFS mentality managers', 'Playoff pushes'],
    avoid: ['Head-to-head weekly consistency leagues'],
  },
  'safe-floor': {
    id: 'safe-floor',
    label: 'Safe Floor',
    emoji: '🛡️',
    description: 'Volume-based players. Every pick must have guaranteed weekly touches.',
    strategy: 'Never draft a player who could be benched. Value role security.',
    bestFor: ['Weekly H2H', 'Cash DFS', 'First-time managers'],
    avoid: ['Best ball formats', 'Dynasty leagues'],
  },
};

export interface LeagueSettings {
  sport: SportId;
  scoringType: ScoringTypeId;
  numTeams: number;
  draftPositionCategory: DraftPositionCategory;
  draftPositionNumber?: number;   // 1–numTeams
  numRounds: number;
  format: DraftFormat;
  auctionBudget?: number;         // auction only
  isDynasty: boolean;
  isKeeper: boolean;
  numKeepers?: number;
}

export interface DraftPick {
  pickNumber: number;             // overall pick number (1, 2, 3…)
  round: number;
  pickInRound: number;
  teamIndex: number;              // 0 = user's team
  isUserPick: boolean;
  player: Player;
  hotTake?: string;               // AI commentary on the pick (user picks only)
  grade?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  valueOverADP?: number;          // positive = good value, negative = reach
}

export interface MockDraft {
  id: string;
  userId: string;
  leagueSettings: LeagueSettings;
  archetype: TeamArchetype;
  picks: DraftPick[];
  userTeam: Player[];
  overallGrade: string;          // e.g. "B+"
  positionGrades: Record<string, string>;
  suggestions: string[];         // 3 specific improvement tips
  bestPickMessages: string[];    // top 3 pick highlights
  totalPicks: number;
  completedAt: string;
  shareCardUrl?: string;
}

export interface DraftBoard {
  id: string;
  userId: string;
  leagueSettings: LeagueSettings;
  archetype: TeamArchetype;
  players: DraftBoardEntry[];
  lastUpdated: string;
}

export interface DraftBoardEntry {
  playerId: string;
  player: Player;
  userRank: number;
  aiRank: number;
  consensusADP: number;
  valueGap: number;              // userRank - consensusADP
  flag?: PlayerFlag;
  note?: string;
}

type PlayerFlag = 'target' | 'avoid' | 'watch';

export interface WarRoomAlert {
  type: 'target-falling' | 'position-run' | 'value-pick' | 'pivot-suggestion';
  message: string;
  urgency: 'low' | 'medium' | 'high';
  relatedPlayerIds?: string[];
  timestamp: string;
}
