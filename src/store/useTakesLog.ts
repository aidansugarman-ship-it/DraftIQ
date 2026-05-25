import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.takesLog.v1';

export interface LoggedTake {
  id:        string;
  ts:        number;
  sport:     SportId;
  kind:      'add' | 'drop' | 'start' | 'sit' | 'trade' | 'pulse' | 'hot' | 'cold';
  player:    string;     // primary player the take is about
  take:      string;     // one-line summary of the call
}

interface TakesLogState {
  takes:     LoggedTake[];
  hydrated:  boolean;
  hydrate:   () => Promise<void>;
  log:       (t: Omit<LoggedTake, 'id' | 'ts'>) => void;
  forPlayer: (name: string) => LoggedTake[];
  recent:    (sport: SportId, days?: number) => LoggedTake[];
}

export const useTakesLog = create<TakesLogState>((set, get) => ({
  takes:    [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const takes = raw ? (JSON.parse(raw) as LoggedTake[]) : [];
      set({ takes, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  log: (t) => {
    const newTake: LoggedTake = {
      ...t,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
    };
    // Keep last 500 across all sports.
    const next = [newTake, ...get().takes].slice(0, 500);
    set({ takes: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  forPlayer: (name) => {
    const lc = name.toLowerCase();
    return get().takes.filter(t => t.player.toLowerCase().includes(lc));
  },

  recent: (sport, days = 14) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return get().takes.filter(t => t.sport === sport && t.ts >= cutoff);
  },
}));
