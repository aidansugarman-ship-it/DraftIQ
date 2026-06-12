import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useDraftVaultStore } from '@store/useDraftVaultStore';
import { gemini } from '@services/gemini';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Prospect { name: string; pos: string; team: string; rank: number }
interface Pick { prospect: Prospect; teamIdx: number; round: number; overall: number }
type Phase = 'setup' | 'loading' | 'live' | 'done';

const POSITIONS_BY_SPORT: Record<SportId, string[]> = {
  nfl: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
  nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  mlb: ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'],
  nhl: ['C', 'LW', 'RW', 'D', 'G'],
};

// Snake order: which team is on the clock for a 0-indexed overall pick.
function teamOnClock(overall: number, teams: number): number {
  const round = Math.floor(overall / teams);
  const idxInRound = overall % teams;
  return round % 2 === 0 ? idxInRound : teams - 1 - idxInRound;
}

/**
 * Robustly parse a big-board JSON array. If the response truncated mid-array
 * (common on a 120-player list), JSON.parse on the whole thing fails — so we
 * fall back to extracting each {...} object individually and salvage as many
 * valid prospects as we can.
 */
function parseBoard(raw: string): Prospect[] {
  const norm = (p: any, i: number): Prospect | null =>
    p && p.name && p.pos
      ? { name: String(p.name), pos: String(p.pos).toUpperCase(), team: p.team ? String(p.team) : '', rank: Number(p.rank) || i + 1 }
      : null;

  // Try the whole array first.
  const arr = raw.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      const parsed = JSON.parse(arr[0]) as any[];
      const clean = parsed.map(norm).filter((x): x is Prospect => !!x);
      if (clean.length) return dedupe(clean);
    } catch { /* fall through to salvage */ }
  }

  // Salvage: pull each object literal out and parse individually.
  const salvaged: Prospect[] = [];
  const objs = raw.match(/\{[^{}]*\}/g) ?? [];
  objs.forEach((o, i) => {
    try {
      const got = norm(JSON.parse(o), i);
      if (got) salvaged.push(got);
    } catch { /* skip bad object */ }
  });
  return dedupe(salvaged);
}

