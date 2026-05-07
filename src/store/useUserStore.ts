import { create } from 'zustand';
import type { UserProfile } from '../types/user';
import type { TierId } from '../types/subscription';

interface UserState {
  user:       UserProfile | null;
  tier:       TierId;
  isLoading:  boolean;
  setUser:    (user: UserProfile | null) => void;
  setTier:    (tier: TierId) => void;
  setLoading: (loading: boolean) => void;
  clearUser:  () => void;
  updateUser: (patch: Partial<UserProfile>) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user:      null,
  tier:      'rookie',
  isLoading: true,

  setUser: (user) => set({
    user,
    tier:      user?.tier ?? 'rookie',
    isLoading: false,
  }),

  setTier: (tier) => set((s) => ({
    tier,
    user: s.user ? { ...s.user, tier } : null,
  })),

  setLoading: (isLoading) => set({ isLoading }),

  clearUser: () => set({ user: null, tier: 'rookie', isLoading: false }),

  updateUser: (patch) => set((s) => ({
    user: s.user ? { ...s.user, ...patch } : null,
    ...(patch.tier ? { tier: patch.tier } : {}),
  })),
}));
