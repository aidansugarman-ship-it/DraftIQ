import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'draftiq.favoritePlayers';

export interface FavoritePlayer {
  id:    string;
  name:  string;
  team:  string;
  pos:   string;
  sport: 'nfl' | 'nba' | 'mlb' | 'nhl';
  addedAt: string;
}

interface FavoritesState {
  favorites: FavoritePlayer[];
  hydrated:  boolean;
  hydrate:   () => Promise<void>;
  toggle:    (player: Omit<FavoritePlayer, 'addedAt'>) => void;
  isFavorite: (id: string) => boolean;
  remove:    (id: string) => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  hydrated:  false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const favorites = raw ? (JSON.parse(raw) as FavoritePlayer[]) : [];
      set({ favorites, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  toggle: (player) => {
    const { favorites } = get();
    const exists = favorites.find(f => f.id === player.id);
    const next = exists
      ? favorites.filter(f => f.id !== player.id)
      : [...favorites, { ...player, addedAt: new Date().toISOString() }];
    set({ favorites: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  isFavorite: (id) => !!get().favorites.find(f => f.id === id),

  remove: (id) => {
    const next = get().favorites.filter(f => f.id !== id);
    set({ favorites: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },
}));
