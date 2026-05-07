import { useCallback } from 'react';
import { router } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { signOut } from '../services/firebaseAuth';
import type { TierId } from '../types/subscription';
import { canAccess } from '../constants/tiers';

export const useAuth = () => {
  const { user, tier, isLoading } = useUserStore();

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  }, []);

  const requireTier = useCallback(
    (required: TierId): boolean => canAccess(tier, required),
    [tier],
  );

  return {
    user,
    tier,
    isLoading,
    isAuthenticated:   !!user,
    isOnboarded:       user?.onboardingComplete ?? false,
    isGM:              tier === 'gm',
    isStarter:         tier === 'starter' || tier === 'gm',
    signOut:           handleSignOut,
    requireTier,
  };
};
