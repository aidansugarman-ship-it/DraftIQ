import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.streakTracker';

export interface PastCall {
  id:        string;
  sport:     SportId;
  kind:      'bold' | 'sleeper' | 'news';
  headline:  string;
  player?:   string;
  ts:        number;
  outcome?:  'hit' | 'miss' | null;
  resolved?: number;
}

interface StreakState {
  calls:    PastCall[];
  hydrated: boolean;
  hydrate:  () => Promise<void>;
  record:   (call: Omit<PastCall, 'id' | 'ts'>) => void;
  resolve:  (id: string, outcome: 'hit' | 'miss') => void;
  hitRate:  (days?: number) => { hits: number; total: number; pct: number };
}

export const useStreakStore = create<StreakState>((set, get) => ({
  calls:    [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const calls = raw ? (JSON.parse(raw) as PastCall[]) : [];
      set({ calls, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  record: (call) => {
    const newCall: PastCall = {
      ...call,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      outcome: null,
    };
    const next = [newCall, ...get().calls].slice(0, 200); // keep last 200
    set({ calls: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  resolve: (id, outcome) => {
    const next = get().calls.map(c => c.id === id ? { ...c, outcome, resolved: Date.now() } : c);
    set({ calls: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  hitRate: (days = 7) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const resolved = get().calls.filter(c => c.outcome && c.ts >= cutoff);
    const hits = resolved.filter(c => c.outcome === 'hit').length;
    const total = resolved.length;
    return { hits, total, pct: total ? Math.round((hits / total) * 100) : 0 };
  },
}));
