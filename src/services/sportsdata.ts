// SportsDataIO — the real data layer to replace ESPN's undocumented endpoints.
// Sign up at https://sportsdata.io/ and put your key in .env as EXPO_PUBLIC_SPORTSDATA_API_KEY.
// Free tier covers development; pay tier is needed for production volume.
//
// Endpoints documented at: https://sportsdata.io/developers/api-documentation
//
// USAGE NOTE: This is a SCAFFOLD. Wire it in once you have an API key.
// Until then, callers fall back to ESPN (live but fragile) or Sleeper (NFL-only).

import type { SportId } from '@constants/sports';

const API_KEY = process.env.EXPO_PUBLIC_SPORTSDATA_API_KEY ?? '';

// SportsDataIO uses sport-specific base URLs and slightly different endpoints per sport.
const BASE: Record<SportId, string> = {
  nfl: 'https://api.sportsdata.io/v3/nfl',
  nba: 'https://api.sportsdata.io/v3/nba',
  mlb: 'https://api.sportsdata.io/v3/mlb',
  nhl: 'https://api.sportsdata.io/v3/nhl',
};

function isConfigured(): boolean {
  return !!API_KEY;
}

async function get<T>(sport: SportId, path: string): Promise<T> {
  if (!isConfigured()) {
    throw new Error(
      'SportsDataIO not configured. Set EXPO_PUBLIC_SPORTSDATA_API_KEY in .env to enable. ' +
      'For now, callers fall back to ESPN/Sleeper.'
    );
  }
  const url = `${BASE[sport]}${path}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SportsDataIO ${res.status}: ${path}`);
  return res.json();
}

// ── Public API (intentionally narrow — expand as needed) ──────────────────────

export interface SDPlayer {
  PlayerID:       number;
  Name:           string;
  Position:       string;
  Team:           string;
  Status:         string;    // 'Active' | 'Inactive' | etc.
  PhotoUrl?:      string;
  Number?:        number;
  InjuryStatus?:  string;
  InjuryNotes?:   string;
}

export interface SDGame {
  GameID:      number;
  Date:        string;
  HomeTeam:    string;
  AwayTeam:    string;
  HomeScore?:  number;
  AwayScore?:  number;
  Status:      string;       // 'Scheduled' | 'InProgress' | 'Final'
}

export const sportsdata = {
  isConfigured,

  /**
   * Active players for the current season.
   * NFL endpoint: /scores/json/Players
   */
  async players(sport: SportId): Promise<SDPlayer[]> {
    return get<SDPlayer[]>(sport, '/scores/json/Players');
  },

  /**
   * League-wide injury list.
   * NFL endpoint: /scores/json/Injuries
   */
  async injuries(sport: SportId): Promise<SDPlayer[]> {
    return get<SDPlayer[]>(sport, '/scores/json/Injuries');
  },

  /**
   * Games on a specific date (YYYY-MMM-DD format SportsDataIO expects, e.g. "2025-OCT-15").
   */
  async games(sport: SportId, date: string): Promise<SDGame[]> {
    return get<SDGame[]>(sport, `/scores/json/GamesByDate/${date}`);
  },
};

// ── Migration plan ────────────────────────────────────────────────────────────
// When you sign up for SportsDataIO:
//   1. Get your API key from the dashboard
//   2. Add EXPO_PUBLIC_SPORTSDATA_API_KEY=... to .env
//   3. Restart Metro
//   4. Open src/services/espn.ts and src/app/injuries/index.tsx
//   5. In the injuries loader, prefer `sportsdata.injuries(sport)` when configured, fall back to ESPN otherwise
//   6. Repeat for player lookups (currently in player page and useMyRoster)
// The point: callers shouldn't care which source feeds them. Wrap in a `useSportsData()` adapter that picks the best available.
