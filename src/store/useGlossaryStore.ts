import { create } from 'zustand';

/**
 * Drives the global tap-to-explain glossary modal.
 * GlossaryTerm components call show(term); GlossaryModalHost renders the sheet.
 */
interface GlossaryState {
  term: string | null;
  show: (term: string) => void;
  hide: () => void;
}

export const useGlossaryStore = create<GlossaryState>((set) => ({
  term: null,
  show: (term) => set({ term }),
  hide: () => set({ term: null }),
}));
