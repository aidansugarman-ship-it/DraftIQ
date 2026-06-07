import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'draftiq.firstRun.v1';

interface FirstRunState {
  /** Has the user dismissed the hub tutorial overlay? */
  tutorialDone:    boolean;
  /** Has the user opened the settings screen at least once? */
  settingsOpened:  boolean;
  hydrated:        boolean;
  hydrate:         () => Promise<void>;
  markTutorialDone:   () => void;
  markSettingsOpened: () => void;
}

interface Persisted { tutorialDone: boolean; settingsOpened: boolean }

export const useFirstRunStore = create<FirstRunState>((set, get) => ({
  tutorialDone:   false,
  settingsOpened: false,
  hydrated:       false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        set({ tutorialDone: !!p.tutorialDone, settingsOpened: !!p.settingsOpened, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  markTutorialDone: () => {
    set({ tutorialDone: true });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      tutorialDone:   true,
      settingsOpened: get().settingsOpened,
    })).catch(() => {});
  },

  markSettingsOpened: () => {
    set({ settingsOpened: true });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      tutorialDone:   get().tutorialDone,
      settingsOpened: true,
    })).catch(() => {});
  },
}));
