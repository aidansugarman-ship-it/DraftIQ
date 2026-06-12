import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'draftiq.dailyStreak.v1';

interface Persisted {
  current:  number;   // current consecutive-day streak
  best:     number;   // best streak ever
  lastOpen: string;   // YYYY-MM-DD of last open
}

interface DailyStreakState {
  current:   number;
  best:      number;
  lastOpen:  string;
  hydrated:  boolean;
  justBroke: boolean;   // true if today's open broke a streak (for UI)
  justBumped: boolean;  // true if today's open extended the streak (for toast)
  hydrate:   () => Promise<void>;
  /** Call once per app foreground. Updates streak based on the date delta. */
  checkIn:   () => void;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export const useDailyStreakStore = create<DailyStreakState>((set, get) => ({
  current:    0,
  best:       0,
  lastOpen:   '',
  hydrated:   false,
  justBroke:  false,
  justBumped: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        set({ current: p.current ?? 0, best: p.best ?? 0, lastOpen: p.lastOpen ?? '', hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  checkIn: () => {
    const today = todayStr();
    const { lastOpen, current, best } = get();

    if (lastOpen === today) return; // already counted today

    let nextCurrent: number;
    let justBroke = false;
    let justBumped = false;

    if (!lastOpen) {
      nextCurrent = 1;
      justBumped = true;
    } else {
      const diff = dayDiff(lastOpen, today);
      if (diff === 1) {
        nextCurrent = current + 1;       // consecutive day
        justBumped = true;
      } else if (diff > 1) {
        nextCurrent = 1;                 // missed a day — streak resets
        justBroke = current > 1;
        justBumped = true;
      } else {
        nextCurrent = current;           // clock weirdness — leave as-is
      }
    }

    const nextBest = Math.max(best, nextCurrent);
    set({ current: nextCurrent, best: nextBest, lastOpen: today, justBroke, justBumped });
    const persisted: Persisted = { current: nextCurrent, best: nextBest, lastOpen: today };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
  },
}));
