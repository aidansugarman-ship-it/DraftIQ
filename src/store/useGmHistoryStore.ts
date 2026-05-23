import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.gmHistory';

export interface GmSnapshot {
  ts:       number;   // epoch ms
  sport:    SportId;
  leagueId: string;
  score:    number;
  grade:    string;
}

interface GmHistoryState {
  snapshots:    GmSnapshot[];
  hydrated:     boolean;
  hydrate:      () => Promise<void>;
  /** Push a snapshot, deduping to one per day per league. */
  record:       (snap: Omit<GmSnapshot, 'ts'>) => void;
  forLeague:    (leagueId: string) => GmSnapshot[];
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
}

export const useGmHistoryStore = create<GmHistoryState>((set, get) => ({
  snapshots: [],
  hydrated:  false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const snapshots = raw ? (JSON.parse(raw) as GmSnapshot[]) : [];
      set({ snapshots, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  record: (snap) => {
    const now = Date.now();
    const existing = get().snapshots;
    // Dedupe: replace today's entry for this league if one exists.
    const filtered = existing.filter(s => !(s.leagueId === snap.leagueId && isSameDay(s.ts, now)));
    const next = [...filtered, { ...snap, ts: now }]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 400);
    set({ snapshots: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  forLeague: (leagueId) => {
    return get().snapshots
      .filter(s => s.leagueId === leagueId)
      .sort((a, b) => a.ts - b.ts);
  },
}));
