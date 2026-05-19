import { getYahooAccessToken } from './yahooAuth';

/**
 * Yahoo Fantasy API wrapper. Always requests JSON (default is XML, gross).
 * Docs: https://developer.yahoo.com/fantasysports/guide/
 */

const BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

async function get<T = any>(path: string): Promise<T> {
  const token = await getYahooAccessToken();
  if (!token) throw new Error('Not connected to Yahoo');

  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}format=json`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}: ${path}`);
  return res.json();
}

export interface YahooLeague {
  leagueKey:    string;  // e.g. "nfl.l.123456"
  leagueId:     string;
  name:         string;
  sport:        'nfl' | 'nba' | 'mlb' | 'nhl';
  numTeams:     number;
  scoringType:  string;
  season:       string;
}

export interface YahooTeam {
  teamKey:  string;
  teamId:   string;
  name:     string;
  managers: Array<{ nickname: string; email?: string }>;
  wins?:    number;
  losses?:  number;
  ties?:    number;
}

export interface YahooRosterPlayer {
  playerKey:   string;
  name:        string;
  position:    string;
  team:        string;
  status?:     string;  // injury status
  selectedPos: string;  // starting slot or BN
}

export const yahooFantasy = {
  /** All leagues the user is in, across all 4 sports. */
  async myLeagues(): Promise<YahooLeague[]> {
    const data = await get('/users;use_login=1/games/leagues');
    // Yahoo's JSON is deeply nested. Walk the structure to extract leagues.
    const leagues: YahooLeague[] = [];
    try {
      const games = data.fantasy_content?.users?.['0']?.user?.[1]?.games ?? {};
      Object.values(games).forEach((g: any) => {
        if (!g?.game) return;
        const gameMeta = g.game[0];
        const sport = (gameMeta?.code || '').toLowerCase() as YahooLeague['sport'];
        const leaguesNode = g.game[1]?.leagues ?? {};
        Object.values(leaguesNode).forEach((l: any) => {
          if (!l?.league) return;
          const lm = l.league[0];
          leagues.push({
            leagueKey:   lm.league_key,
            leagueId:    lm.league_id,
            name:        lm.name,
            sport,
            numTeams:    Number(lm.num_teams ?? 0),
            scoringType: lm.scoring_type ?? '',
            season:      String(lm.season ?? ''),
          });
        });
      });
    } catch (e) {
      console.error('[yahooFantasy.myLeagues] parse error', e);
    }
    return leagues;
  },

  /** All teams in a specific league (for power rankings). */
  async leagueTeams(leagueKey: string): Promise<YahooTeam[]> {
    const data = await get(`/league/${leagueKey}/teams/standings`);
    const teams: YahooTeam[] = [];
    try {
      const teamsNode = data.fantasy_content?.league?.[1]?.teams ?? {};
      Object.values(teamsNode).forEach((t: any) => {
        if (!t?.team) return;
        const meta = t.team[0];
        const standings = t.team[2]?.team_standings ?? {};
        const tm: YahooTeam = {
          teamKey:  '', teamId: '', name: '',
          managers: [],
        };
        meta.forEach((entry: any) => {
          if (entry?.team_key)  tm.teamKey  = entry.team_key;
          if (entry?.team_id)   tm.teamId   = entry.team_id;
          if (entry?.name)      tm.name     = entry.name;
          if (entry?.managers)  tm.managers = entry.managers.map((m: any) => m.manager);
        });
        if (standings?.outcome_totals) {
          tm.wins   = Number(standings.outcome_totals.wins ?? 0);
          tm.losses = Number(standings.outcome_totals.losses ?? 0);
          tm.ties   = Number(standings.outcome_totals.ties ?? 0);
        }
        teams.push(tm);
      });
    } catch (e) {
      console.error('[yahooFantasy.leagueTeams] parse error', e);
    }
    return teams;
  },

  /** Current roster for one team. */
  async teamRoster(teamKey: string): Promise<YahooRosterPlayer[]> {
    const data = await get(`/team/${teamKey}/roster/players`);
    const players: YahooRosterPlayer[] = [];
    try {
      const playersNode = data.fantasy_content?.team?.[1]?.roster?.['0']?.players ?? {};
      Object.values(playersNode).forEach((p: any) => {
        if (!p?.player) return;
        const meta = p.player[0];
        const selected = p.player[1]?.selected_position?.[1]?.position ?? 'BN';
        const player: YahooRosterPlayer = {
          playerKey: '', name: '', position: '', team: '',
          selectedPos: selected,
        };
        meta.forEach((entry: any) => {
          if (entry?.player_key)         player.playerKey = entry.player_key;
          if (entry?.name?.full)         player.name      = entry.name.full;
          if (entry?.display_position)   player.position  = entry.display_position;
          if (entry?.editorial_team_abbr) player.team     = entry.editorial_team_abbr;
          if (entry?.status)             player.status    = entry.status;
        });
        players.push(player);
      });
    } catch (e) {
      console.error('[yahooFantasy.teamRoster] parse error', e);
    }
    return players;
  },
};
