import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sleeper, type SleeperPlayer, type SleeperUser } from '@services/sleeper';
import { yahooFantasy } from '@services/yahooFantasy';
import { gemini } from '@services/gemini';
import { useUserStore } from '@store/useUserStore';
import { useYahooStore } from '@store/useYahooStore';
import type { SportId } from '@constants/sports';

export interface RankedTeam {
  rank:         number;
  teamName:     string;
  ownerId:      string;
  record:       string;
  topPlayers:   string[];
  reasoning:    string;
  trend:        'up' | 'down' | 'same';
  previousRank?: number;  // from the last saved snapshot — drives why-it-changed
  delta?:       number;   // negative = moved UP, positive = DOWN
  whyChanged?:  string;   // AI explanation when the rank moved
}

export interface Mover { team: RankedTeam; delta: number }

const PREV_PREFIX = 'draftiq.powerRankings.prev.';

const cache: Record<string, { ts: number; data: RankedTeam[] }> = {};
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 hours

interface SeedTeam {
  teamName: string;
  ownerId:  string;
  wins:     number;
  losses:   number;
  ties:     number;
  fpts:     number;
  starters: string[];
}

/** Turn a list of ranked seed teams into a Gemini-driven power ranking. */
async function rankWithAI(
  teams: SeedTeam[],
  sportLabel: string,
  previous: Record<string, number>,
): Promise<RankedTeam[]> {
  const teamSummaries = teams
    .map((t, i) => {
      const prev = previous[t.teamName.toLowerCase()];
      const prevStr = prev ? ` [LAST WEEK: #${prev}]` : '';
      return `${i + 1}. ${t.teamName} (${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}${t.fpts ? `, ${t.fpts.toFixed(1)} pts` : ''})${prevStr}${t.starters.length ? ` — Key players: ${t.starters.join(', ')}` : ''}`;
    })
    .join('\n');

  const hasPrevious = Object.keys(previous).length > 0;
  const prompt = `You are ranking the teams in this fantasy ${sportLabel} league. Use record + points + roster strength. Output EXACT JSON, no commentary outside it:

[
  {"rank": 1, "teamName": "exact team name from data", "topPlayers": ["up to 3 standout players"], "reasoning": "Why this team is at this rank — 2 punchy sentences. ALL CAPS verdict word.", "trend": "up|down|same"${hasPrevious ? ', "whyChanged": "One short sentence on WHY this team moved from last week — if rank changed by 2+ spots"' : ''}}
]

REQUIREMENTS:
- Rank EVERY team in the league (output in order).
- ${teams.length} teams total.
- Use REAL team names from data.
- TikTok creator voice — confident, brief, opinionated.
- "trend" reflects where they're heading (up = improving, down = sliding, same = steady).
${hasPrevious ? '- For any team that jumped or dropped 2+ ranks from LAST WEEK, fill "whyChanged" with the reason. For minor moves leave it empty.' : ''}

LEAGUE DATA:
${teamSummaries}`;

  const raw = await gemini.chat(prompt, sportLabel);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');
  const parsed = JSON.parse(match[0]);

  return teams
    .map((t, i) => {
      const ai = parsed.find((p: any) => p.teamName?.toLowerCase() === t.teamName.toLowerCase()) ?? parsed[i] ?? {};
      const rank = ai.rank ?? i + 1;
      const prev = previous[t.teamName.toLowerCase()];
      return {
        rank,
        teamName:     t.teamName,
        ownerId:      t.ownerId,
        record:       `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`,
        topPlayers:   Array.isArray(ai.topPlayers) ? ai.topPlayers.slice(0, 3) : t.starters.slice(0, 3),
        reasoning:    ai.reasoning || 'No read on this team yet.',
        trend:        ['up', 'down', 'same'].includes(ai.trend) ? ai.trend : 'same',
        previousRank: prev,
        delta:        prev != null ? rank - prev : undefined,
        whyChanged:   typeof ai.whyChanged === 'string' && ai.whyChanged.trim() ? ai.whyChanged : undefined,
      } as RankedTeam;
    })
    .sort((a, b) => a.rank - b.rank);
}

/** Pick the biggest movers from a ranked list (top 3 risers + top 3 fallers). */
export function computeMovers(rankings: RankedTeam[]): { up: Mover[]; down: Mover[] } {
  const withDelta = rankings.filter(r => r.delta != null && r.delta !== 0) as Array<RankedTeam & { delta: number }>;
  const up   = withDelta.filter(r => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3).map(t => ({ team: t, delta: t.delta }));
  const down = withDelta.filter(r => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3).map(t => ({ team: t, delta: t.delta }));
  return { up, down };
}

