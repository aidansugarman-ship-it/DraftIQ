const BASE = 'https://api.sleeper.app/v1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Sleeper ${res.status}: ${path}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SleeperUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  total_rosters: number;
  status: string;
  settings: { num_teams: number; playoff_week_start: number };
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  avatar: string | null;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[];
  starters: string[];
  reserve: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal: number;
    ppts: number;
  };
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id: number;
  points: number;
  starters: string[];
  players: string[];
  starters_points: number[];
  players_points: Record<string, number>;
};

export type SleeperPlayer = {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
  injury_body_part: string | null;
  injury_notes: string | null;
  injury_start_date: string | null;
  fantasy_positions: string[];
  years_exp: number;
  status: string;
  number: number | null;
  depth_chart_position: number | null;
  search_rank: number | null;
};

export type TrendingPlayer = {
  player_id: string;
  count: number;
};

export type NFLState = {
  week: number;
  season: string;
  season_type: string;
  season_start_date: string;
  display_week: number;
  leg: number;
};

// ── API calls ─────────────────────────────────────────────────────────────────

export const sleeper = {
  getUser: (username: string) =>
    get<SleeperUser>(`/user/${username}`),

  getUserById: (userId: string) =>
    get<SleeperUser>(`/user/${userId}`),

  getLeagues: (userId: string, season = '2024') =>
    get<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`),

  getLeague: (leagueId: string) =>
    get<SleeperLeague>(`/league/${leagueId}`),

  getRosters: (leagueId: string) =>
    get<SleeperRoster[]>(`/league/${leagueId}/rosters`),

  getMatchups: (leagueId: string, week: number) =>
    get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`),

  getUsers: (leagueId: string) =>
    get<SleeperUser[]>(`/league/${leagueId}/users`),

  getTrendingAdds: (limit = 25) =>
    get<TrendingPlayer[]>(`/players/nfl/trending/add?lookback_hours=24&limit=${limit}`),

  getTrendingDrops: (limit = 25) =>
    get<TrendingPlayer[]>(`/players/nfl/trending/drop?lookback_hours=24&limit=${limit}`),

  getNFLState: () =>
    get<NFLState>('/state/nfl'),

  // Player map is large (~5MB) — cache it
  getAllPlayers: (() => {
    let cache: Promise<Record<string, SleeperPlayer>> | null = null;
    return () => {
      if (!cache) cache = get<Record<string, SleeperPlayer>>('/players/nfl');
      return cache;
    };
  })(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function avatarUrl(avatarId: string | null, size: 'thumb' | 'full' = 'thumb') {
  if (!avatarId) return null;
  return `https://sleepercdn.com/avatars/${size}/${avatarId}`;
}

export function playerThumb(playerId: string) {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}
