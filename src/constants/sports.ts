// ─────────────────────────────────────────────────────────────────────────────
// Sport definitions — sport-agnostic architecture.
// To add a new sport (MLS, PGA, etc.) add one entry to SPORTS below.
// Zero structural changes required elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export type SportId = 'nfl' | 'nba' | 'mlb' | 'nhl';

export interface Position {
  id: string;
  label: string;
  abbrev: string;
  fantasyEligible: boolean;
  isFlexEligible?: boolean;
}

export type ScoringTypeId = 'ppr' | 'half-ppr' | 'standard' | 'category' | 'points';

export interface ScoringOption {
  id: ScoringTypeId;
  label: string;
  description: string;
}

export interface Sport {
  id: SportId;
  label: string;
  shortLabel: string;
  emoji: string;
  primaryColor: string;
  positions: Position[];
  scoringTypes: ScoringOption[];
  hasWeatherImpact: boolean;   // NFL/MLB outdoor games
  hasVegasOdds: boolean;       // All major sports have lines
  hasDynasty: boolean;         // Supports dynasty/keeper leagues
  hasDFS: boolean;             // DraftKings/FanDuel support
  season: {
    startMonth: number;        // 1-indexed
    endMonth: number;
    label: string;
  };
  statLabels: {
    primaryStat: string;       // "Fantasy Points"
    usageStat: string;         // "Snap %" | "Minutes" | "AB" | "Ice Time"
    scoringStat: string;       // "TD" | "PTS" | "HR" | "G+A"
    keyStats: string[];        // stat keys shown on player card
  };
}

