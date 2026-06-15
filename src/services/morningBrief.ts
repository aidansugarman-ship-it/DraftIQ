import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPORTS, type SportId } from '@constants/sports';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';

const KEY = 'draftiq.morningBrief.v1';

interface Cached { day: string; body: string }

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Builds the real one-line "3 moves today" string that gets baked into the
 * 10am push body. Cached once per day so it costs at most one AI call daily.
 * Returns '' on any failure so the caller falls back to the generic copy.
 */
export async function getMorningBriefBody(sport: SportId, rosterSummary: string): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as Cached;
      if (c.day === today() && c.body) return c.body;
    }
  } catch { /* ignore */ }

  try {
    const news = await espn.news(sport, 5).catch(() => []);
    const newsStr = news.map(n => `- ${n.headline}`).join('\n');
    const prompt = `${SPORTS[sport].shortLabel} fantasy. My roster: ${rosterSummary || 'unknown'}.
Recent headlines:
${newsStr}

Write a SINGLE notification-length line (max ~140 chars) naming the 1-2 most important things I should do with my team today. Punchy, specific, real player names. No preamble, no quotes — just the line.`;
    const res = await gemini.beginnerExplainer(prompt, SPORTS[sport].shortLabel);
    const body = res.trim().replace(/^["']|["']$/g, '').slice(0, 150);
    if (body) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ day: today(), body } as Cached)).catch(() => {});
    }
    return body;
  } catch {
    return '';
  }
}
