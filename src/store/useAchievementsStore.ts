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
  { id: 'streak_3',         title: 'Getting Hooked',    desc: 'Opened DraftIQ 3 days in a row.',              emoji: '🔥' },
  { id: 'streak_7',         title: 'Locked In',         desc: 'A full week straight.',                        emoji: '🔒' },
  { id: 'streak_14',        title: 'Sicko',             desc: 'Two weeks without missing a day.',             emoji: '😤' },
  { id: 'streak_30',        title: 'True Sicko',        desc: '30-day streak. You have a problem (good).',    emoji: '🏆' },
  { id: 'streak_100',       title: 'Hall of Famer',     desc: '100 days. Genuinely unhinged. Respect.',       emoji: '👑' },
  { id: 'multi_sport',      title: 'Pro Multi-Sport',   desc: 'Connected leagues in 2+ sports.',              emoji: '🎯' },
  { id: 'fantasy_101',      title: 'Schooled',          desc: 'Completed the Fantasy 101 mini-course.',       emoji: '🎓' },
];

// Streak tier ladder — the "stakes" behind the streak counter.
export interface StreakTier { min: number; name: string; emoji: string }
export const STREAK_TIERS: StreakTier[] = [
  { min: 0,   name: 'Rookie',        emoji: '🌱' },
  { min: 3,   name: 'Getting Hooked', emoji: '🔥' },
  { min: 7,   name: 'Locked In',     emoji: '🔒' },
  { min: 14,  name: 'Sicko',         emoji: '😤' },
  { min: 30,  name: 'True Sicko',    emoji: '🏆' },
  { min: 60,  name: 'Degenerate',    emoji: '💀' },
  { min: 100, name: 'Hall of Famer', emoji: '👑' },
];

/** Current tier + the next milestone (for "N days to X" progress). */
export function streakTier(days: number): { tier: StreakTier; next: StreakTier | null; toNext: number } {
  let tier = STREAK_TIERS[0];
  let next: StreakTier | null = null;
  for (let i = 0; i < STREAK_TIERS.length; i++) {
    if (days >= STREAK_TIERS[i].min) {
      tier = STREAK_TIERS[i];
      next = STREAK_TIERS[i + 1] ?? null;
    }
  }
  return { tier, next, toNext: next ? next.min - days : 0 };
}

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