/**
 * AI-driven power rankings for the user's active league in the CURRENT sport.
 * Uses the active Yahoo league if one is set, otherwise a connected Sleeper NFL league.
 */
export function usePowerRankings(sportOverride?: SportId) {
  const user        = useUserStore(s => s.user);
  const storeSport  = useUserStore(s => s.currentSport);
  const sport       = sportOverride ?? storeSport;
  const yahooActive = useYahooStore(s => s.active[sport]);

  const sleeperLeague = sport === 'nfl'
    ? user?.connectedLeagues?.find(l => l.platform === 'sleeper')
    : undefined;

  const source: 'yahoo' | 'sleeper' | null = yahooActive ? 'yahoo' : sleeperLeague ? 'sleeper' : null;
  const cacheKey = yahooActive?.leagueKey ?? sleeperLeague?.leagueId ?? '';

  const [rankings, setRankings] = useState<RankedTeam[]>(cacheKey ? (cache[cacheKey]?.data ?? []) : []);
  const [loading, setLoading]   = useState<boolean>(!!cacheKey && !cache[cacheKey]);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!source || !cacheKey) { setRankings([]); setLoading(false); return; }

    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setRankings(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        let seed: SeedTeam[];

        if (source === 'yahoo' && yahooActive) {
          const teams = await yahooFantasy.leagueTeams(yahooActive.leagueKey);
          // Pull each team's top roster players in parallel (best-effort).
          const rosters = await Promise.all(
            teams.map(t =>
              yahooFantasy.teamRoster(t.teamKey)
                .then(ps => ps.slice(0, 6).map(p => `${p.name} (${p.position})`))
                .catch(() => [] as string[]),
            ),
          );
          seed = teams.map((t, i) => ({
            teamName: t.name || `Team ${i + 1}`,
            ownerId:  t.teamKey,
            wins:     t.wins   ?? 0,
            losses:   t.losses ?? 0,
            ties:     t.ties   ?? 0,
            fpts:     0,
            starters: rosters[i] ?? [],
          }));
          seed.sort((a, b) => (b.wins - a.wins) || (a.losses - b.losses));
        } else {
          const leagueId = sleeperLeague!.leagueId;
          const [rosters, users, allPlayers] = await Promise.all([
            sleeper.getRosters(leagueId),
            sleeper.getUsers(leagueId),
            sleeper.getAllPlayers(),
          ]);
          seed = rosters.map((r): SeedTeam => {
            const usr = users.find((u: SleeperUser) => u.user_id === r.owner_id);
            const starterNames = (r.starters ?? [])
              .map(pid => {
                const p = (allPlayers as any)[pid] as SleeperPlayer | undefined;
                return p ? `${p.full_name || pid} (${p.position}, ${p.team ?? 'FA'})` : null;
              })
              .filter(Boolean) as string[];
            return {
              teamName: usr?.display_name || `Team ${r.roster_id}`,
              ownerId:  r.owner_id,
              wins:     r.settings?.wins ?? 0,
              losses:   r.settings?.losses ?? 0,
              ties:     r.settings?.ties ?? 0,
              fpts:     (r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100,
              starters: starterNames.slice(0, 9),
            };
          });
          seed.sort((a, b) => (b.wins - a.wins) || (b.fpts - a.fpts));
        }

        // Load previous snapshot so we can flag movers + ask AI why they moved
        let previousRanks: Record<string, number> = {};
        try {
          const raw = await AsyncStorage.getItem(PREV_PREFIX + cacheKey);
          if (raw) {
            const prev = JSON.parse(raw) as RankedTeam[];
            previousRanks = Object.fromEntries(prev.map(p => [p.teamName.toLowerCase(), p.rank]));
          }
        } catch { /* no-op */ }

        const ranked = await rankWithAI(seed, sport.toUpperCase(), previousRanks);
        if (cancelled) return;
        cache[cacheKey] = { ts: Date.now(), data: ranked };
        // Stash this run as the new "previous" — but only if it differs from what's stored,
        // so taking a second look at the same data doesn't kill the why-it-changed signal.
        const minimal = ranked.map(r => ({ rank: r.rank, teamName: r.teamName, ownerId: r.ownerId, record: r.record, topPlayers: [], reasoning: '', trend: 'same' as const }));
        AsyncStorage.setItem(PREV_PREFIX + cacheKey, JSON.stringify(minimal)).catch(() => {});
        setRankings(ranked);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load rankings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [source, cacheKey]);

  return { rankings, loading, error, hasLeague: !!source };
}
