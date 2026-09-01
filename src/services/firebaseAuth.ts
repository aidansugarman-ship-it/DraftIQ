import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInAnonymously,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import * as AppleAuthentication from 'expo-apple-authentication';
import { auth, db, COLLECTIONS } from '../lib/firebase';
import type { UserProfile } from '../types/user';

const buildDefaultProfile = (
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
): Omit<UserProfile, 'uid'> => ({
  email,
  displayName: displayName ?? undefined,
  photoURL:    photoURL    ?? undefined,
  tier:               'rookie',
  createdAt:          new Date().toISOString(),
  onboardingComplete: false,
  primarySport:       'nfl',
  preferredSports:    ['nfl'],
  gmBadge:            false,
  notificationPreferences: {
    injuryAlerts:       true,
    waiverAlerts:       true,
    sleeperAlerts:      true,
    gmReport:           true,
    draftReminders:     true,
    contractYearAlerts: true,
    weatherAlerts:      true,
  },
  connectedLeagues:   [],
  draftBoardIds:      [],
  watchListPlayerIds: [],
});

const stripUndefined = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
};

const persistNewUser = async (
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
): Promise<void> => {
  const profile = buildDefaultProfile(uid, email, displayName, photoURL);
  await setDoc(doc(db, COLLECTIONS.USERS, uid), stripUndefined({
    uid,
    ...profile,
    createdAt: serverTimestamp(),
  }));
};

// ── Anonymous session ─────────────────────────────────────────────────────────

/**
 * Guarantees SOME Firebase auth session exists, signing in anonymously if the
 * user hasn't made a real account yet.
 *
 * Why: the AI runs through the `aiProxy` Cloud Function, which requires an auth
 * context so the Gemini key never ships in the app. The pre-signup "taste a
 * take" screen still needs AI, so it needs a session — an anonymous one.
 *
 * Anonymous users are NOT treated as signed in for routing (see app/_layout).
 * When they later sign up for real, Firebase issues a fresh uid; the anonymous
 * one is disposable and holds no data.
 */
export const ensureAuthSession = async (): Promise<boolean> => {
  if (auth.currentUser) return true;
  try {
    await signInAnonymously(auth);
    return true;
  } catch (e) {
    console.warn('[auth] anonymous sign-in failed:', e);
    return false;
  }
};

/** True when there's a session but it's a throwaway anonymous one. */
export const isAnonymousSession = (): boolean => !!auth.currentUser?.isAnonymous;

// ── Email / Password ──────────────────────────────────────────────────────────

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await persistNewUser(user.uid, email, displayName);
  return user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

// ── Google Sign-In (lazy — requires native dev build) ─────────────────────────

export const signInWithGoogle = async () => {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const { data } = await GoogleSignin.signIn();
  if (!data?.idToken) throw new Error('Google sign-in returned no id token');

  const credential = GoogleAuthProvider.credential(data.idToken);
  const { user }   = await signInWithCredential(auth, credential);

  await persistNewUser(
    user.uid,
    user.email ?? '',
    user.displayName ?? undefined,
    user.photoURL ?? undefined,
  ).catch(() => {});

  return user;
};

// ── Apple Sign-In ─────────────────────────────────────────────────────────────

export const signInWithApple = async () => {
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken, fullName, email } = appleCredential;
  if (!identityToken) throw new Error('Apple sign-in returned no identity token');

  const provider   = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken });
  const { user }   = await signInWithCredential(auth, credential);

  const displayName = fullName
    ? `${fullName.givenName ?? ''} ${fullName.familyName ?? ''}`.trim()
    : undefined;

  if (displayName) await updateProfile(user, { displayName });

  await persistNewUser(user.uid, email ?? user.email ?? '', displayName).catch(() => {});

  return user;
};

// ── Sign Out ──────────────────────────────────────────────────────────────────

export const signOut = async () => {
  await firebaseSignOut(auth);
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch { /* not signed in with Google or native module unavailable */ }
};

export const isAppleAuthAvailable = (): Promise<boolean> =>
  AppleAuthentication.isAvailableAsync();

/**
 * Permanently delete the signed-in user's account + Firestore profile.
 * Apple requires in-app account deletion for any app with sign-up.
 * Returns 'reauth' if Firebase needs a fresh login before it'll delete.
 */
export const deleteAccount = async (): Promise<'ok' | 'reauth' | 'error'> => {
  const user = auth.currentUser;
  if (!user) return 'error';
  try {
    // Best-effort: remove the Firestore profile doc first.
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, COLLECTIONS } = await import('@lib/firebase');
      await deleteDoc(doc(db, COLLECTIONS.USERS, user.uid));
    } catch { /* doc may not exist — continue to auth deletion */ }

    await user.delete();
    return 'ok';
  } catch (e: any) {
    if (e?.code === 'auth/requires-recent-login') return 'reauth';
    return 'error';
  }
};
