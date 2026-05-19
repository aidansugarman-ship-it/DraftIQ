// MLB Stats API — official, free, no auth.
// Docs: https://statsapi.mlb.com/docs/
// Endpoints we use:
//   /people/{id} — player metadata
//   /stats?stats=season&group=hitting&season=YYYY — season stat leaders
//   /schedule?sportId=1&date=MM/DD/YYYY — games on a date
//   /teams/{id}/roster — team roster

const BASE = 'https://statsapi.mlb.com/api/v1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`MLB ${res.status}: ${path}`);
  return res.json();
}

export interface MlbPlayer {
  id:          number;
  fullName:    string;
  primaryNumber?: string;
  birthDate?:  string;
  currentTeam?: { id: number; name: string };
  primaryPosition?: { abbreviation: string; name: string };
  active?:     boolean;
  mlbDebutDate?: string;
}

export interface MlbHittingLeader {
  player:      { id: number; fullName: string };
  team:        { id: number; name: string };
  stat:        Record<string, string | number>;  // homeRuns, avg, rbi, etc.
  rank:        number;
}

export const mlbStats = {
  /** Top hitters by category (default: HR). Real current-season leaders. */
  async hittingLeaders(category: 'homeRuns' | 'avg' | 'rbi' | 'stolenBases' | 'runs' = 'homeRuns', limit = 25): Promise<MlbHittingLeader[]> {
    const year = new Date().getFullYear();
    try {
      const data = await get<{ leagueLeaders?: Array<{ leaders: any[] }> }>(
        `/stats/leaders?leaderCategories=${category}&season=${year}&limit=${limit}&statGroup=hitting`,
      );
      return (data.leagueLeaders?.[0]?.leaders ?? []).map((l: any) => ({
        player: l.person,
        team:   l.team,
        stat:   { [category]: l.value, ...l.statistics ?? {} },
        rank:   l.rank,
      }));
    } catch {
      return [];
    }
  },

  /** Top pitchers by category (default: ERA, lower = better). */
  async pitchingLeaders(category: 'wins' | 'strikeOuts' | 'era' | 'saves' = 'strikeOuts', limit = 25): Promise<MlbHittingLeader[]> {
    const year = new Date().getFullYear();
    try {
      const data = await get<{ leagueLeaders?: Array<{ leaders: any[] }> }>(
        `/stats/leaders?leaderCategories=${category}&season=${year}&limit=${limit}&statGroup=pitching`,
      );
      return (data.leagueLeaders?.[0]?.leaders ?? []).map((l: any) => ({
        player: l.person,
        team:   l.team,
        stat:   { [category]: l.value, ...l.statistics ?? {} },
        rank:   l.rank,
      }));
    } catch {
      return [];
    }
  },

  /** Today's MLB games. */
  async todayGames(): Promise<Array<{ id: number; status: string; home: string; away: string; homeScore?: number; awayScore?: number; date: string }>> {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = today.getFullYear();
    try {
      const data = await get<{ dates?: Array<{ games?: any[] }> }>(`/schedule?sportId=1&date=${mm}/${dd}/${yyyy}`);
      const games = data.dates?.[0]?.games ?? [];
      return games.map((g: any) => ({
        id:     g.gamePk,
        status: g.status?.detailedState ?? 'Scheduled',
        home:   g.teams?.home?.team?.name ?? '—',
        away:   g.teams?.away?.team?.name ?? '—',
        homeScore: g.teams?.home?.score,
        awayScore: g.teams?.away?.score,
        date:   g.gameDate,
      }));
    } catch {
      return [];
    }
  },

  /** Single player by id. */
  async player(id: number): Promise<MlbPlayer | null> {
    try {
      const data = await get<{ people?: MlbPlayer[] }>(`/people/${id}`);
      return data.people?.[0] ?? null;
    } catch {
      return null;
    }
  },
};
