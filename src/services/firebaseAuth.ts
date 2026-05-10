import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
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
  displayName,
  photoURL,
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

const persistNewUser = async (
  uid: string,
  email: string,
  displayName?: string,
  photoURL?: string,
): Promise<void> => {
  const profile = buildDefaultProfile(uid, email, displayName, photoURL);
  await setDoc(doc(db, COLLECTIONS.USERS, uid), {
    uid,
    ...profile,
    createdAt: serverTimestamp(),
  });
};

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
