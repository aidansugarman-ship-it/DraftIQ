import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
// @ts-expect-error — getReactNativePersistence is exported from firebase/auth but not in its public types
import { getAuth, initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? 'placeholder-key',
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? 'placeholder.firebaseapp.com',
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? 'placeholder',
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? 'placeholder.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? '1:000000000000:web:placeholder',
};

const isFreshApp = getApps().length === 0;
const app: FirebaseApp = isFreshApp ? initializeApp(firebaseConfig) : getApp();

// Use AsyncStorage so auth state persists across app restarts.
// `initializeAuth` must run only once per app instance — subsequent reads use `getAuth`.
export const auth: Auth = isFreshApp
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);
export const db: Firestore            = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions     = getFunctions(app);

export default app;

export const COLLECTIONS = {
  USERS:       'users',
  PLAYERS:     'players',
  ARTICLES:    'articles',
  MOCK_DRAFTS: 'mockDrafts',
  TRADES:      'trades',
  INJURIES:    'injuries',
} as const;

export const USER_SUBCOLLECTIONS = {
  ROSTER:       'roster',
  DRAFT_BOARDS: 'draftBoards',
  BOOKMARKS:    'bookmarks',
  WATCH_LIST:   'watchList',
} as const;