export const SPORTS: Record<SportId, Sport> = {
  nfl: {
    id: 'nfl',
    label: 'NFL Football',
    shortLabel: 'NFL',
    emoji: '🏈',
    primaryColor: '#013369',
    positions: [
      { id: 'QB',  label: 'Quarterback',    abbrev: 'QB',  fantasyEligible: true,  isFlexEligible: false },
      { id: 'RB',  label: 'Running Back',   abbrev: 'RB',  fantasyEligible: true,  isFlexEligible: true  },
      { id: 'WR',  label: 'Wide Receiver',  abbrev: 'WR',  fantasyEligible: true,  isFlexEligible: true  },
      { id: 'TE',  label: 'Tight End',      abbrev: 'TE',  fantasyEligible: true,  isFlexEligible: true  },
      { id: 'K',   label: 'Kicker',         abbrev: 'K',   fantasyEligible: true,  isFlexEligible: false },
      { id: 'DEF', label: 'Defense / ST',   abbrev: 'DST', fantasyEligible: true,  isFlexEligible: false },
      { id: 'OL',  label: 'Offensive Line', abbrev: 'OL',  fantasyEligible: false, isFlexEligible: false },
      { id: 'LB',  label: 'Linebacker',     abbrev: 'LB',  fantasyEligible: false, isFlexEligible: false },
      { id: 'CB',  label: 'Cornerback',     abbrev: 'CB',  fantasyEligible: false, isFlexEligible: false },
      { id: 'S',   label: 'Safety',         abbrev: 'S',   fantasyEligible: false, isFlexEligible: false },
    ],
    scoringTypes: [
      { id: 'ppr',      label: 'PPR',      description: '1 point per reception' },
      { id: 'half-ppr', label: 'Half PPR', description: '0.5 points per reception' },
      { id: 'standard', label: 'Standard', description: 'No reception points' },
    ],
    hasWeatherImpact: true,
    hasVegasOdds: true,
    hasDynasty: true,
    hasDFS: true,
    season: { startMonth: 9, endMonth: 2, label: '2025 Season' },
    statLabels: {
      primaryStat: 'Fantasy Points',
      usageStat: 'Snap %',
      scoringStat: 'TD',
      keyStats: ['passingYards', 'rushingYards', 'receivingYards', 'touchdowns', 'targets', 'snapPct'],
    },
  },

  nba: {
    id: 'nba',
    label: 'NBA Basketball',
    shortLabel: 'NBA',
    emoji: '🏀',
    primaryColor: '#C9082A',
    positions: [
      { id: 'PG',   label: 'Point Guard',    abbrev: 'PG', fantasyEligible: true },
      { id: 'SG',   label: 'Shooting Guard', abbrev: 'SG', fantasyEligible: true },
      { id: 'SF',   label: 'Small Forward',  abbrev: 'SF', fantasyEligible: true },
      { id: 'PF',   label: 'Power Forward',  abbrev: 'PF', fantasyEligible: true },
      { id: 'C',    label: 'Center',         abbrev: 'C',  fantasyEligible: true },
      { id: 'G',    label: 'Guard',          abbrev: 'G',  fantasyEligible: true },
      { id: 'F',    label: 'Forward',        abbrev: 'F',  fantasyEligible: true },
      { id: 'UTIL', label: 'Utility',        abbrev: 'UT', fantasyEligible: true },
    ],
    scoringTypes: [
      { id: 'category', label: 'Categories', description: '9-cat / 8-cat roto' },
      { id: 'points',   label: 'Points',     description: 'Points-based scoring' },
    ],
    hasWeatherImpact: false,
    hasVegasOdds: true,
    hasDynasty: true,
    hasDFS: true,
    season: { startMonth: 10, endMonth: 6, label: '2025-26 Season' },
    statLabels: {
      primaryStat: 'Fantasy Points',
      usageStat: 'Minutes',
      scoringStat: 'PTS',
      keyStats: ['points', 'rebounds', 'assists', 'steals', 'blocks', 'minutesPerGame', 'usagePct'],
    },
  },

  mlb: {
    id: 'mlb',
    label: 'MLB Baseball',
    shortLabel: 'MLB',
    emoji: '⚾',
    primaryColor: '#002D72',
    positions: [
      { id: 'SP',   label: 'Starting Pitcher', abbrev: 'SP',   fantasyEligible: true },
      { id: 'RP',   label: 'Relief Pitcher',   abbrev: 'RP',   fantasyEligible: true },
      { id: 'C',    label: 'Catcher',          abbrev: 'C',    fantasyEligible: true },
      { id: '1B',   label: 'First Base',       abbrev: '1B',   fantasyEligible: true },
      { id: '2B',   label: 'Second Base',      abbrev: '2B',   fantasyEligible: true },
      { id: '3B',   label: 'Third Base',       abbrev: '3B',   fantasyEligible: true },
      { id: 'SS',   label: 'Shortstop',        abbrev: 'SS',   fantasyEligible: true },
      { id: 'OF',   label: 'Outfield',         abbrev: 'OF',   fantasyEligible: true },
      { id: 'UTIL', label: 'Utility',          abbrev: 'UTIL', fantasyEligible: true },
      { id: 'P',    label: 'Pitcher',          abbrev: 'P',    fantasyEligible: true },
    ],
    scoringTypes: [
      { id: 'category', label: 'Categories', description: '5x5 / 6x6 rotisserie' },
      { id: 'points',   label: 'Points',     description: 'Points-based scoring' },
    ],
    hasWeatherImpact: true,
    hasVegasOdds: true,
    hasDynasty: true,
    hasDFS: true,
    season: { startMonth: 4, endMonth: 10, label: '2026 Season' },
    statLabels: {
      primaryStat: 'Fantasy Points',
      usageStat: 'AB / IP',
      scoringStat: 'HR / K',
      keyStats: ['homeRuns', 'rbi', 'runs', 'stolenBases', 'avg', 'era', 'whip', 'strikeouts'],
    },
  },

  nhl: {
    id: 'nhl',
    label: 'NHL Hockey',
    shortLabel: 'NHL',
    emoji: '🏒',
    primaryColor: '#000000',
    positions: [
      { id: 'C',  label: 'Center',      abbrev: 'C',  fantasyEligible: true },
      { id: 'LW', label: 'Left Wing',   abbrev: 'LW', fantasyEligible: true },
      { id: 'RW', label: 'Right Wing',  abbrev: 'RW', fantasyEligible: true },
      { id: 'D',  label: 'Defenseman',  abbrev: 'D',  fantasyEligible: true },
      { id: 'G',  label: 'Goalie',      abbrev: 'G',  fantasyEligible: true },
      { id: 'W',  label: 'Wing',        abbrev: 'W',  fantasyEligible: true },
      { id: 'F',  label: 'Forward',     abbrev: 'F',  fantasyEligible: true },
    ],
    scoringTypes: [
      { id: 'category', label: 'Categories', description: 'Rotisserie categories' },
      { id: 'points',   label: 'Points',     description: 'Points-based scoring' },
    ],
    hasWeatherImpact: false,
    hasVegasOdds: true,
    hasDynasty: false,
    hasDFS: true,
    season: { startMonth: 10, endMonth: 6, label: '2025-26 Season' },
    statLabels: {
      primaryStat: 'Fantasy Points',
      usageStat: 'Ice Time',
      scoringStat: 'G+A',
      keyStats: ['goals', 'assists', 'points', 'plusMinus', 'powerPlayPoints', 'icetimePerGame'],
    },
  },
};

export const SPORT_IDS: SportId[] = ['nfl', 'nba', 'mlb', 'nhl'];

export const getSport = (id: SportId): Sport => SPORTS[id];

export const getFantasyPositions = (sportId: SportId): Position[] =>
  SPORTS[sportId].positions.filter((p) => p.fantasyEligible);