function dedupe(list: Prospect[]): Prospect[] {
  const seen = new Set<string>();
  const out: Prospect[] = [];
  for (const p of list) {
    const key = p.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.sort((a, b) => a.rank - b.rank);
}

export default function DraftRoomScreen() {
  const sport     = useUserStore(s => s.currentSport);
  const sportDef  = SPORTS[sport];
  const saveDraft = useDraftVaultStore(s => s.save);

  const [phase, setPhase]       = useState<Phase>('setup');
  const [numTeams, setNumTeams] = useState(12);
  const [mySlot, setMySlot]     = useState(6);
  const [rounds, setRounds]     = useState(8);

  const [pool, setPool]         = useState<Prospect[]>([]);
  const [picks, setPicks]       = useState<Pick[]>([]);
  const [overall, setOverall]   = useState(0);
  const [advice, setAdvice]     = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [posFilter, setPosFilter] = useState<string>('ALL');
  const [grade, setGrade]       = useState('');
  const [error, setError]       = useState('');

  const myTeamIdx  = mySlot - 1;
  const totalPicks = numTeams * rounds;
  const drafted    = useRef<Set<string>>(new Set());
  const aiTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const available    = pool.filter(p => !drafted.current.has(p.name));
  const onClock      = phase === 'live' ? teamOnClock(overall, numTeams) : -1;
  const myTurn       = onClock === myTeamIdx;
  const currentRound = Math.floor(overall / numTeams) + 1;

  const startDraft = useCallback(async () => {
    setPhase('loading');
    setError('');
    drafted.current = new Set();
    setPicks([]);
    setOverall(0);
    setGrade('');
    try {
      const prompt = `Generate a ${sportDef.shortLabel} fantasy draft big board — the top ${Math.max(120, totalPicks + 30)} players ranked for a redraft league this season. Output EXACT JSON array, nothing else:
[{"name": "player name", "pos": "position abbrev", "team": "team abbrev", "rank": 1}, ...]
Real current players in true ranking order. Mix positions realistically. No duplicates.`;
      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const clean = parseBoard(raw);
      if (clean.length < totalPicks) throw new Error('board too small');
      setPool(clean);
      setPhase('live');
    } catch {
      setError('Could not build the board. Try again.');
      setPhase('setup');
    }
  }, [sportDef.shortLabel, totalPicks]);

  // AI opponent pick — local heuristic, no AI call.
  const aiPick = useCallback((avail: Prospect[], teamIdx: number): Prospect => {
    const roster = picks.filter(p => p.teamIdx === teamIdx);
    const posCount: Record<string, number> = {};
    roster.forEach(p => { posCount[p.prospect.pos] = (posCount[p.prospect.pos] ?? 0) + 1; });
    const scored = avail.slice(0, 18).map(p => {
      const depth = posCount[p.pos] ?? 0;
      return { p, score: p.rank + depth * 6 + Math.random() * 4 };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0].p;
  }, [picks]);

  const commitPick = useCallback((prospect: Prospect) => {
    const teamIdx = teamOnClock(overall, numTeams);
    drafted.current.add(prospect.name);
    setPicks(prev => [...prev, { prospect, teamIdx, round: Math.floor(overall / numTeams) + 1, overall: overall + 1 }]);
    setOverall(o => o + 1);
    setAdvice('');
  }, [overall, numTeams]);

  const fetchAdvice = useCallback(async () => {
    setAdviceLoading(true);
    setAdvice('');
    try {
      const myRoster = picks.filter(p => p.teamIdx === myTeamIdx).map(p => `${p.prospect.name} (${p.prospect.pos})`).join(', ') || 'empty';
      const topAvail = pool.filter(p => !drafted.current.has(p.name)).slice(0, 10).map(p => `${p.name} (${p.pos})`).join(', ');
      const prompt = `${sportDef.shortLabel} fantasy snake draft, round ${currentRound}, ${numTeams}-team. My roster so far: ${myRoster}. Best available: ${topAvail}.

In 1-2 SHORT beginner-friendly sentences (ELI5), tell me what kind of player to target with this pick and why. No JSON. Tone like: "Grab a RB here — only a couple elite ones left and they dry up fast."`;
      const res = await gemini.beginnerExplainer(prompt, sportDef.shortLabel);
      setAdvice(res.trim());
    } catch {
      setAdvice('');
    } finally {
      setAdviceLoading(false);
    }
  }, [picks, pool, myTeamIdx, currentRound, numTeams, sportDef.shortLabel]);

  const finishDraft = useCallback(async () => {
    setPhase('done');
    const myPicks = picks.filter(p => p.teamIdx === myTeamIdx);
    saveDraft({
      sport,
      picks: myPicks.map(p => ({ round: p.round, name: p.prospect.name, pos: p.prospect.pos, team: p.prospect.team })),
    });
    try {
      const res = await gemini.draftRecapGrade(myPicks.map(p => `R${p.round}: ${p.prospect.name} (${p.prospect.pos})`), sportDef.shortLabel);
      setGrade(res);
    } catch { /* no-op */ }
  }, [picks, myTeamIdx, sport, sportDef.shortLabel, saveDraft]);

  // Drive AI picks until it's the user's turn or the draft ends.
  useEffect(() => {
    if (phase !== 'live') return;
    if (overall >= totalPicks) { finishDraft(); return; }
    const team = teamOnClock(overall, numTeams);
    if (team === myTeamIdx) { fetchAdvice(); return; }
    aiTimer.current = setTimeout(() => {
      const avail = pool.filter(p => !drafted.current.has(p.name));
      if (avail.length === 0) return;
      commitPick(aiPick(avail, team));
    }, 650);
    return () => { if (aiTimer.current) clearTimeout(aiTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, overall]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Mock Draft" />

        {phase === 'setup' && (
          <SetupView
            sportDef={sportDef}
            numTeams={numTeams} setNumTeams={(v: number) => { setNumTeams(v); if (mySlot > v) setMySlot(v); }}
            mySlot={mySlot} setMySlot={setMySlot}
            rounds={rounds} setRounds={setRounds}
            onStart={startDraft}
            error={error}
          />
        )}

        {phase === 'loading' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={sportDef.primaryColor} />
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: spacing.md, fontWeight: '700' }}>
              Building the board…
            </Text>
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>
              Ranking the top {sportDef.shortLabel} players
            </Text>
          </View>
        )}

        {phase === 'live' && (
          <LiveView
            sport={sport} sportDef={sportDef} picks={picks} overall={overall}
            numTeams={numTeams} myTeamIdx={myTeamIdx} onClock={onClock} myTurn={myTurn}
            currentRound={currentRound} totalPicks={totalPicks} available={available}
            posFilter={posFilter} setPosFilter={setPosFilter} advice={advice}
            adviceLoading={adviceLoading} onPick={commitPick}
          />
        )}

        {phase === 'done' && (
          <DoneView
            sportDef={sportDef}
            myPicks={picks.filter(p => p.teamIdx === myTeamIdx)}
            grade={grade}
            onAgain={() => setPhase('setup')}
            onVault={() => router.push('/draft-vault' as any)}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function SetupView({ sportDef, numTeams, setNumTeams, mySlot, setMySlot, rounds, setRounds, onStart, error }: any) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.bigTitle}>MOCK{'\n'}DRAFT.</Text>
      <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.xl }}>
        Live snake draft against AI opponents. They pick on the clock — you pick on your turn, with a coach in your ear.
      </Text>
      <Picker label="LEAGUE SIZE" value={numTeams} setValue={setNumTeams} options={[8, 10, 12, 14]} suffix="teams" />
      <Picker label="YOUR DRAFT SLOT" value={mySlot} setValue={setMySlot} options={Array.from({ length: numTeams }, (_, i) => i + 1)} suffix={`of ${numTeams}`} />
      <Picker label="ROUNDS" value={rounds} setValue={setRounds} options={[6, 8, 10, 12, 15]} suffix="rounds" />
      {!!error && <Text variant="caption" style={{ color: colors.coral, marginTop: spacing.md }}>{error}</Text>}
      <TouchableOpacity style={[styles.startBtn, { backgroundColor: sportDef.primaryColor }]} onPress={onStart} activeOpacity={0.85}>
        <Ionicons name="play" size={18} color="#fff" />
        <Text style={styles.startBtnText}>START DRAFT</Text>
      </TouchableOpacity>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

function Picker({ label, value, setValue, options, suffix }: any) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o: number) => {
          const on = o === value;
          return (
            <TouchableOpacity key={o} style={[styles.pickerPill, on && styles.pickerPillOn]} onPress={() => setValue(o)} activeOpacity={0.75}>
              <Text variant="bodyMedium" style={{ color: on ? '#000' : colors.textPrimary, fontWeight: '800' }}>{o}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>{value} {suffix}</Text>
    </View>
  );
}

function LiveView({ sport, sportDef, picks, overall, numTeams, myTeamIdx, onClock, myTurn, currentRound, totalPicks, available, posFilter, setPosFilter, advice, adviceLoading, onPick }: any) {
  const recentPicks = [...picks].slice(-6).reverse();
  const positions = ['ALL', ...POSITIONS_BY_SPORT[sport as SportId]];
  const filtered = available.filter((p: Prospect) => posFilter === 'ALL' || p.pos === posFilter);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.statusBar}>
        <View>
          <Text variant="labelSmall" color={colors.textTertiary}>ROUND {currentRound} · PICK {overall + 1}/{totalPicks}</Text>
          <Text variant="bodyMedium" color={myTurn ? sportDef.primaryColor : colors.textPrimary} style={{ fontWeight: '800' }}>
            {myTurn ? "🎯 YOU'RE ON THE CLOCK" : `Team ${onClock + 1} picking…`}
          </Text>
        </View>
        <View style={[styles.roundChip, { borderColor: `${sportDef.primaryColor}66` }]}>
          <Text variant="labelSmall" style={{ color: sportDef.primaryColor }}>SLOT {myTeamIdx + 1}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentRow} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.base }}>
        {recentPicks.map((p: Pick) => (
          <View key={p.overall} style={[styles.recentPick, p.teamIdx === myTeamIdx && { borderColor: sportDef.primaryColor }]}>
            <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 9 }}>#{p.overall}{p.teamIdx === myTeamIdx ? ' · YOU' : ''}</Text>
            <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>{p.prospect.name}</Text>
            <Text variant="caption" color={colors.textTertiary}>{p.prospect.pos}</Text>
          </View>
        ))}
      </ScrollView>

      {myTurn && (
        <Animated.View entering={FadeIn} style={styles.adviceBox}>
          <Sticker variant="lockedIn" label="YOUR COACH" />
          {adviceLoading ? (
            <ActivityIndicator size="small" color={colors.green} style={{ marginTop: 6 }} />
          ) : (
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '600', lineHeight: 21, marginTop: 6 }}>
              {advice || 'Pick the best player available.'}
            </Text>
          )}
        </Animated.View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posFilterRow} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.base }}>
        {positions.map((p) => (
          <TouchableOpacity key={p} style={[styles.posPill, posFilter === p && styles.posPillOn]} onPress={() => setPosFilter(p)} activeOpacity={0.75}>
            <Text variant="labelSmall" style={{ color: posFilter === p ? colors.textPrimary : colors.textTertiary }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(p: Prospect) => p.name}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: 40 }}
        renderItem={({ item }: { item: Prospect }) => (
          <View style={styles.prospectRow}>
            <Text variant="labelSmall" color={colors.textTertiary} style={{ width: 30 }}>#{item.rank}</Text>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>{item.name}</Text>
              <Text variant="caption" color={colors.textTertiary}>{item.pos} · {item.team}</Text>
            </View>
            <TouchableOpacity
              style={[styles.draftBtn, !myTurn && styles.draftBtnDisabled, myTurn && { backgroundColor: sportDef.primaryColor }]}
              onPress={() => myTurn && onPick(item)}
              disabled={!myTurn}
              activeOpacity={0.8}
            >
              <Text style={{ color: myTurn ? '#fff' : colors.textTertiary, fontWeight: '800', fontSize: 12 }}>
                {myTurn ? 'DRAFT' : '—'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

function DoneView({ sportDef, myPicks, grade, onAgain, onVault }: any) {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Animated.View entering={FadeInUp}>
        <Text style={styles.bigTitle}>DRAFT{'\n'}COMPLETE.</Text>
        <Sticker variant="lockedIn" label="SAVED TO VAULT" />
        {grade ? (
          <View style={styles.gradeBox}>
            <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1, marginBottom: 6 }}>AI GRADE</Text>
            <Text variant="body" color={colors.textPrimary} style={{ lineHeight: 22 }}>{grade}</Text>
          </View>
        ) : (
          <View style={[styles.gradeBox, { alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 6 }}>Grading your draft…</Text>
          </View>
        )}
        <Text style={styles.rosterLabel}>YOUR ROSTER</Text>
        {myPicks.map((p: Pick) => (
          <View key={p.overall} style={styles.finalRow}>
            <View style={styles.finalRound}><Text style={styles.finalRoundText}>R{p.round}</Text></View>
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ flex: 1 }}>{p.prospect.name}</Text>
            <Text variant="caption" color={colors.textTertiary}>{p.prospect.pos} · {p.prospect.team}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: sportDef.primaryColor, flex: 1 }]} onPress={onAgain} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.doneBtnText}>DRAFT AGAIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.doneBtn, styles.doneBtnGhost, { flex: 1 }]} onPress={onVault} activeOpacity={0.85}>
            <Ionicons name="archive" size={16} color={colors.textPrimary} />
            <Text style={[styles.doneBtnText, { color: colors.textPrimary }]}>VAULT</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 80 }} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigTitle: {
    fontSize: 48, fontWeight: '900', color: colors.textPrimary,
    letterSpacing: -2, lineHeight: 50, marginTop: spacing.md, marginBottom: spacing.sm,
  },
  pickerLabel: { fontSize: 11, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, marginBottom: spacing.sm },
  pickerPill: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 48, alignItems: 'center',
  },
  pickerPillOn: { backgroundColor: colors.green, borderColor: colors.green },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: spacing.md, borderRadius: 999, marginTop: spacing.lg,
  },
  startBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.8, fontSize: 15 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  roundChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  recentRow: { maxHeight: 64, marginBottom: spacing.xs },
  recentPick: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, width: 110, gap: 1 },
  adviceBox: {
    marginHorizontal: spacing.base, marginVertical: spacing.sm, backgroundColor: `${colors.green}10`,
    borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.green}40`, padding: spacing.base,
  },
  posFilterRow: { maxHeight: 40, marginBottom: spacing.xs },
  posPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  posPillOn: { backgroundColor: colors.surfaceElevated, borderColor: colors.textTertiary },
  prospectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  draftBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surface, minWidth: 64, alignItems: 'center' },
  draftBtnDisabled: { backgroundColor: colors.surface, opacity: 0.5 },
  gradeBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.base, marginTop: spacing.md, marginBottom: spacing.lg },
  rosterLabel: { fontSize: 11, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, marginBottom: spacing.sm },
  finalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  finalRound: { width: 36, height: 26, borderRadius: radius.sm, backgroundColor: `${colors.gold}1A`, borderWidth: 1, borderColor: `${colors.gold}55`, alignItems: 'center', justifyContent: 'center' },
  finalRoundText: { color: colors.gold, fontSize: 11, fontWeight: '800' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: 999 },
  doneBtnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  doneBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6, fontSize: 13 },
});
