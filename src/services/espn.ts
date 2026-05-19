// ESPN's undocumented public API — used by their own apps, no auth, free.
// Covers NFL/NBA/MLB/NHL. Schema can change without notice (it's not contract).
// All endpoints return JSON.

import type { SportId } from '@constants/sports';

const ESPN_PATH: Record<SportId, { sport: string; league: string }> = {
  nfl: { sport: 'football',   league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  mlb: { sport: 'baseball',   league: 'mlb' },
  nhl: { sport: 'hockey',     league: 'nhl' },
};

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${path}`);
  return res.json();
}

// ── Types (loose — ESPN's schema isn't documented) ───────────────────────────

export interface EspnAthlete {
  id:          string;
  fullName:    string;
  shortName:   string;
  displayName: string;
  position?:   { abbreviation: string; name: string };
  team?:       { id: string; abbreviation: string; displayName: string };
  headshot?:   { href: string };
  status?:     { id: string; type: string; name: string };
  jersey?:     string;
  age?:        number;
}

export interface EspnInjury {
  id:        string;
  status:    string;        // "Out" | "Questionable" | "Doubtful" | "Day-To-Day" etc.
  date:      string;
  type:      string;        // body part / injury type
  details?:  { type?: string; location?: string; detail?: string; side?: string; returnDate?: string };
  longComment?: string;
  shortComment?: string;
  athlete:   EspnAthlete;
}

export interface EspnGame {
  id:       string;
  date:     string;
  name:     string;
  shortName: string;
  status:   { type: { name: string; state: string; completed: boolean }; displayClock?: string; period?: number };
  competitions: Array<{
    competitors: Array<{
      id:    string;
      homeAway: 'home' | 'away';
      score: string;
      team:  { id: string; abbreviation: string; displayName: string; logo?: string };
    }>;
  }>;
}

export interface EspnNewsItem {
  id:          number;
  headline:    string;
  description: string;
  published:   string;
  links?:      { web?: { href: string } };
  images?:     Array<{ url: string }>;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const espn = {
  /** Current/upcoming games for a sport. */
  async scoreboard(sport: SportId): Promise<EspnGame[]> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    const data = await get<{ events: EspnGame[] }>(`/${s}/${l}/scoreboard`);
    return data.events ?? [];
  },

  /** League-wide injury report — every team. */
  async injuries(sport: SportId): Promise<EspnInjury[]> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    const data = await get<{ injuries: Array<{ team: any; injuries: EspnInjury[] }> }>(
      `/${s}/${l}/injuries`,
    );
    return (data.injuries ?? []).flatMap(t => t.injuries ?? []);
  },

  /** Recent news for a sport. */
  async news(sport: SportId, limit = 20): Promise<EspnNewsItem[]> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    const data = await get<{ articles: EspnNewsItem[] }>(`/${s}/${l}/news?limit=${limit}`);
    return data.articles ?? [];
  },

  /** All teams for a sport. */
  async teams(sport: SportId): Promise<Array<{ id: string; abbreviation: string; displayName: string; logo?: string }>> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    const data = await get<{ sports: Array<{ leagues: Array<{ teams: Array<{ team: any }> }> }> }>(
      `/${s}/${l}/teams`,
    );
    return (data.sports?.[0]?.leagues?.[0]?.teams ?? []).map(t => t.team);
  },

  /**
   * Stat leaders for a sport — real top performers by category.
   * NBA/NFL: points, NBA: assists/rebounds, MLB: HR/AVG/ERA, NHL: goals/assists/saves.
   */
  async leaders(sport: SportId): Promise<Array<{
    categoryName: string;
    leaders: Array<{ athlete: EspnAthlete; value: number; displayValue: string }>;
  }>> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    try {
      const data = await get<{ categories?: Array<any> }>(`/${s}/${l}/athletes/leaders`);
      return (data.categories ?? []).map((cat: any) => ({
        categoryName: cat.displayName || cat.name || 'Stat',
        leaders: (cat.leaders ?? []).slice(0, 10).map((l: any) => ({
          athlete: l.athlete,
          value:   l.value ?? 0,
          displayValue: l.displayValue ?? String(l.value ?? ''),
        })),
      })).filter(c => c.leaders.length > 0).slice(0, 8);
    } catch {
      return [];
    }
  },

  /** Single athlete by ESPN id — for player detail pages. */
  async athlete(sport: SportId, id: string): Promise<EspnAthlete | null> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    try {
      const data = await get<{ athlete: EspnAthlete }>(`/${s}/${l}/athletes/${id}`);
      return data.athlete ?? null;
    } catch {
      return null;
    }
  },

  /** Active roster for a single team. */
  async roster(sport: SportId, teamId: string): Promise<EspnAthlete[]> {
    const { sport: s, league: l } = ESPN_PATH[sport];
    const data = await get<{ athletes: Array<{ items?: EspnAthlete[] }> | EspnAthlete[] }>(
      `/${s}/${l}/teams/${teamId}/roster`,
    );
    // ESPN nests athletes by position group for some sports, flat for others
    if (Array.isArray(data.athletes) && data.athletes.length > 0 && 'items' in data.athletes[0]) {
      return (data.athletes as Array<{ items?: EspnAthlete[] }>).flatMap(g => g.items ?? []);
    }
    return (data.athletes as EspnAthlete[]) ?? [];
  },
};
