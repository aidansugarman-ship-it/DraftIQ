import { useEffect, useState } from 'react';
import { useUserStore } from '@store/useUserStore';
import { sleeper, type SleeperPlayer, type SleeperRoster } from '@services/sleeper';

export interface RosterPlayer {
  id:       string;
  name:     string;
  position: string;
  team:     string;
  isStarter: boolean;
  injury:   { status: string; note: string } | null;
}

export interface MyRoster {
  leagueId:   string;
  leagueName: string;
  teamName:   string;
  record:     { wins: number; losses: number; ties: number };
  players:    RosterPlayer[];
}

/**
 * Returns the user's connected Sleeper roster (NFL only for now).
 * Returns null if no league is connected.
 */
export function useMyRoster() {
  const user = useUserStore((s) => s.user);
  const [roster, setRoster]   = useState<MyRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Find the first connected Sleeper NFL league
  const sleeperLeague = user?.connectedLeagues?.find(l => l.platform === 'sleeper' && l.sport === 'nfl');

  useEffect(() => {
    let cancelled = false;
    if (!sleeperLeague) { setRoster(null); return; }

    setLoading(true);
    setError(null);

    Promise.all([
      sleeper.getRosters(sleeperLeague.leagueId),
      sleeper.getAllPlayers(),
    ])
      .then(([rosters, allPlayers]) => {
        if (cancelled) return;
        const myRoster = rosters.find(r => String(r.roster_id) === sleeperLeague.teamId);
        if (!myRoster) {
          setError('Roster not found in this league.');
          setRoster(null);
          return;
        }

        const starterIds = new Set(myRoster.starters ?? []);
        const players: RosterPlayer[] = (myRoster.players ?? [])
          .map((pid) => {
            const p = allPlayers[pid] as SleeperPlayer | undefined;
            if (!p) return null;
            return {
              id:       pid,
              name:     p.full_name || `${p.first_name} ${p.last_name}`,
              position: p.position,
              team:     p.team ?? 'FA',
              isStarter: starterIds.has(pid),
              injury:   p.injury_status
                ? { status: p.injury_status, note: p.injury_notes ?? p.injury_body_part ?? '' }
                : null,
            };
          })
          .filter((p): p is RosterPlayer => p !== null);

        setRoster({
          leagueId:   sleeperLeague.leagueId,
          leagueName: sleeperLeague.leagueName,
          teamName:   sleeperLeague.teamName,
          record:     {
            wins:   myRoster.settings?.wins ?? 0,
            losses: myRoster.settings?.losses ?? 0,
            ties:   myRoster.settings?.ties ?? 0,
          },
          players,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load roster.');
        setRoster(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [sleeperLeague?.leagueId, sleeperLeague?.teamId]);

  return { roster, loading, error, hasLeague: !!sleeperLeague };
}
