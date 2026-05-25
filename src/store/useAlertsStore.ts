import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SportId } from '@constants/sports';

const STORAGE_KEY = 'draftiq.customAlerts.v1';

export type AlertCondition = 'news_mention' | 'injury_status' | 'roster_change';

export interface CustomAlert {
  id:        string;
  ts:        number;
  sport:     SportId;
  player:    string;
  condition: AlertCondition;
  enabled:   boolean;
}

interface AlertsState {
  alerts:    CustomAlert[];
  hydrated:  boolean;
  hydrate:   () => Promise<void>;
  add:       (a: Omit<CustomAlert, 'id' | 'ts' | 'enabled'>) => void;
  toggle:    (id: string) => void;
  remove:    (id: string) => void;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts:   [],
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const alerts = raw ? (JSON.parse(raw) as CustomAlert[]) : [];
      set({ alerts, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  add: (a) => {
    const next = [
      {
        ...a,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: Date.now(),
        enabled: true,
      },
      ...get().alerts,
    ].slice(0, 100);
    set({ alerts: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  toggle: (id) => {
    const next = get().alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    set({ alerts: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  remove: (id) => {
    const next = get().alerts.filter(a => a.id !== id);
    set({ alerts: next });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },
}));
