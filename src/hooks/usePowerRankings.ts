import { useEffect, useState } from 'react';
import { sleeper, type SleeperPlayer, type SleeperRoster, type SleeperUser } from '@services/sleeper';
import { gemini } from '@services/gemini';
import { useUserStore } from '@store/useUserStore';

export interface RankedTeam {
  rank:        number;
  teamName:    string;
  ownerId:     string;
  record:      string;
  topPlayers:  string[];
  reasoning:   string;
  trend:       'up' | 'down' | 'same';
}

const cache: Record<string, { ts: number; data: RankedTeam[] }> = {};
const CACHE_MS = 1000 * 60 * 60 * 6; // 6 hours

/**
 * Generates AI-driven power rankings for the user's Sleeper league.
 * Uses real roster data + records + AI synthesis.
 */
export function usePowerRankings() {
  const user = useUserStore(s => s.user);
  const sleeperLeague = user?.connectedLeagues?.find(l => l.platform === 'sleeper');
  const leagueId = sleeperLeague?.leagueId;

  const [rankings, setRankings] = useState<RankedTeam[]>(leagueId ? (cache[leagueId]?.data ?? []) : []);
  const [loading, setLoading]   = useState(!!leagueId && !cache[leagueId]);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!leagueId) { setRankings([]); setLoading(false); return; }

    const cached = cache[leagueId];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setRankings(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [rosters, users, allPlayers] = await Promise.all([
          sleeper.getRosters(leagueId),
          sleeper.getUsers(leagueId),
          sleeper.getAllPlayers(),
        ]);

        const teams = rosters.map((r): { teamName: string; ownerId: string; wins: number; losses: number; ties: number; fpts: number; starters: string[] } => {
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

        // Sort by record + points for seed data
        teams.sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return b.fpts - a.fpts;
        });

        const teamSummaries = teams.map((t, i) => `${i + 1}. ${t.teamName} (${t.wins}-${t.losses}, ${t.fpts.toFixed(1)} pts) — Starters: ${t.starters.join(', ')}`).join('\n');

        const prompt = `You are ranking the teams in this fantasy NFL league. Use record + points + roster strength + age curve. Output EXACT JSON, no commentary outside it:

[
  {"rank": 1, "teamName": "exact team name from data", "topPlayers": ["3 standout starters"], "reasoning": "Why this team is at this rank — 2 punchy sentences. ALL CAPS verdict word.", "trend": "up|down|same"},
  ...
]

REQUIREMENTS:
- Rank EVERY team in the league (output in order).
- ${teams.length} teams total.
- Use REAL team names from data.
- TikTok creator voice — confident, brief, opinionated.
- "trend" reflects where they're heading (up = improving, down = sliding, same = steady).

LEAGUE DATA:
${teamSummaries}`;

        const raw = await gemini.chat(prompt, 'NFL');
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('No JSON array in response');
        const parsed = JSON.parse(match[0]);

        const ranked: RankedTeam[] = teams.map((t, i) => {
          const ai = parsed.find((p: any) => p.teamName?.toLowerCase() === t.teamName.toLowerCase()) ?? parsed[i] ?? {};
          return {
            rank:       ai.rank ?? i + 1,
            teamName:   t.teamName,
            ownerId:    t.ownerId,
            record:     `${t.wins}-${t.losses}${t.ties ? `-${t.ties}` : ''}`,
            topPlayers: Array.isArray(ai.topPlayers) ? ai.topPlayers.slice(0, 3) : t.starters.slice(0, 3),
            reasoning:  ai.reasoning || 'No read on this team yet.',
            trend:      ['up', 'down', 'same'].includes(ai.trend) ? ai.trend : 'same',
          };
        }).sort((a, b) => a.rank - b.rank);

        if (cancelled) return;
        cache[leagueId] = { ts: Date.now(), data: ranked };
        setRankings(ranked);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load rankings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [leagueId]);

  return { rankings, loading, error, hasLeague: !!leagueId };
}
