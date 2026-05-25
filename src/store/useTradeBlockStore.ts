import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.tradeBlock.v1';

export interface TradeBlockPlayer {
  id:    string;     // Yahoo playerKey
  name:  string;
  team:  string;
  pos:   string;
  sport: SportId;
  note?: string;     // optional user note ("looking for RB help")
  addedAt: number;
}

interface TradeBlockState {
  list:      TradeBlockPlayer[];
  hydrated:  boolean;
  hydrate:   () => Promise<void>;
  toggle:    (player: Omit<TradeBlockPlayer, 'addedAt'>) => void;
  isOnBlock: (id: string) => boolean;
  forSport:  (sport: SportId) => TradeBlockPlayer[];
  clear:     () => void;
}

export const useTradeBlockStore = create<TradeBlockState>((set, get) => ({
  list:     [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const list = raw ? (JSON.parse(raw) as TradeBlockPlayer[]) : [];
      set({ list, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  toggle: (player) => {
    const { list } = get();
    const exists = list.find(p => p.id === player.id);
    const next = exists
      ? list.filter(p => p.id !== player.id)
      : [...list, { ...player, addedAt: Date.now() }];
    set({ list: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  isOnBlock: (id) => !!get().list.find(p => p.id === id),

  forSport: (sport) => get().list.filter(p => p.sport === sport),

  clear: () => {
    set({ list: [] });
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  },
}));
