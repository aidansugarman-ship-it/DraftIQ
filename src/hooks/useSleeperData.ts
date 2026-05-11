import { useEffect, useState } from 'react';
import { sleeper, SleeperLeague, SleeperRoster, SleeperPlayer, SleeperUser } from '@services/sleeper';

const DEFAULT_SLEEPER_USERNAME = 'SugarJew';
const DEFAULT_SEASON = '2025';

export interface SleeperLeagueWithRoster {
  league:  SleeperLeague;
  roster:  SleeperRoster | null;
  players: Record<string, SleeperPlayer>;
}

interface SleeperData {
  user:        SleeperUser | null;
  leagues:     SleeperLeague[];
  activeLeague: SleeperLeagueWithRoster | null;
  loading:     boolean;
  error:       boolean;
}

export function useSleeperData(username = DEFAULT_SLEEPER_USERNAME): SleeperData {
  const [user, setUser]           = useState<SleeperUser | null>(null);
  const [leagues, setLeagues]     = useState<SleeperLeague[]>([]);
  const [activeLeague, setActive] = useState<SleeperLeagueWithRoster | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    if (!username) return;
    load(username);
  }, [username]);

  async function load(un: string) {
    setLoading(true);
    setError(false);
    try {
      const sleeperUser = await sleeper.getUser(un);
      setUser(sleeperUser);

      const [userLeagues, allPlayers] = await Promise.all([
        sleeper.getLeagues(sleeperUser.user_id, DEFAULT_SEASON),
        sleeper.getAllPlayers(),
      ]);

      const nflLeagues = userLeagues.filter(l => l.sport === 'nfl');
      setLeagues(nflLeagues);

      if (nflLeagues.length > 0) {
        const first = nflLeagues[0];
        const rosters = await sleeper.getRosters(first.league_id);
        const myRoster = rosters.find(r => r.owner_id === sleeperUser.user_id) ?? null;
        setActive({ league: first, roster: myRoster, players: allPlayers });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return { user, leagues, activeLeague, loading, error };
}

export function useMyRosterNames(username = DEFAULT_SLEEPER_USERNAME): string[] {
  const { activeLeague } = useSleeperData(username);
  if (!activeLeague?.roster) return [];
  return (activeLeague.roster.players ?? [])
    .map(id => activeLeague.players[id])
    .filter(Boolean)
    .map(p => p.full_name || `${p.first_name} ${p.last_name}`);
}
