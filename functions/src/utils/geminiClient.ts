import { GoogleGenerativeAI } from '@google/generative-ai';

// GEMINI_API_KEY is a Firebase secret — never in client code.
// Set via: firebase functions:secrets:set GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');

// Model assignments:
// Flash  → high-frequency, latency-sensitive tasks (draft hot-takes, quick summaries)
// Pro    → complex structured output (DFS lineup optimization, dynasty projections)
export const GEMINI_FLASH = 'gemini-1.5-flash';
export const GEMINI_PRO   = 'gemini-2.0-flash';

export interface GeminiOptions {
  maxTokens?:   number;
  temperature?: number;
  model?:       string;
}

/**
 * Fast single-turn Gemini call.
 * Used for: draft hot-takes, quick player summaries, streaming pick commentary.
 * Claude handles all deep narrative writing — Gemini handles speed.
 */
export const callGemini = async (
  prompt: string,
  options: GeminiOptions = {}
): Promise<string> => {
  const { model = GEMINI_FLASH, maxTokens = 512, temperature = 0.7 } = options;

  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const result   = await generativeModel.generateContent(prompt);
  const response = result.response;
  return response.text();
};

/**
 * Structured JSON output from Gemini.
 * Used for DFS optimizer — returns a typed lineup object.
 */
export const callGeminiJSON = async <T>(
  prompt: string,
  options: GeminiOptions = {}
): Promise<T> => {
  const { model = GEMINI_PRO, maxTokens = 1024 } = options;

  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  });

  const result = await generativeModel.generateContent(prompt);
  const text   = result.response.text();

  return JSON.parse(text) as T;
};
