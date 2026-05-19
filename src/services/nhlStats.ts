// NHL API — official, free, no auth.
// Endpoints used:
//   /skater-stats-leaders/current — top skaters by stat category
//   /goalie-stats-leaders/current — top goalies
//   /schedule/now — current/upcoming games

const BASE = 'https://api-web.nhle.com/v1';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`NHL ${res.status}: ${path}`);
  return res.json();
}

export interface NhlSkaterLeader {
  id:         number;
  firstName:  { default: string };
  lastName:   { default: string };
  teamAbbrev: string;
  position:   string;
  value:      number;
  category:   string;
}

export const nhlStats = {
  /** Top skaters by stat category (goals, assists, points, plusMinus). Real season leaders. */
  async skaterLeaders(category: 'goals' | 'assists' | 'points' | 'plusMinus' = 'points'): Promise<NhlSkaterLeader[]> {
    try {
      const data = await get<Record<string, any[]>>(`/skater-stats-leaders/current?categories=${category}&limit=25`);
      return (data[category] ?? []).map((l: any) => ({
        id:         l.id,
        firstName:  l.firstName,
        lastName:   l.lastName,
        teamAbbrev: l.teamAbbrev,
        position:   l.position,
        value:      l.value,
        category,
      }));
    } catch {
      return [];
    }
  },

  /** Top goalies by save percentage or wins. */
  async goalieLeaders(category: 'savePctg' | 'wins' | 'shutouts' = 'wins'): Promise<NhlSkaterLeader[]> {
    try {
      const data = await get<Record<string, any[]>>(`/goalie-stats-leaders/current?categories=${category}&limit=15`);
      return (data[category] ?? []).map((l: any) => ({
        id:         l.id,
        firstName:  l.firstName,
        lastName:   l.lastName,
        teamAbbrev: l.teamAbbrev,
        position:   'G',
        value:      l.value,
        category,
      }));
    } catch {
      return [];
    }
  },

  /** Today's NHL games. */
  async todayGames(): Promise<Array<{ id: number; status: string; home: string; away: string; homeScore?: number; awayScore?: number; date: string }>> {
    try {
      const data = await get<{ gameWeek?: Array<{ games?: any[] }> }>(`/schedule/now`);
      const todayDate = new Date().toISOString().split('T')[0];
      const today = data.gameWeek?.find(w => w.games?.[0]?.gameDate?.startsWith(todayDate));
      const games = today?.games ?? [];
      return games.map((g: any) => ({
        id:     g.id,
        status: g.gameState ?? 'FUT',
        home:   g.homeTeam?.abbrev ?? '—',
        away:   g.awayTeam?.abbrev ?? '—',
        homeScore: g.homeTeam?.score,
        awayScore: g.awayTeam?.score,
        date:   g.startTimeUTC ?? g.gameDate,
      }));
    } catch {
      return [];
    }
  },
};
