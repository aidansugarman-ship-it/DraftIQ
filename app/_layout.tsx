import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { onAuthStateChanged } from 'firebase/auth';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { useStreakStore } from '@store/useStreakStore';
import { useGmHistoryStore } from '@store/useGmHistoryStore';
import { useTakesLog } from '@store/useTakesLog';
import { useTradeBlockStore } from '@store/useTradeBlockStore';
import { useDraftVaultStore } from '@store/useDraftVaultStore';
import { useAlertsStore } from '@store/useAlertsStore';
import { useFirstRunStore } from '@store/useFirstRunStore';
import { useGlossaryStore } from '@store/useGlossaryStore';
import { useAchievementsStore } from '@store/useAchievementsStore';
import { useLineupHistoryStore } from '@store/useLineupHistoryStore';
import { useDailyStreakStore } from '@store/useDailyStreakStore';
import { scheduleDailyLoop } from '@services/notifications';
import { scanWatchlistForNews } from '@services/watchlistScanner';
import { useYahooStore } from '@store/useYahooStore';
import { isYahooConnected } from '@services/yahooAuth';
import { GlossaryModalHost } from '@components/shared/GlossaryTerm';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '@lib/firebase';
import { queryClient } from '@lib/queryClient';
import { useUserStore } from '@store/useUserStore';
import type { UserProfile } from '@types/user';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, clearUser, setLoading } = useUserStore();

  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // Auth state listener — runs once, persists for app lifetime
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
          let profile: UserProfile;
          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          } else {
            profile = {
              uid:                  firebaseUser.uid,
              email:                firebaseUser.email ?? '',
              displayName:          firebaseUser.displayName ?? undefined,
              photoURL:             firebaseUser.photoURL ?? undefined,
              tier:                 'rookie',
              createdAt:            new Date().toISOString(),
              onboardingComplete:   false,
              primarySport:         'nfl',
              preferredSports:      ['nfl'],
              gmBadge:              false,
              notificationPreferences: {
                injuryAlerts:        true,
                waiverAlerts:        true,
                sleeperAlerts:       true,
                gmReport:            true,
                draftReminders:      true,
                contractYearAlerts:  true,
                weatherAlerts:       true,
              },
              connectedLeagues:     [],
              draftBoardIds:        [],
              watchListPlayerIds:   [],
            };
          }
          setUser(profile);
          if (!profile.onboardingComplete) {
            router.replace('/(onboarding)/sport');
          } else {
            // Yahoo gate — applies to everyone, even pre-existing accounts.
            // Bypassable: once they connect OR tap "I don't use Yahoo", it stops.
            await useYahooStore.getState().hydrate();
            const connected = await isYahooConnected();
            const dismissed = useYahooStore.getState().promptDismissed;
            router.replace(connected || dismissed ? '/(tabs)' : '/connect-gate');
          }
        } catch (e) {
          console.error('[auth] failed to load profile after sign-in:', e);
          clearUser();
        }
      } else {
        clearUser();
        router.replace('/(auth)/welcome');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Hydrate persisted state on app start
  useEffect(() => {
    useFavoritesStore.getState().hydrate().then(() => {
      // After favorites are loaded, sniff for breaking news on watchlisted players.
      // Fully background — silent if there's nothing new or permission isn't granted.
      scanWatchlistForNews();
    });
    useStreakStore.getState().hydrate();
    useGmHistoryStore.getState().hydrate();
    useTakesLog.getState().hydrate();
    useTradeBlockStore.getState().hydrate();
    useDraftVaultStore.getState().hydrate();
    useFirstRunStore.getState().hydrate();
    useGlossaryStore.getState().hydrate();
    useAchievementsStore.getState().hydrate();
    useLineupHistoryStore.getState().hydrate();
    // Daily-open streak: hydrate, check in for today, reschedule the push
    // loop with the fresh streak count, and unlock streak achievements.
    useDailyStreakStore.getState().hydrate().then(() => {
      const streak = useDailyStreakStore.getState();
      streak.checkIn();
      const days = useDailyStreakStore.getState().current;
      const ach = useAchievementsStore.getState();
      if (days >= 3) ach.unlock('streak_3');
      if (days >= 7) ach.unlock('streak_7');
      // Re-arm the daily notification loop with the live streak (best-effort).
      scheduleDailyLoop(days).catch(() => {});
    });
    useAlertsStore.getState().hydrate().then(() => {
      // After alerts hydrate, the scanner can check them too
      scanWatchlistForNews();
    });
    // Hydrate Yahoo picks, then auto-pick a league per sport if signed in.
    useYahooStore.getState().hydrate().then(() => {
      useYahooStore.getState().autoConnect();
    });
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      <GlossaryModalHost />
    </QueryClientProvider>
  );
}
