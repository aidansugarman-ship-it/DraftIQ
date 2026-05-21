import { useEffect, useState } from 'react';
import { useUserStore } from '@store/useUserStore';
import { useYahooStore } from '@store/useYahooStore';
import { sleeper, type SleeperPlayer } from '@services/sleeper';
import { yahooFantasy } from '@services/yahooFantasy';
import type { SportId } from '@constants/sports';

export interface RosterPlayer {
  id:       string;
  name:     string;
  position: string;
  team:     string;
  isStarter: boolean;
  injury:   { status: string; note: string } | null;
}

export interface MyRoster {
  source:     'sleeper' | 'yahoo';
  leagueId:   string;
  leagueName: string;
  teamName:   string;
  record:     { wins: number; losses: number; ties: number };
  players:    RosterPlayer[];
}

// Yahoo "selected position" values that are NOT active starters.
const YAHOO_BENCH = new Set(['BN', 'IL', 'IR', 'IL+', 'NA']);

/**
 * Returns the user's connected roster for a sport.
 * - Pass `sportOverride` to lock the hook to one sport (used by sport hubs).
 * - Otherwise follows the global `currentSport`.
 * - Any sport with an active Yahoo league → Yahoo roster.
 * - NFL with a connected Sleeper league → Sleeper roster (fallback).
 */
export function useMyRoster(sportOverride?: SportId) {
  const user        = useUserStore((s) => s.user);
  const storeSport  = useUserStore((s) => s.currentSport);
  const sport       = sportOverride ?? storeSport;
  const yahooActive = useYahooStore((s) => s.active[sport]);

  const [roster, setRoster]   = useState<MyRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Sleeper fallback — NFL only.
  const sleeperLeague = sport === 'nfl'
    ? user?.connectedLeagues?.find(l => l.platform === 'sleeper' && l.sport === 'nfl')
    : undefined;

  const hasLeague = !!yahooActive || !!sleeperLeague;

  useEffect(() => {
    let cancelled = false;

    // ── Yahoo path (preferred — works for all 4 sports) ──────────────────────
    if (yahooActive) {
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const [players, teams] = await Promise.all([
            yahooFantasy.teamRoster(yahooActive.teamKey),
            yahooFantasy.leagueTeams(yahooActive.leagueKey).catch(() => []),
          ]);
          if (cancelled) return;
          const mine = teams.find(t => t.teamKey === yahooActive.teamKey);
          setRoster({
            source:     'yahoo',
            leagueId:   yahooActive.leagueKey,
            leagueName: yahooActive.leagueName,
            teamName:   yahooActive.teamName,
            record: {
              wins:   mine?.wins   ?? 0,
              losses: mine?.losses ?? 0,
              ties:   mine?.ties   ?? 0,
            },
            players: players.map((p): RosterPlayer => ({
              id:        p.playerKey,
              name:      p.name,
              position:  p.position,
              team:      p.team || 'FA',
              isStarter: !YAHOO_BENCH.has(p.selectedPos),
              injury:    p.status ? { status: p.status, note: '' } : null,
            })),
          });
        } catch {
          if (!cancelled) { setError('Could not load your Yahoo roster.'); setRoster(null); }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }

    // ── Sleeper path (NFL fallback) ──────────────────────────────────────────
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
              id:        pid,
              name:      p.full_name || `${p.first_name} ${p.last_name}`,
              position:  p.position,
              team:      p.team ?? 'FA',
              isStarter: starterIds.has(pid),
              injury:    p.injury_status
                ? { status: p.injury_status, note: p.injury_notes ?? p.injury_body_part ?? '' }
                : null,
            };
          })
          .filter((p): p is RosterPlayer => p !== null);

        setRoster({
          source:     'sleeper',
          leagueId:   sleeperLeague.leagueId,
          leagueName: sleeperLeague.leagueName,
          teamName:   sleeperLeague.teamName,
          record: {
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
  }, [yahooActive?.teamKey, yahooActive?.leagueKey, sleeperLeague?.leagueId, sleeperLeague?.teamId]);

  return { roster, loading, error, hasLeague };
}
