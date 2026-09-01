import { askJson } from './gemini';
import type { VaultDraft } from '@store/useDraftVaultStore';
import { getDraftBoard } from './draftBoard';

/**
 * Draft recap, built from a draft the user actually completed.
 *
 * The recap screen previously rendered one hardcoded 2024 draft for everyone.
 * Picks, date and league settings now come from the saved draft itself; only
 * the grading is AI-generated.
 */

export type RecapGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

export type RecapPick = {
  round: number;
  pick:  number;
  name:  string;
  team:  string;
  pos:   string;
  grade: RecapGrade;
  /** Overall consensus rank, or null if the player isn't on the board. */
  consensusRank: number | null;
  /**
   * Picks of value gained: how much later than their consensus rank the player
   * was taken. Positive means a bargain, negative means a reach. Null when we
   * have no consensus rank to compare against.
   */
  value: number | null;
};

export type DraftRecap = {
  id:           string;
  date:         string;
  format:       string;
  scoring:      string;
  numTeams:     number;
  draftSlot:    number;
  overallGrade: string;
  picks:        RecapPick[];
  bestPick:     string;
  worstPick:    string;
  summary:      string;
  posGrades:    { pos: string; grade: RecapGrade; count: number }[];
};

export type LeagueContext = {
  numTeams:  number;
  scoring:   string;
  format:    string;
  draftSlot: number;
};

const VALID: RecapGrade[] = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
const isGrade = (g: unknown): g is RecapGrade =>
  typeof g === 'string' && (VALID as string[]).includes(g);

type RawRecap = {
  overallGrade: string;
  bestPick:     string;
  worstPick:    string;
  summary:      string;
  pickGrades:   { name: string; grade: string }[];
  posGrades:    { pos: string; grade: string }[];
};

/**
 * Grades a saved draft. Returns null when the AI is unavailable — the screen
 * shows a retry rather than inventing a verdict.
 */
export async function buildDraftRecap(
  draft: VaultDraft,
  league: LeagueContext,
  sport = 'NFL',
): Promise<DraftRecap | null> {
  if (!draft.picks?.length) return null;

  const roster = draft.picks
    .map((p, i) => `${i + 1}. ${p.name} (${p.pos}, ${p.team}) — Rd ${p.round}`)
    .join('\n');

  const prompt = `Grade this completed fantasy ${sport} draft.

League: ${league.numTeams} teams, ${league.scoring}, ${league.format} draft, picking at slot ${league.draftSlot}.

Picks:
${roster}

Return JSON with exactly this shape:
{
  "overallGrade": "one of A+, A, B+, B, C+, C, D, F",
  "bestPick": "Player Name (Rd N) — short reason",
  "worstPick": "Player Name (Rd N) — short reason",
  "summary": "2-3 sentences on how this draft went",
  "pickGrades": [{"name":"exact player name from the list","grade":"one of A+, A, B+, B, C+, C, D, F"}],
  "posGrades": [{"pos":"RB","grade":"one of A+, A, B+, B, C+, C, D, F"}]
}

Rules:
- Grade every pick listed, using the exact same player names.
- Only include posGrades for positions actually drafted.
- Judge value relative to where each player went in a ${league.numTeams}-team ${league.scoring} league.`;

  // Consensus ranks let us compute real value-vs-market instead of guessing.
  const board = await getDraftBoard().catch(() => []);
  const rankByName = new Map(board.map((p) => [p.name.toLowerCase().trim(), p.rank]));

  const raw = await askJson<RawRecap>(prompt, 'sharp');
  if (!raw || !Array.isArray(raw.pickGrades)) return null;

  const gradeByName = new Map(
    raw.pickGrades.map((g) => [g.name?.toLowerCase().trim(), g.grade]),
  );

  const picks: RecapPick[] = draft.picks.map((p, i) => {
    const key = p.name.toLowerCase().trim();
    const g = gradeByName.get(key);
    const pickNo = i + 1;
    const rank = rankByName.get(key) ?? null;
    return {
      round: p.round,
      pick:  pickNo,
      name:  p.name,
      team:  p.team,
      pos:   p.pos,
      // A pick the model skipped or mislabelled shouldn't blank the row.
      grade: isGrade(g) ? g : 'B',
      consensusRank: rank,
      value: rank == null ? null : pickNo - rank,
    };
  });

  const counts = picks.reduce<Record<string, number>>((acc, p) => {
    acc[p.pos] = (acc[p.pos] ?? 0) + 1;
    return acc;
  }, {});

  const posGrades = (raw.posGrades ?? [])
    .filter((g) => g?.pos && counts[g.pos])
    .map((g) => ({
      pos:   g.pos,
      grade: isGrade(g.grade) ? g.grade : ('B' as RecapGrade),
      count: counts[g.pos],
    }));

  return {
    id:           draft.id,
    date:         new Date(draft.ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    }),
    format:       league.format,
    scoring:      league.scoring,
    numTeams:     league.numTeams,
    draftSlot:    league.draftSlot,
    overallGrade: isGrade(raw.overallGrade) ? raw.overallGrade : 'B',
    picks,
    bestPick:     raw.bestPick  ?? '',
    worstPick:    raw.worstPick ?? '',
    summary:      raw.summary   ?? '',
    posGrades,
  };
}
