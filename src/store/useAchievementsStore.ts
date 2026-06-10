import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'draftiq.achievements.v1';

export interface Achievement {
  id:    string;
  title: string;
  desc:  string;
  emoji: string;
  unlockedAt?: number;
}

// Canonical list of achievements you can unlock.
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'yahoo_connect',    title: 'Plugged In',        desc: 'Connected your Yahoo league.',                emoji: '🔌' },
  { id: 'first_optimize',   title: 'Lineup Coach',      desc: 'Ran the Lineup Optimizer for the first time.', emoji: '⚡' },
  { id: 'first_trade_scan', title: 'Trade Hawk',        desc: 'Used Trade Finder to scout your league.',      emoji: '🤝' },
  { id: 'first_block',      title: 'On the Block',      desc: 'Put a player on the trade block.',             emoji: '📢' },
  { id: 'first_what_if',    title: 'Mad Scientist',     desc: 'Ran a What-If simulation.',                    emoji: '🧪' },
  { id: 'first_alert',      title: 'Always Watching',   desc: 'Created your first custom news alert.',        emoji: '🔔' },
  { id: 'first_team_grade', title: 'Self-Aware GM',     desc: 'Pulled your first Team Report.',               emoji: '📋' },
  { id: 'first_am_i_good',  title: 'Vibes Check',       desc: 'Used the Am I Good? button.',                  emoji: '🤔' },
  { id: 'streak_3',         title: 'Habit Forming',     desc: 'Opened DraftIQ 3 days in a row.',              emoji: '🔥' },
  { id: 'streak_7',         title: 'True Sicko',        desc: 'Opened DraftIQ every day for a week.',         emoji: '🏆' },
  { id: 'multi_sport',      title: 'Pro Multi-Sport',   desc: 'Connected leagues in 2+ sports.',              emoji: '🎯' },
  { id: 'fantasy_101',      title: 'Schooled',          desc: 'Completed the Fantasy 101 mini-course.',       emoji: '🎓' },
];

interface AchievementsState {
  unlocked:   Record<string, number>;  // id -> unlockedAt
  hydrated:   boolean;
  hydrate:    () => Promise<void>;
  unlock:     (id: string) => Achievement | null; // returns the unlocked one for toast
  isUnlocked: (id: string) => boolean;
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  unlocked: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const unlocked = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      set({ unlocked, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  unlock: (id) => {
    if (get().unlocked[id]) return null; // already unlocked
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return null;
    const next = { ...get().unlocked, [id]: Date.now() };
    set({ unlocked: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return { ...def, unlockedAt: next[id] };
  },

  isUnlocked: (id) => !!get().unlocked[id],
}));
