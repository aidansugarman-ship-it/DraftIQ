import { askJson } from './gemini';
import { sleeper } from './sleeper';

/**
 * Weekly GM Report, generated from the user's real roster.
 *
 * This screen previously rendered a hardcoded report — same grades, same
 * "bold moves", same week, for every user forever. Everything here is now
 * derived from the actual roster plus the live NFL week.
 */

export type PositionGrade = { pos: string; grade: string; note: string };
export type BoldMove = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  urgency: 'high' | 'medium' | 'low';
};
export type ReportFlag = {
  id: string;
  type: 'warning' | 'danger' | 'good';
  label: string;
  body: string;
};

export type GMReport = {
  week:           number;
  generatedAt:    string;
  overallGrade:   string;
  headline:       string;
  summary:        string;
  positionGrades: PositionGrade[];
  boldMoves:      BoldMove[];
  flags:          ReportFlag[];
  weeklyOutlook:  string;
};

/** Shape we ask the model for — ids are added locally so keys stay stable. */
type RawReport = Omit<GMReport, 'week' | 'generatedAt' | 'boldMoves' | 'flags'> & {
  boldMoves: Omit<BoldMove, 'id'>[];
  flags:     Omit<ReportFlag, 'id'>[];
};

const URGENCIES = new Set(['high', 'medium', 'low']);
const FLAG_TYPES = new Set(['warning', 'danger', 'good']);

function formatNow(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}

/**
 * Generates the report. Returns null when the AI is unavailable or returns
 * something unusable — the screen shows a retry state rather than stale fiction.
 */
export async function generateGMReport(
  roster: string[],
  sport = 'NFL',
): Promise<GMReport | null> {
  if (roster.length === 0) return null;

  const week = await sleeper.getNFLState()
    .then((s) => Number(s.week) || 1)
    .catch(() => 1);

  const prompt = `You are grading a fantasy ${sport} roster for Week ${week}.

Roster: ${roster.join(', ')}

Return JSON with exactly this shape:
{
  "overallGrade": "letter grade like A-, B+, C",
  "headline": "one punchy sentence about this team's outlook",
  "summary": "2-3 sentences on what's working and what isn't",
  "positionGrades": [{"pos":"QB","grade":"A-","note":"one specific sentence"}],
  "boldMoves": [{"emoji":"⚡","title":"short action title","body":"2 sentences of reasoning","urgency":"high"}],
  "flags": [{"type":"warning","label":"short label","body":"one sentence"}],
  "weeklyOutlook": "2 sentences on this week's matchup outlook"
}

Rules:
- Only grade positions actually present on the roster.
- 2-3 boldMoves, 2-3 flags.
- urgency must be "high", "medium" or "low".
- type must be "warning", "danger" or "good".
- Reference real players by name. Be specific, not generic.`;

  const raw = await askJson<RawReport>(prompt, 'sharp');
  if (!raw || !Array.isArray(raw.positionGrades) || raw.positionGrades.length === 0) {
    return null;
  }

  return {
    week,
    generatedAt:    formatNow(),
    overallGrade:   raw.overallGrade ?? '—',
    headline:       raw.headline ?? '',
    summary:        raw.summary ?? '',
    positionGrades: raw.positionGrades.filter((g) => g?.pos && g?.grade),
    boldMoves: (raw.boldMoves ?? [])
      .filter((m) => m?.title)
      .map((m, i) => ({
        ...m,
        id: `m${i}`,
        emoji:   m.emoji || '⚡',
        urgency: URGENCIES.has(m.urgency) ? m.urgency : 'medium',
      })),
    flags: (raw.flags ?? [])
      .filter((f) => f?.label)
      .map((f, i) => ({
        ...f,
        id: `f${i}`,
        type: FLAG_TYPES.has(f.type) ? f.type : 'warning',
      })),
    weeklyOutlook: raw.weeklyOutlook ?? '',
  };
}
