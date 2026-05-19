import { useEffect, useState } from 'react';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';
import { sleeper } from '@services/sleeper';
import { mlbStats } from '@services/mlbStats';
import { nhlStats } from '@services/nhlStats';
import { SPORTS, type SportId } from '@constants/sports';

export interface FantasySuggestion {
  action:  'ADD' | 'DROP' | 'TRADE FOR' | 'SELL HIGH' | 'BUY LOW';
  player:  string;
  reason:  string;
}

/**
 * Generates 3-5 proactive fantasy suggestions for a sport.
 * Combines real injuries + real stat leaders + real trending data + AI synthesis.
 * Cached in memory so we don't burn API calls on every render.
 */
const cache: Partial<Record<SportId, { ts: number; data: FantasySuggestion[] }>> = {};
const CACHE_MS = 1000 * 60 * 15; // 15 min

export function useFantasySuggestions(sport: SportId) {
  const [data, setData]       = useState<FantasySuggestion[]>(cache[sport]?.data ?? []);
  const [loading, setLoading] = useState(!cache[sport]);

  useEffect(() => {
    let cancelled = false;
    const cached = cache[sport];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      try {
        // Gather real signals to feed into the AI
        const signals: string[] = [];

        const injuries = await espn.injuries(sport).catch(() => []);
        const topInjuries = injuries.slice(0, 8).map(i => `${i.athlete?.fullName} (${i.athlete?.position?.abbreviation}, ${i.athlete?.team?.abbreviation}): ${i.status}`);
        if (topInjuries.length) signals.push(`Recent injuries: ${topInjuries.join('; ')}`);

        if (sport === 'nfl') {
          const [adds, players] = await Promise.all([
            sleeper.getTrendingAdds(10).catch(() => []),
            sleeper.getAllPlayers().catch(() => ({})),
          ]);
          const trending = adds.slice(0, 8).map(a => {
            const p = (players as any)[a.player_id];
            return p ? `${p.full_name} (${p.position}, ${p.team})` : null;
          }).filter(Boolean);
          if (trending.length) signals.push(`Trending adds: ${trending.join(', ')}`);
        }

        if (sport === 'mlb') {
          const [hr, avg] = await Promise.all([
            mlbStats.hittingLeaders('homeRuns', 10).catch(() => []),
            mlbStats.hittingLeaders('avg', 10).catch(() => []),
          ]);
          const top = [...hr.slice(0, 5), ...avg.slice(0, 5)].map(l => l.player.fullName);
          if (top.length) signals.push(`Top MLB performers right now: ${[...new Set(top)].join(', ')}`);
        }

        if (sport === 'nhl') {
          const points = await nhlStats.skaterLeaders('points').catch(() => []);
          const top = points.slice(0, 10).map(l => `${l.firstName?.default ?? ''} ${l.lastName?.default ?? ''}`.trim());
          if (top.length) signals.push(`NHL points leaders: ${top.join(', ')}`);
        }

        if (sport === 'nba') {
          const cats = await espn.leaders(sport).catch(() => []);
          const top = cats.flatMap(c => c.leaders.slice(0, 3).map(l => l.athlete?.fullName)).filter(Boolean).slice(0, 12);
          if (top.length) signals.push(`NBA leaders across categories: ${top.join(', ')}`);
        }

        const sportLabel = SPORTS[sport].shortLabel;
        const prompt = `You're dropping today's ${sportLabel} fantasy hot board — TikTok-creator style. 5 specific moves managers need to make TODAY. Format each line EXACTLY:

ACTION|PLAYER NAME|punchy one-sentence take

Valid ACTIONs: ADD, DROP, TRADE FOR, SELL HIGH, BUY LOW.

REQUIREMENTS:
- BOLD takes. Be opinionated. "He's a must-add." "Drop him today." "This sell-high window is closing."
- Don't suggest obvious top-tier rostered stars unless it's a clear SELL HIGH window.
- Focus on injury-driven backups, breakout candidates, hot streaks, and buy-low windows.
- Be specific with REAL player names from the data below.
- ONE sentence reasoning — punchy, not boring.

DATA:
${signals.join('\n')}`;

        const raw = await gemini.chat(prompt, sportLabel);
        const parsed = raw
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.includes('|'))
          .map(line => {
            const [action, player, reason] = line.replace(/^[\d\.\-\*\)]+\s*/, '').split('|').map(s => s.trim());
            const validActions = ['ADD', 'DROP', 'TRADE FOR', 'SELL HIGH', 'BUY LOW'] as const;
            const cleanAction = validActions.find(a => action?.toUpperCase().includes(a)) ?? 'ADD';
            return player && reason ? { action: cleanAction, player, reason } : null;
          })
          .filter((s): s is FantasySuggestion => !!s)
          .slice(0, 5);

        if (cancelled) return;
        cache[sport] = { ts: Date.now(), data: parsed };
        setData(parsed);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sport]);

  return { suggestions: data, loading };
}
