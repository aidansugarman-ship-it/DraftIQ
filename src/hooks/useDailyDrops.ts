import { useEffect, useState } from 'react';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';
import { sleeper } from '@services/sleeper';
import { mlbStats } from '@services/mlbStats';
import { nhlStats } from '@services/nhlStats';
import { SPORTS, type SportId } from '@constants/sports';

export interface SleeperPickItem {
  player:     string;
  pos:        string;
  team:       string;
  reason:     string;
  confidence: number;  // 1-5
}

export interface DailyDrops {
  sleepers:   SleeperPickItem[];
  prediction: { headline: string; reasoning: string; confidence: number };
  newsTake:   { headline: string; take: string; confidence: number };
}

const cache: Partial<Record<SportId, { ts: number; data: DailyDrops }>> = {};
const CACHE_MS = 1000 * 60 * 30; // 30 min

const EMPTY: DailyDrops = {
  sleepers: [],
  prediction: { headline: '', reasoning: '', confidence: 0 },
  newsTake:   { headline: '', take: '', confidence: 0 },
};

/**
 * Builds the "daily drops" content for a sport: sleeper picks, bold prediction,
 * news reaction. Uses real signals from Sleeper/MLB/NHL/ESPN APIs.
 */
export function useDailyDrops(sport: SportId) {
  const [data, setData]       = useState<DailyDrops>(cache[sport]?.data ?? EMPTY);
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
        // Gather REAL data signals per sport
        const signals: string[] = [];

        const news = await espn.news(sport, 8).catch(() => []);
        const topHeadlines = news.slice(0, 5).map(n => `- ${n.headline}`).filter(Boolean);
        if (topHeadlines.length) signals.push(`LATEST ${SPORTS[sport].shortLabel} NEWS:\n${topHeadlines.join('\n')}`);

        const injuries = await espn.injuries(sport).catch(() => []);
        const topInjuries = injuries.slice(0, 6).map(i => `- ${i.athlete?.fullName} (${i.athlete?.position?.abbreviation}, ${i.athlete?.team?.abbreviation}): ${i.status}`).filter(Boolean);
        if (topInjuries.length) signals.push(`RECENT INJURIES:\n${topInjuries.join('\n')}`);

        if (sport === 'nfl') {
          const [adds, players] = await Promise.all([
            sleeper.getTrendingAdds(15).catch(() => []),
            sleeper.getAllPlayers().catch(() => ({})),
          ]);
          const trending = adds.slice(0, 10).map(a => {
            const p = (players as any)[a.player_id];
            return p ? `${p.full_name} (${p.position}, ${p.team})` : null;
          }).filter(Boolean);
          if (trending.length) signals.push(`SLEEPER TRENDING ADDS:\n${trending.map(t => `- ${t}`).join('\n')}`);
        } else if (sport === 'mlb') {
          const [hr, avg, era] = await Promise.all([
            mlbStats.hittingLeaders('homeRuns', 10).catch(() => []),
            mlbStats.hittingLeaders('avg', 10).catch(() => []),
            mlbStats.pitchingLeaders('era', 10).catch(() => []),
          ]);
          const hitters = [...hr, ...avg].map(l => l.player?.fullName).filter(Boolean);
          const pitchers = era.map(l => l.player?.fullName).filter(Boolean);
          if (hitters.length) signals.push(`MLB HITTING LEADERS:\n${[...new Set(hitters)].slice(0, 10).map(n => `- ${n}`).join('\n')}`);
          if (pitchers.length) signals.push(`MLB PITCHING LEADERS:\n${pitchers.slice(0, 8).map(n => `- ${n}`).join('\n')}`);
        } else if (sport === 'nhl') {
          const [points, goals, goalies] = await Promise.all([
            nhlStats.skaterLeaders('points').catch(() => []),
            nhlStats.skaterLeaders('goals').catch(() => []),
            nhlStats.goalieLeaders('wins').catch(() => []),
          ]);
          const skaters = [...points, ...goals].map(l => `${l.firstName?.default ?? ''} ${l.lastName?.default ?? ''}`.trim()).filter(Boolean);
          const gs = goalies.map(l => `${l.firstName?.default ?? ''} ${l.lastName?.default ?? ''}`.trim()).filter(Boolean);
          if (skaters.length) signals.push(`NHL SKATER LEADERS:\n${[...new Set(skaters)].slice(0, 12).map(n => `- ${n}`).join('\n')}`);
          if (gs.length) signals.push(`NHL GOALIE LEADERS:\n${gs.slice(0, 6).map(n => `- ${n}`).join('\n')}`);
        } else if (sport === 'nba') {
          const cats = await espn.leaders(sport).catch(() => []);
          cats.slice(0, 4).forEach(cat => {
            const leaders = cat.leaders.slice(0, 5).map(l => l.athlete?.fullName).filter(Boolean);
            if (leaders.length) signals.push(`${cat.categoryName}:\n${leaders.map(n => `- ${n}`).join('\n')}`);
          });
        }

        const sportLabel = SPORTS[sport].shortLabel;
        const prompt = `Use the REAL ${sportLabel} data signals below to produce a daily fantasy drop. Output EXACTLY this JSON, no commentary outside it:

{
  "sleepers": [
    {"player": "Full Name", "pos": "POS", "team": "ABBREV", "reason": "Why he's a sleeper pick nobody is talking about — one punchy sentence", "confidence": 4},
    {"player": "...", "pos": "...", "team": "...", "reason": "...", "confidence": 3},
    {"player": "...", "pos": "...", "team": "...", "reason": "...", "confidence": 3}
  ],
  "prediction": {
    "headline": "BOLD CALL: short headline (under 10 words)",
    "reasoning": "Why this is gonna happen — 1-2 sentences",
    "confidence": 4
  },
  "newsTake": {
    "headline": "The biggest ${sportLabel} story RIGHT NOW (under 12 words)",
    "take": "Your sharp take on this story — what fantasy managers need to do — 2 sentences",
    "confidence": 5
  }
}

Confidence scale (1-5):
- 5 = lock, near-certain
- 4 = strong conviction
- 3 = decent read but real risk
- 2 = lean / coin flip
- 1 = gut shot

REQUIREMENTS:
- Players MUST be real ${sportLabel} players from the data below. No invented names.
- Sleepers = under-the-radar players, NOT the top 5 stars.
- Prediction = something bold/specific that could happen this week (player going off, breakout, slump).
- News take = react to the actual top headline above.
- TikTok creator voice: confident, brief, punchy. ALL CAPS for emphasis when right.

DATA:
${signals.join('\n\n')}`;

        const raw = await gemini.chat(prompt, sportLabel);

        // Extract JSON block
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON in response');
        const parsed = JSON.parse(match[0]) as DailyDrops;

        // Sanitize
        const safe: DailyDrops = {
          sleepers:   Array.isArray(parsed.sleepers) ? parsed.sleepers.slice(0, 3) : [],
          prediction: parsed.prediction ?? { headline: '', reasoning: '' },
          newsTake:   parsed.newsTake ?? { headline: '', take: '' },
        };

        if (cancelled) return;
        cache[sport] = { ts: Date.now(), data: safe };
        setData(safe);
      } catch {
        if (!cancelled) setData(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sport]);

  return { ...data, loading };
}
