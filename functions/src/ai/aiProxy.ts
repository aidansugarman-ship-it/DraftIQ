import * as functions from 'firebase-functions/v1';

/**
 * aiProxy — the single server-side gateway for all client AI calls.
 *
 * The client used to call Google's Generative Language API directly with an
 * EXPO_PUBLIC_ key baked into the app bundle (extractable = billing risk).
 * This callable keeps the key as a Firebase secret and makes the exact same
 * request on the client's behalf.
 *
 * Deploy:
 *   firebase functions:secrets:set GEMINI_API_KEY   # paste the key once
 *   firebase deploy --only functions:aiProxy
 * After deploy + verify, remove EXPO_PUBLIC_GEMINI_API_KEY from the app build.
 */

const MODELS: Record<string, string> = {
  sharp: 'gemini-2.5-flash',
  fast:  'gemini-2.5-flash-lite',
};

interface AiProxyRequest {
  systemPrompt: string;
  prompt:       string;
  tier?:        'sharp' | 'fast';
  maxTokens?:   number;
  temperature?: number;
}

export const aiProxy = functions
  .runWith({ secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(async (data: AiProxyRequest, context) => {
    // Require an authenticated user so the endpoint can't be abused anonymously.
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new functions.https.HttpsError('failed-precondition', 'AI key not configured.');
    }

    const tier      = data.tier === 'fast' ? 'fast' : 'sharp';
    const model     = MODELS[tier];
    const maxTokens = Math.min(Math.max(data.maxTokens ?? 2048, 64), 4096);
    const temp      = data.temperature ?? 0.8;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = JSON.stringify({
      system_instruction: { parts: [{ text: data.systemPrompt ?? '' }] },
      contents: [{ parts: [{ text: data.prompt ?? '' }] }],
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
