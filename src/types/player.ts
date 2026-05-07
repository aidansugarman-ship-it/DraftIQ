import type { SportId } from '../constants/sports';

export type InjuryStatus = 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir' | 'day-to-day';
export type TrendDirection = 'rising' | 'falling' | 'stable';
export type PlayerFlag = 'target' | 'avoid' | 'watch';

export interface Player {
  id: string;
  sleeperPlayerId?: string;
  name: string;
  firstName: string;
  lastName: string;
  sport: SportId;
  team: string;
  teamAbbrev: string;
  teamCity: string;
  position: string;
  eligiblePositions: string[];
  jerseyNumber?: string;
  age: number;
  experience: number;        // years in league
  college?: string;
  imageUrl?: string;
  teamLogoUrl?: string;

  // Fantasy value
  fantasyScore: number;      // 1–100, AI-generated daily
  adp: number;               // average draft position
  adpTrend: TrendDirection;
  adpTrendSpots: number;     // spots moved in last 7 days
  depthChartPosition: number; // 1 = starter, 2 = backup, etc.
  ownership?: number;        // % of leagues rostered

  // Status
  injuryStatus: InjuryStatus;
  injuryNote?: string;
  injuryBodyPart?: string;
  isActive: boolean;

  // Contract / narrative
  contractYear: boolean;
  contractYearsRemaining: number;
  yearsDrafted?: number;
  draftRound?: number;
  draftPick?: number;

  // Vegas context (NFL/NBA/MLB)
  impliedTeamTotal?: number;
  gameOverUnder?: number;
  vegasSpread?: number;

  // Cached AI content
  aiAnalysis?: AIAnalysis;
  backgroundStory?: BackgroundStory;
  recentNews?: PlayerNews[];
  usageStats?: UsageStats;
  injuryHistory?: InjuryEvent[];
  recentPerformance?: PerformancePoint[];
  upcomingSchedule?: ScheduleGame[];

  lastUpdated: string; // ISO
}

export interface AIAnalysis {
  whyDraft: string;
  whyAvoid: string;
  injuryRiskLevel: 'low' | 'medium' | 'high';
  injuryRiskNote: string;
  schemeFit: string;
  upside: number;   // 1–10
  floor: number;    // 1–10
  confidenceScore: number; // 1–100
  generatedAt: string;
  newsHash: string;  // hash of news items used — invalidates cache if changed
}

export interface BackgroundStory {
  headline: string;   // one-line narrative hook, e.g. "Playing through a contract year with everything to prove"
  story: string;      // 2–3 paragraphs of human context
  funFacts: string[]; // 3–5 bite-sized nuggets most fans don't know
  keyNarratives: string[]; // short labels: "Contract Year", "New Scheme", "Comeback Story"
  generatedAt: string;
}

export interface InjuryEvent {
  date: string;
  injury: string;
  bodyPart: string;
  status: InjuryStatus;
  gamesAffected: number;
  returnDate?: string;
  source?: string;
}

export interface UsageStats {
  // NFL
  snapCount?: number;
  snapPct?: number;
  targetShare?: number;
  airYards?: number;
  redZoneTargets?: number;
  redZoneCarries?: number;
  // NBA
  minutesPerGame?: number;
  usagePct?: number;
  trueShootingPct?: number;
  // MLB
  atBatsPerGame?: number;
  plateAppearances?: number;
  inningsPitched?: number;
  // NHL
  icetimePerGame?: number;
  powerPlayTime?: number;
  powerPlayPoints?: number;
}

export interface ScheduleGame {
  week: number;
  gameNumber?: number;
  opponent: string;
  opponentAbbrev: string;
  opponentRank?: number;     // fantasy defense rank
  isHome: boolean;
  strengthRating: number;    // 1–10, 10 = toughest matchup
  date: string;
  vegasTotal?: number;
  impliedTeamTotal?: number;
  weather?: WeatherAlert;
}

export interface WeatherAlert {
  temperature: number;       // °F
  windSpeed: number;         // mph
  precipitation: number;     // % chance
  condition: string;         // "Clear", "Rain", "Snow", "Wind"
  fantasyImpact: 'none' | 'minor' | 'moderate' | 'severe';
  impactNote?: string;
}

export interface PlayerNews {
  id: string;
  headline: string;
  body: string;
  source: string;
  publishedAt: string;
  aiAnalysis?: string;       // one-sentence AI take on fantasy impact
  fantasyImpact: 'positive' | 'negative' | 'neutral';
}

export interface PerformancePoint {
  week: number;
  gameNumber?: number;
  date: string;
  opponent: string;
  isHome: boolean;
  fantasyPoints: number;
  stats: Record<string, number>;  // sport-agnostic — keys match Sport.statLabels.keyStats
}

// Search / browse result — lighter than full Player
export interface PlayerSummary {
  id: string;
  name: string;
  sport: SportId;
  team: string;
  teamAbbrev: string;
  position: string;
  imageUrl?: string;
  fantasyScore: number;
  adp: number;
  adpTrend: TrendDirection;
  injuryStatus: InjuryStatus;
  contractYear: boolean;
  isActive: boolean;
}
