import { create } from 'zustand';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { useUserStore } from './useUserStore';
import type { SportId, ScoringTypeId } from '../constants/sports';
import type { TeamArchetype, DraftPositionCategory, DraftFormat } from '../types/draft';

interface OnboardingState {
  preferredSports:        SportId[];
  primarySport:           SportId;
  experienceLevel:        'beginner' | 'experienced' | null;
  scoringType:            ScoringTypeId | null;
  numTeams:               number;
  format:                 DraftFormat;
  isDynasty:              boolean;
  archetype:              TeamArchetype | null;
  draftPositionCategory:  DraftPositionCategory | null;
  draftPositionNumber:    number;

  setPreferredSports:     (sports: SportId[]) => void;
  setExperienceLevel:     (level: 'beginner' | 'experienced') => void;
  setScoringType:         (t: ScoringTypeId) => void;
  setNumTeams:            (n: number) => void;
  setFormat:              (f: DraftFormat) => void;
  setIsDynasty:           (b: boolean) => void;
  setArchetype:           (a: TeamArchetype) => void;
  setDraftPosition:       (cat: DraftPositionCategory, num: number) => void;
  commit:                 () => Promise<void>;
  reset:                  () => void;
}

const INITIAL: Omit<OnboardingState, 'setPreferredSports' | 'setExperienceLevel' | 'setScoringType' | 'setNumTeams' | 'setFormat' | 'setIsDynasty' | 'setArchetype' | 'setDraftPosition' | 'commit' | 'reset'> = {
  preferredSports:       [],
  primarySport:          'nfl',
  experienceLevel:       null,
  scoringType:           null,
  numTeams:              12,
  format:                'snake',
  isDynasty:             false,
  archetype:             null,
  draftPositionCategory: null,
  draftPositionNumber:   6,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...INITIAL,

  setPreferredSports: (sports) => set({
    preferredSports: sports,
    primarySport:    sports[0] ?? 'nfl',
  }),
  setExperienceLevel: (experienceLevel) => set({ experienceLevel }),
  setScoringType:   (scoringType) => set({ scoringType }),
  setNumTeams:      (numTeams) => set({ numTeams }),
  setFormat:        (format) => set({ format }),
  setIsDynasty:     (isDynasty) => set({ isDynasty }),
  setArchetype:     (archetype) => set({ archetype }),
  setDraftPosition: (cat, num) => set({
    draftPositionCategory: cat,
    draftPositionNumber:   num,
  }),

  commit: async () => {
    const s    = get();
    const user = useUserStore.getState().user;
    if (!user) throw new Error('No authenticated user');

    const updates = {
      onboardingComplete: true,
      primarySport:       s.primarySport,
      preferredSports:    s.preferredSports,
      experienceLevel:    s.experienceLevel ?? 'experienced',
      archetype:          s.archetype ?? 'balanced',
      leagueSettings: {
        sport:                  s.primarySport,
        scoringType:            s.scoringType ?? 'ppr',
        numTeams:               s.numTeams,
        draftPositionCategory:  s.draftPositionCategory ?? 'middle',
        draftPositionNumber:    s.draftPositionNumber,
        numRounds:              16,
        format:                 s.format,
        isDynasty:              s.isDynasty,
        isKeeper:               false,
      },
    };

    await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), updates);

    useUserStore.getState().updateUser(updates as any);
    get().reset();
  },

  reset: () => set({ ...INITIAL }),
}));
