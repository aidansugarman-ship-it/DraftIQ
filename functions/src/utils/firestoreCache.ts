import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface CachedField<T> {
  data:         T;
  generatedAt:  admin.firestore.Timestamp;
  newsHash:     string;   // hash of the news/data used — invalidates when content changes
}

/**
 * Returns cached AI data if it exists and is still fresh.
 * Cache is invalidated if:
 *   (a) it's older than maxAgeHours, OR
 *   (b) the newsHash has changed (new articles/news since last generation)
 */
export const getCachedField = async <T>(
  collection: string,
  docId:      string,
  field:      string,
  maxAgeHours = 24,
  currentHash?: string
): Promise<T | null> => {
  const snap = await db.collection(collection).doc(docId).get();
  if (!snap.exists) return null;

  const cached = snap.data()?.[field] as CachedField<T> | undefined;
  if (!cached) return null;

  const ageMs    = Date.now() - cached.generatedAt.toMillis();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  if (ageMs > maxAgeMs)                          return null;
  if (currentHash && cached.newsHash !== currentHash) return null;

  return cached.data;
};

/**
 * Writes AI-generated data into a Firestore document field with cache metadata.
 * Uses merge:true so it never overwrites unrelated fields on the same document.
 */
export const setCachedField = async <T>(
  collection: string,
  docId:      string,
  field:      string,
  data:       T,
  newsHash:   string
): Promise<void> => {
  await db.collection(collection).doc(docId).set(
    {
      [field]: {
        data,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        newsHash,
      },
    },
    { merge: true }
  );
};

/**
 * Simple hash of a string — used to detect when player news has changed.
 * Not cryptographic — just needs to be fast and consistent.
 */
export const hashString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit int
  }
  return Math.abs(hash).toString(16);
};
