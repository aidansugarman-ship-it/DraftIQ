import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'draftiq.glossary.dismissed.v1';

/**
 * Drives the global tap-to-explain glossary modal.
 * GlossaryTerm components call show(term); GlossaryModalHost renders the sheet.
 * Also tracks "got it forever" — terms the user dismissed are still tappable
 * but render without the dotted underline so they're not nagged.
 */
interface GlossaryState {
  term:       string | null;
  dismissed:  Record<string, true>;
  hydrated:   boolean;
  hydrate:    () => Promise<void>;
  show:       (term: string) => void;
  hide:       () => void;
  dismiss:    (term: string) => void;
  isDismissed:(term: string) => boolean;
}

export const useGlossaryStore = create<GlossaryState>((set, get) => ({
  term:      null,
  dismissed: {},
  hydrated:  false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const dismissed = raw ? (JSON.parse(raw) as Record<string, true>) : {};
      set({ dismissed, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  show:    (term) => set({ term }),
  hide:    ()     => set({ term: null }),

  dismiss: (term) => {
    const next = { ...get().dismissed, [term.toLowerCase()]: true as const };
    set({ dismissed: next, term: null });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  isDismissed: (term) => !!get().dismissed[term.toLowerCase()],
}));
