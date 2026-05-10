import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, type Auth } from 'firebase/auth';
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

// Prevent re-initialization on hot reload
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Auth with AsyncStorage persistence so tokens survive app restarts
export const auth: Auth = getApps().length <= 1
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : (getApps()[0] as any)._delegate._authStateEventListeners
    ? (getApps()[0] as any)._delegate
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });

export const db: Firestore       = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions    = getFunctions(app);

export default app;

// ─────────────────────────────────────────────────────────────────────────────
// Firestore collection path constants
// Keep all collection names in one place to prevent typos across the codebase
// ─────────────────────────────────────────────────────────────────────────────
export const COLLECTIONS = {
  USERS:       'users',
  PLAYERS:     'players',
  ARTICLES:    'articles',
  MOCK_DRAFTS: 'mockDrafts',
  TRADES:      'trades',
  INJURIES:    'injuries',
} as const;

export const USER_SUBCOLLECTIONS = {
  ROSTER:      'roster',
  DRAFT_BOARDS: 'draftBoards',
  BOOKMARKS:   'bookmarks',
  WATCH_LIST:  'watchList',
} as const;
