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
          router.replace(profile.onboardingComplete ? '/(tabs)' : '/(onboarding)/sport');
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
    useFavoritesStore.getState().hydrate();
    useStreakStore.getState().hydrate();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </QueryClientProvider>
  );
}
