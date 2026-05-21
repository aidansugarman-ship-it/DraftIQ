import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';
import { getYahooAccessToken } from '@services/yahooAuth';
import { yahooFantasy } from '@services/yahooFantasy';

const ALL_SPORTS: SportId[] = ['nfl', 'nba', 'mlb', 'nhl'];

/**
 * Tracks which Yahoo league the user has picked as "active" for each sport.
 * Every Yahoo-powered feature (roster, power rankings, add/drop, trade) reads
 * the active selection for the current sport from here.
 */

const STORAGE_KEY = 'draftiq.yahoo.active';
const DISMISS_KEY = 'draftiq.yahoo.promptDismissed';

export interface YahooActiveLeague {
  leagueKey:   string;  // e.g. "nba.l.123456"
  leagueName:  string;
  teamKey:     string;  // the user's own team — e.g. "nba.l.123456.t.4"
  teamName:    string;
  sport:       SportId;
  numTeams:    number;
  scoringType: string;
  season:      string;
}

interface YahooState {
  active:          Partial<Record<SportId, YahooActiveLeague>>;
  connected:       boolean;
  /** True once the user has connected OR explicitly said "I don't use Yahoo". */
  promptDismissed: boolean;
  hydrated:        boolean;
  hydrate:         () => Promise<void>;
  setActive:       (sport: SportId, league: YahooActiveLeague) => void;
  clearActive:     (sport: SportId) => void;
  clearAll:        () => void;
  /** If Yahoo is signed in, auto-pick the most-recent league for each sport. */
  autoConnect:     () => Promise<void>;
  /** Mark the "connect Yahoo" prompt handled so the gate stops showing. */
  dismissPrompt:   () => void;
}

function persist(active: YahooState['active']) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(active)).catch(() => {});
}

export const useYahooStore = create<YahooState>((set, get) => ({
  active:          {},
  connected:       false,
  promptDismissed: false,
  hydrated:        false,

  hydrate: async () => {
    try {
      const [raw, dismissed] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(DISMISS_KEY),
      ]);
      const active = raw ? (JSON.parse(raw) as YahooState['active']) : {};
      set({ active, promptDismissed: dismissed === 'true', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  dismissPrompt: () => {
    set({ promptDismissed: true });
    AsyncStorage.setItem(DISMISS_KEY, 'true').catch(() => {});
  },

  autoConnect: async () => {
    try {
      const token = await getYahooAccessToken();
      if (!token) { set({ connected: false }); return; }
      set({ connected: true });

      const leagues = await yahooFantasy.myLeaguesWithTeams();
      const next = { ...get().active };
      ALL_SPORTS.forEach((sport) => {
        if (next[sport]) return; // respect an existing manual pick
        const forSport = leagues
          .filter(l => l.sport === sport)
          .sort((a, b) => Number(b.season) - Number(a.season));
        const l = forSport[0];
        if (!l) return;
        next[sport] = {
          leagueKey:   l.leagueKey,
          leagueName:  l.name,
          teamKey:     l.teamKey,
          teamName:    l.teamName,
          sport,
          numTeams:    l.numTeams,
          scoringType: l.scoringType,
          season:      l.season,
        };
      });
      set({ active: next });
      persist(next);
    } catch {
      /* offline / token expired — leave state as-is */
    }
  },

  setActive: (sport, league) => {
    const next = { ...get().active, [sport]: league };
    set({ active: next });
    persist(next);
  },

  clearActive: (sport) => {
    const next = { ...get().active };
    delete next[sport];
    set({ active: next });
    persist(next);
  },

  clearAll: () => {
    set({ active: {}, connected: false });
    persist({});
  },
}));
