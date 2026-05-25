import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { useAlertsStore } from '@store/useAlertsStore';
import { espn } from '@services/espn';
import { pingNow } from '@services/notifications';
import type { SportId } from '@constants/sports';

/**
 * Watchlist breaking-news scanner.
 *
 * Pulls fresh ESPN news for each sport the user has favorited players in.
 * If a favorited player's name appears in a headline we haven't already
 * pinged on, fire a local notification.
 *
 * Runs on app launch — opt-in by the user having favorited players + having
 * granted notification permission earlier.
 */

const PINGED_KEY = 'draftiq.watchlistPinged.v1';

interface PingedMap {
  // key = `${playerName}::${headlineHash}` → timestamp it was pinged.
  // Auto-prunes anything older than 14 days so repeat news re-pings later.
  [key: string]: number;
}

const TTL = 1000 * 60 * 60 * 24 * 14;

async function loadPinged(): Promise<PingedMap> {
  try {
    const raw = await AsyncStorage.getItem(PINGED_KEY);
    if (!raw) return {};
    const m = JSON.parse(raw) as PingedMap;
    const now = Date.now();
    const pruned: PingedMap = {};
    Object.entries(m).forEach(([k, ts]) => {
      if (now - ts < TTL) pruned[k] = ts;
    });
    return pruned;
  } catch {
    return {};
  }
}

async function savePinged(m: PingedMap): Promise<void> {
  try {
    await AsyncStorage.setItem(PINGED_KEY, JSON.stringify(m));
  } catch { /* no-op */ }
}

function hashHeadline(headline: string): string {
  // Cheap stable hash — just use the first 60 chars normalized.
  return headline.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 60);
}

/** Scan once. Caller is expected to debounce to ~once per app launch. */
export async function scanWatchlistForNews(): Promise<void> {
  // Read favorites + enabled custom alerts; the union is what we watch.
  const favorites    = useFavoritesStore.getState().favorites;
  const alerts       = useAlertsStore.getState().alerts.filter(a => a.enabled);

  // Normalize alerts into the same shape as favorites for the matching loop.
  const fromAlerts = alerts.map(a => ({
    id:    `alert-${a.id}`,
    name:  a.player,
    team:  '',
    pos:   '',
    sport: a.sport,
    addedAt: new Date(a.ts).toISOString(),
  }));
  const watched = [...favorites, ...fromAlerts];
  if (watched.length === 0) return;

  // Group by sport so we hit each ESPN news endpoint once.
  const bySport = watched.reduce<Record<SportId, typeof watched>>((acc, f) => {
    (acc[f.sport] ??= []).push(f);
    return acc;
  }, {} as any);

  const pinged = await loadPinged();
  let dirty = false;

  for (const [sport, favs] of Object.entries(bySport)) {
    let news: Awaited<ReturnType<typeof espn.news>>;
    try {
      news = await espn.news(sport as SportId, 12);
    } catch {
      continue;
    }

    for (const article of news) {
      const headline = article.headline ?? '';
      if (!headline) continue;
      const lc = headline.toLowerCase();
      for (const f of favs) {
        // First/last name presence — cheap match. Star players rarely false-positive.
        const parts = f.name.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
        if (parts.length === 0) continue;
        const hit = parts.every(p => lc.includes(p));
        if (!hit) continue;
        const key = `${f.id}::${hashHeadline(headline)}`;
        if (pinged[key]) continue;
        // New ping!
        pinged[key] = Date.now();
        dirty = true;
        await pingNow(`📰 ${f.name}`, headline);
      }
    }
  }

  if (dirty) await savePinged(pinged);
}
