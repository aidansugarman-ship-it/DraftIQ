import { create } from 'zustand';

/**
 * Shared "refresh now" tick. Components that cache data (Pulse, Weekly Matchup,
 * Schedule Strength, Daily Snapshot, etc.) subscribe to this and refetch when
 * `tick` changes. Pull-to-refresh on the hub bumps it for everything at once.
 */
interface RefreshSignalState {
  tick: number;
  bump: () => void;
}

export const useRefreshSignal = create<RefreshSignalState>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));
