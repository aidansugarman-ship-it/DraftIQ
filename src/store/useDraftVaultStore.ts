import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.draftVault.v1';

export interface VaultDraft {
  id:        string;
  ts:        number;
  sport:     SportId;
  picks:     Array<{ round: number; name: string; pos: string; team: string }>;
  grade?:    string;       // letter grade from AI (cached)
  note?:     string;       // one-line AI verdict (cached)
}

interface DraftVaultState {
  drafts:    VaultDraft[];
  hydrated:  boolean;
  hydrate:   () => Promise<void>;
  save:      (draft: Omit<VaultDraft, 'id' | 'ts'>) => string; // returns id
  attachGrade: (id: string, grade: string, note: string) => void;
  remove:    (id: string) => void;
  forSport:  (sport: SportId) => VaultDraft[];
}

export const useDraftVaultStore = create<DraftVaultState>((set, get) => ({
  drafts:   [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const drafts = raw ? (JSON.parse(raw) as VaultDraft[]) : [];
      set({ drafts, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  save: (draft) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = [{ ...draft, id, ts: Date.now() }, ...get().drafts].slice(0, 50);
    set({ drafts: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return id;
  },

  attachGrade: (id, grade, note) => {
    const next = get().drafts.map(d => d.id === id ? { ...d, grade, note } : d);
    set({ drafts: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  remove: (id) => {
    const next = get().drafts.filter(d => d.id !== id);
    set({ drafts: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  forSport: (sport) => get().drafts.filter(d => d.sport === sport),
}));
