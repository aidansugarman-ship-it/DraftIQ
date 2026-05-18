import { create } from 'zustand';
import type { UserProfile } from '../types/user';
import type { TierId } from '../types/subscription';
import type { SportId } from '../constants/sports';

interface UserState {
  user:         UserProfile | null;
  tier:         TierId;
  isLoading:    boolean;
  currentSport: SportId;
  setUser:      (user: UserProfile | null) => void;
  setTier:      (tier: TierId) => void;
  setLoading:   (loading: boolean) => void;
  setCurrentSport: (sport: SportId) => void;
  clearUser:    () => void;
  updateUser:   (patch: Partial<UserProfile>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user:         null,
  tier:         'rookie',
  isLoading:    true,
  currentSport: 'nfl',

  setUser: (user) => set({
    user,
    tier:         user?.tier ?? 'rookie',
    currentSport: user?.primarySport ?? 'nfl',
    isLoading:    false,
  }),

  setTier: (tier) => set((s) => ({
    tier,
    user: s.user ? { ...s.user, tier } : null,
  })),

  setLoading: (isLoading) => set({ isLoading }),

  setCurrentSport: (currentSport) => set({ currentSport }),

  clearUser: () => set({ user: null, tier: 'rookie', currentSport: 'nfl', isLoading: false }),

  updateUser: (patch) => set((s) => ({
    user: s.user ? { ...s.user, ...patch } : null,
    ...(patch.tier ? { tier: patch.tier } : {}),
  })),
}));
