import AsyncStorage from '@react-native-async-storage/async-storage';
import { sleeper, type SleeperPlayer } from './sleeper';

/**
 * Live NFL draft board, built from Sleeper's free public data.
 *
 * Sleeper's full player map is ~14MB, which is far too large to pull on every
 * cold start. We fetch it at most once a day, trim it to the ~2.8k players that
 * are actually draftable, and cache that compact form (~300KB) in AsyncStorage.
 */

const CACHE_KEY = '@draftiq/draft_board_v1';
const TTL_MS    = 24 * 60 * 60 * 1000; // Rankings move daily, not hourly.

export type BoardPlayer = {
  id:           string;
  /** Overall consensus rank — position in the sorted list, so always unique. */
  rank:         number;
  /** Rank within position, e.g. 3 for the RB3. */
  posRank:      number;
  name:         string;
  pos:          string;
  team:         string;
  age:          number | null;
  injuryStatus: string;
  trend:        'up' | 'down' | 'stable';
  /** Net roster adds in the last 24h — the evidence behind `trend`. */
  trendCount:   number;
};

type Cached = { at: number; season: string; players: BoardPlayer[] };

const DRAFTABLE = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);

/** Sleeper's injury_status is free text; map it to the app's status palette. */
function normaliseInjury(raw: string | null): string {
  if (!raw) return 'healthy';
  const s = raw.toLowerCase();
  if (s.includes('questionable')) return 'questionable';
  if (s.includes('doubtful'))     return 'doubtful';
  if (s.includes('out'))          return 'out';
  if (s.includes('ir'))           return 'ir';
  if (s.includes('day'))          return 'day-to-day';
  return 'questionable';
}

function build(
  players: Record<string, SleeperPlayer>,
  adds: Map<string, number>,
  drops: Map<string, number>,
): BoardPlayer[] {
  const ranked = Object.values(players)
    .filter((p) =>
      p.search_rank != null &&
      p.status === 'Active' &&
      DRAFTABLE.has(p.position))
    // search_rank has ties, so break them deterministically by id — otherwise
    // the board would shuffle between loads.
    .sort((a, b) =>
      (a.search_rank! - b.search_rank!) || a.player_id.localeCompare(b.player_id));

  const posCounts: Record<string, number> = {};

  return ranked.map((p, i) => {
    const pos = p.position;
    posCounts[pos] = (posCounts[pos] ?? 0) + 1;

    const add  = adds.get(p.player_id)  ?? 0;
    const drop = drops.get(p.player_id) ?? 0;
    const net  = add - drop;

    return {
      id:           p.player_id,
      rank:         i + 1,
      posRank:      posCounts[pos],
      name:         p.full_name || `${p.first_name} ${p.last_name}`.trim(),
      pos,
      team:         p.team ?? 'FA',
      age:          p.age,
      injuryStatus: normaliseInjury(p.injury_status),
      // Sleeper only returns the ~200 most-added and most-dropped players, so
      // appearing in either list is itself the signal. Everyone else is stable.
      // (Raw counts run from ~5k to ~280k, so an absolute threshold is useless.)
      trend:        net > 0 ? 'up' : net < 0 ? 'down' : 'stable',
      trendCount:   net,
    };
  });
}

const toMap = (rows: { player_id: string; count: number }[] | null) =>
  new Map((rows ?? []).map((r) => [r.player_id, r.count]));

/**
 * Ranked draft board, newest-first from cache when it's fresh.
 * Returns [] rather than throwing so the screen can show an empty state.
 */
export async function getDraftBoard(force = false): Promise<BoardPlayer[]> {
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: Cached = JSON.parse(raw);
        if (Date.now() - cached.at < TTL_MS && cached.players?.length) {
          return cached.players;
        }
      }
    } catch { /* corrupt cache — fall through and refetch */ }
  }

  try {
    const [players, adds, drops, season] = await Promise.all([
      sleeper.getAllPlayers(),
      sleeper.getTrendingAdds(200).catch(() => null),
      sleeper.getTrendingDrops(200).catch(() => null),
      sleeper.getCurrentSeason().catch(() => ''),
    ]);

    const board = build(players, toMap(adds), toMap(drops));

    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ at: Date.now(), season, players: board } satisfies Cached),
      );
    } catch { /* cache write is best-effort */ }

    return board;
  } catch {
    // Network failed — fall back to stale cache before giving up.
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) return (JSON.parse(raw) as Cached).players ?? [];
    } catch { /* ignore */ }
    return [];
  }
}
