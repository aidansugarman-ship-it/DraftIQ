import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.lineupHistory.v1';

export interface LineupEntry {
  id:         string;
  ts:         number;
  sport:      SportId;
  leagueId:   string;
  changedCount: number;
  // Coarse log so we can run AI pattern analysis later without bloat
  decisions: Array<{ name: string; slot: 'START' | 'BENCH'; injury?: string }>;
}

interface LineupHistoryState {
  entries:  LineupEntry[];
  hydrated: boolean;
  hydrate:  () => Promise<void>;
  record:   (entry: Omit<LineupEntry, 'id' | 'ts'>) => void;
  forLeague:(leagueId: string) => LineupEntry[];
}

export const useLineupHistoryStore = create<LineupHistoryState>((set, get) => ({
  entries:  [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries = raw ? (JSON.parse(raw) as LineupEntry[]) : [];
      set({ entries, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  record: (entry) => {
    const newEntry: LineupEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
    };
    const next = [newEntry, ...get().entries].slice(0, 100);
    set({ entries: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  forLeague: (leagueId) => get().entries.filter(e => e.leagueId === leagueId),
}));
