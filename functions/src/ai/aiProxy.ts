import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

/**
 * aiProxy — the single server-side gateway for all client AI calls.
 *
 * The client used to call Google's Generative Language API directly with an
 * EXPO_PUBLIC_ key baked into the app bundle (extractable = billing risk).
 * This callable keeps the key as a Firebase secret and makes the exact same
 * request on the client's behalf. The app ships with NO Gemini key.
 *
 * Deploy:
 *   firebase functions:secrets:set GEMINI_API_KEY   # paste the key once
 *   firebase deploy --only functions:aiProxy
 */

const MODELS: Record<string, string> = {
  sharp: 'gemini-2.5-flash',
  fast:  'gemini-2.5-flash-lite',
};

// Daily per-user call caps. Anonymous sessions are cheap to mint, so they get
// only enough calls to sample the product before signing up; real accounts get
// a ceiling high enough that no genuine user hits it, but low enough that one
// compromised account can't drain the Gemini quota (or the bill).
const DAILY_LIMIT_ANON = 12;
const DAILY_LIMIT_USER = 400;

// Reject oversized prompts outright — nothing legitimate in the app is close
// to this, and it caps the cost of any single call.
const MAX_PROMPT_CHARS = 24_000;

interface AiProxyRequest {
  systemPrompt: string;
  prompt:       string;
  tier?:        'sharp' | 'fast';
  maxTokens?:   number;
  temperature?: number;
}

/**
 * Atomically increments today's call count for a uid and throws once the cap
 * is hit. One doc per uid per day, so it self-expires from relevance and can
 * be cleaned up with a TTL policy on `day` if it ever grows.
 */
async function enforceRateLimit(uid: string, isAnon: boolean): Promise<void> {
  const limit = isAnon ? DAILY_LIMIT_ANON : DAILY_LIMIT_USER;
  const day   = new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
  const ref   = admin.firestore().collection('aiUsage').doc(`${uid}_${day}`);

  try {
    // Returns true if this call is within quota (and consumes one), false if
    // the cap is already reached. Deliberately a boolean rather than a count:
    // returning the count and comparing it outside the transaction invites an
    // off-by-one where "at the cap" reads as "under the cap".
    const allowed = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = (snap.exists ? snap.data()?.count : 0) ?? 0;
      if (prev >= limit) return false;
      tx.set(ref, {
        uid,
        day,
        count: prev + 1,
        anon:  isAnon,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });

    if (!allowed) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        isAnon
          ? 'Create a free account to keep going.'
          : "You've hit today's AI limit. It resets at midnight UTC.",
      );
    }
  } catch (e) {
    // A real limit breach must propagate; an infra hiccup must not take the
    // whole app's AI down, so we fail open on unexpected errors only.
    if (e instanceof functions.https.HttpsError) throw e;
    functions.logger.warn('[aiProxy] rate-limit check failed, allowing call', e);
  }
}

export const aiProxy = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data: AiProxyRequest, context) => {
    // Require *a* session so the endpoint isn't open to the world. Anonymous
    // sessions are allowed (the pre-signup taste screen needs AI) but are held
    // to a much tighter daily cap — see enforceRateLimit.
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new functions.https.HttpsError('failed-precondition', 'AI key not configured.');
    }

    const prompt       = data.prompt ?? '';
    const systemPrompt = data.systemPrompt ?? '';
    if (!prompt.trim()) {
      throw new functions.https.HttpsError('invalid-argument', 'Empty prompt.');
    }
    if (prompt.length + systemPrompt.length > MAX_PROMPT_CHARS) {
      throw new functions.https.HttpsError('invalid-argument', 'Prompt too long.');
    }

    const isAnon = context.auth.token?.firebase?.sign_in_provider === 'anonymous';
    await enforceRateLimit(context.auth.uid, isAnon);

    const tier      = data.tier === 'fast' ? 'fast' : 'sharp';
    const model     = MODELS[tier];
    const maxTokens = Math.min(Math.max(data.maxTokens ?? 2048, 64), 4096);
    const temp      = data.temperature ?? 0.8;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     temp,
        maxOutputTokens: maxTokens,
        thinkingConfig:  { thinkingBudget: 0 },
      },
    });

    // One retry with fast-tier fallback on 429/503 (mirrors the old client logic).
    for (let attempt = 0; attempt < 2; attempt++) {
      const target = attempt === 1 && tier === 'sharp'
        ? url.replace(MODELS.sharp, MODELS.fast)
        : url;
      const res = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) {
        const json: any = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text };
        const finish = json?.candidates?.[0]?.finishReason;
        if (finish === 'MAX_TOKENS') throw new functions.https.HttpsError('resource-exhausted', 'Response truncated.');
        if (finish === 'SAFETY')     throw new functions.https.HttpsError('failed-precondition', 'Blocked by safety filter.');
        throw new functions.https.HttpsError('internal', 'Empty response.');
      }
      if ((res.status === 429 || res.status === 503) && attempt === 0) {
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
      let detail = '';
      try { const e: any = await res.json(); detail = e?.error?.message ?? ''; } catch { /* ignore */ }
      throw new functions.https.HttpsError('internal', `AI ${res.status} ${detail}`.trim());
    }
    throw new functions.https.HttpsError('internal', 'AI retried and failed.');
  });
