import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
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

interface Prospect { name: string; pos: string; team: string; rank: number }
interface Won { prospect: Prospect; teamIdx: number; price: number }
type Phase = 'setup' | 'loading' | 'live' | 'done';

const POSITIONS_BY_SPORT: Record<SportId, string[]> = {
  nfl: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
  nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  mlb: ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'],
  nhl: ['C', 'LW', 'RW', 'D', 'G'],
};

function parseBoard(raw: string): Prospect[] {
  const norm = (p: any, i: number): Prospect | null =>
    p && p.name && p.pos
      ? { name: String(p.name), pos: String(p.pos).toUpperCase(), team: p.team ? String(p.team) : '', rank: Number(p.rank) || i + 1 }
      : null;
  const arr = raw.match(/\[[\s\S]*\]/);
  if (arr) {
    try {
      const parsed = JSON.parse(arr[0]) as any[];
      const clean = parsed.map(norm).filter((x): x is Prospect => !!x);
      if (clean.length) return dedupe(clean);
    } catch { /* salvage */ }
  }
  const salvaged: Prospect[] = [];
  (raw.match(/\{[^{}]*\}/g) ?? []).forEach((o, i) => {
    try { const g = norm(JSON.parse(o), i); if (g) salvaged.push(g); } catch { /* skip */ }
  });
  return dedupe(salvaged);
}
function dedupe(list: Prospect[]): Prospect[] {
  const seen = new Set<string>(); const out: Prospect[] = [];
  for (const p of list) { const k = p.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(p); } }
  return out.sort((a, b) => a.rank - b.rank);
}

// Dollar value of a player to an AI team, scaled to the budget. Top of the
// board commands a big chunk; value falls off fast. Returns a max willingness.
function valuation(rank: number, poolSize: number, budget: number, rosterSize: number): number {
  const tierFrac = Math.max(0, 1 - rank / poolSize);
  const star = Math.pow(tierFrac, 2.2);          // top-heavy curve
  const baseline = budget / rosterSize;          // even-split reference
  const v = Math.round(baseline * 0.4 + star * budget * 0.55);
  return Math.max(1, v);
}

export default function AuctionRoomScreen() {
  const sport     = useUserStore(s => s.currentSport);
  const sportDef  = SPORTS[sport];
  const saveDraft = useDraftVaultStore(s => s.save);

  const [phase, setPhase]       = useState<Phase>('setup');
  const [numTeams, setNumTeams] = useState(12);
  const [budget, setBudget]     = useState(200);
  const [rosterSize, setRosterSize] = useState(8);

  const [pool, setPool]   = useState<Prospect[]>([]);
  const [won, setWon]     = useState<Won[]>([]);
  const [budgets, setBudgets] = useState<number[]>([]);
  const [nomIdx, setNomIdx]   = useState(0);          // whose nomination turn
  const [nominee, setNominee] = useState<Prospect | null>(null);
  const [aiTopBid, setAiTopBid] = useState(0);
  const [aiTopTeam, setAiTopTeam] = useState(0);
  const [myBid, setMyBid] = useState('');
  const [lastResult, setLastResult] = useState<string>('');
  const [posFilter, setPosFilter] = useState('ALL');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const myIdx = 0; // user is always team 0 in auction (slot doesn't matter)
  const drafted = useRef<Set<string>>(new Set());

  const available = pool.filter(p => !drafted.current.has(p.name));
  const myRoster  = won.filter(w => w.teamIdx === myIdx);
  const myBudget  = budgets[myIdx] ?? 0;
  const mySlotsLeft = rosterSize - myRoster.length;
  const myMaxBid  = Math.max(0, myBudget - (mySlotsLeft - 1)); // must keep $1/slot

  const startDraft = useCallback(async () => {
    setPhase('loading');
    setError('');
    drafted.current = new Set();
    setWon([]);
    setBudgets(Array(numTeams).fill(budget));
    setNomIdx(0);
    setNominee(null);
    setGrade('');
    try {
      const need = numTeams * rosterSize + 20;
      const prompt = `Generate a ${sportDef.shortLabel} fantasy AUCTION big board — the top ${Math.max(120, need)} players ranked this season. EXACT JSON array, nothing else:
[{"name":"player","pos":"POS","team":"TM","rank":1}, ...]
Real current players, true ranking order, no duplicates.`;
      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const clean = parseBoard(raw);
      if (clean.length < numTeams * rosterSize) throw new Error('board too small');
      setPool(clean);
      setPhase('live');
    } catch {
      setError('Could not build the board. Try again.');
      setPhase('setup');
    }
  }, [sportDef.shortLabel, numTeams, rosterSize, budget]);

  // Nominate a player + compute the AI field's best bid for them.
  const nominate = useCallback((p: Prospect) => {
    setNominee(p);
    setMyBid('');
    setLastResult('');
    // Each AI team's willingness, capped by their budget & remaining slots.
    let topBid = 1, topTeam = -1;
    for (let t = 0; t < numTeams; t++) {
      if (t === myIdx) continue;
      const tRoster = won.filter(w => w.teamIdx === t).length;
      if (tRoster >= rosterSize) continue;
      const tBudget = budgets[t] ?? 0;
      const tMax = Math.max(1, tBudget - (rosterSize - tRoster - 1));
      const want = valuation(p.rank, pool.length, budget, rosterSize) * (0.8 + Math.random() * 0.5);
      const bid = Math.min(Math.round(want), tMax);
      if (bid > topBid) { topBid = bid; topTeam = t; }
    }
    setAiTopBid(topBid);
    setAiTopTeam(topTeam < 0 ? 1 : topTeam);
  }, [numTeams, won, budgets, pool.length, budget, rosterSize]);

  // Auto-nominate for AI teams; stop on the user's nomination turn.
  useEffect(() => {
    if (phase !== 'live' || nominee) return;
    // Done? every team full or board exhausted
    const allFull = budgets.every((_, t) => won.filter(w => w.teamIdx === t).length >= rosterSize);
    if (allFull || available.length === 0 || myRoster.length >= rosterSize && nomIdx === myIdx) {
      if (myRoster.length >= rosterSize) { finishDraft(); return; }
    }
    if (nomIdx === myIdx) return; // wait for user to nominate
    // AI nominates the best available player it makes sense to throw out
    const t = setTimeout(() => {
      const pick = available[Math.floor(Math.random() * Math.min(5, available.length))];
      if (pick) nominate(pick);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, nominee, nomIdx, available.length]);

  // Resolve the current nominee given the user's bid.
  const resolve = useCallback((userBid: number) => {
    if (!nominee) return;
    const bid = Math.max(0, Math.min(userBid, myMaxBid));
    let winnerIdx: number;
    let price: number;
    if (bid > aiTopBid) {
      winnerIdx = myIdx;
      price = Math.max(1, aiTopBid + 1);       // second-price + 1
      setLastResult(`✅ You won ${nominee.name} for $${price}.`);
    } else {
      winnerIdx = aiTopTeam;
      price = Math.max(1, bid + 1, Math.round(aiTopBid * 0.9));
      setLastResult(`Team ${aiTopTeam + 1} got ${nominee.name} for $${price}.${bid > 0 ? " You were outbid." : ''}`);
    }
    drafted.current.add(nominee.name);
    setWon(prev => [...prev, { prospect: nominee, teamIdx: winnerIdx, price }]);
    setBudgets(prev => prev.map((b, i) => i === winnerIdx ? b - price : b));
    setNominee(null);
    setNomIdx((nomIdx + 1) % numTeams);
  }, [nominee, myMaxBid, aiTopBid, aiTopTeam, nomIdx, numTeams]);

  const finishDraft = useCallback(async () => {
    setPhase('done');
    saveDraft({
      sport,
      picks: myRoster.map((w, i) => ({ round: i + 1, name: `${w.prospect.name} ($${w.price})`, pos: w.prospect.pos, team: w.prospect.team })),
    });
    try {
      const res = await gemini.draftRecapGrade(myRoster.map(w => `${w.prospect.name} (${w.prospect.pos}, $${w.price})`), sportDef.shortLabel);
      setGrade(res);
    } catch { /* no-op */ }
  }, [myRoster, sport, sportDef.shortLabel, saveDraft]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Auction Draft" />

        {phase === 'setup' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.bigTitle}>AUCTION{'\n'}DRAFT.</Text>
            <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.xl }}>
              Every team gets a budget and bids on players. Nominate, bid your max, and try to build a roster without blowing your bank. AI teams bid against you.
            </Text>
            <Picker label="LEAGUE SIZE" value={numTeams} setValue={setNumTeams} options={[8, 10, 12]} suffix="teams" />
            <Picker label="BUDGET" value={budget} setValue={setBudget} options={[100, 200, 300]} suffix="dollars" />
            <Picker label="ROSTER SIZE" value={rosterSize} setValue={setRosterSize} options={[6, 8, 10, 12]} suffix="players" />
            {!!error && <Text variant="caption" style={{ color: colors.coral, marginTop: spacing.md }}>{error}</Text>}
            <TouchableOpacity style={[styles.startBtn, { backgroundColor: sportDef.primaryColor }]} onPress={startDraft} activeOpacity={0.85}>
              <Ionicons name="hammer" size={18} color="#fff" />
              <Text style={styles.startBtnText}>START AUCTION</Text>
            </TouchableOpacity>
            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        {phase === 'loading' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={sportDef.primaryColor} />
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: spacing.md, fontWeight: '700' }}>Building the board…</Text>
          </View>
        )}

        {phase === 'live' && (
          <View style={{ flex: 1 }}>
            {/* Budget bar */}
            <View style={styles.budgetBar}>
              <View>
                <Text variant="labelSmall" color={colors.textTertiary}>YOUR BUDGET</Text>
                <Text variant="h3" style={{ color: colors.green, fontWeight: '900' }}>${myBudget}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="labelSmall" color={colors.textTertiary}>ROSTER</Text>
                <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>{myRoster.length}/{rosterSize}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="labelSmall" color={colors.textTertiary}>MAX BID</Text>
                <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>${myMaxBid}</Text>
              </View>
            </View>

            {!!lastResult && (
              <Animated.View entering={FadeIn} style={styles.resultStrip}>
                <Text variant="bodySmall" color={colors.textPrimary}>{lastResult}</Text>
              </Animated.View>
            )}

            {nominee ? (
              <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.nomineeCard}>
                <Sticker variant="fire" label="ON THE BLOCK" />
                <Text style={styles.nomineeName}>{nominee.name}</Text>
                <Text variant="bodySmall" color={colors.textTertiary}>{nominee.pos} · {nominee.team} · rank #{nominee.rank}</Text>
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.sm }}>
                  Field is bidding around ${aiTopBid}. Beat it or pass.
                </Text>
                <View style={styles.bidRow}>
                  <View style={styles.bidInputWrap}>
                    <Text variant="bodyMedium" color={colors.textTertiary}>$</Text>
                    <TextInput
                      style={styles.bidInput}
                      value={myBid}
                      onChangeText={setMyBid}
                      keyboardType="number-pad"
                      placeholder={`${Math.min(aiTopBid + 1, myMaxBid)}`}
                      placeholderTextColor={colors.textTertiary}
                      maxLength={4}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.bidBtn, { backgroundColor: sportDef.primaryColor }]}
                    onPress={() => resolve(Number(myBid) || 0)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bidBtnText}>BID</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.passBtn} onPress={() => resolve(0)} activeOpacity={0.8}>
                    <Text style={{ color: colors.textTertiary, fontWeight: '800' }}>PASS</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : nomIdx === myIdx ? (
              <View style={styles.nominatePrompt}>
                <Sticker variant="lockedIn" label="YOUR NOMINATION" />
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6 }}>
                  Tap a player below to put them up for auction.
                </Text>
              </View>
            ) : (
              <View style={styles.nominatePrompt}>
                <ActivityIndicator size="small" color={colors.textTertiary} />
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 6 }}>Team {nomIdx + 1} is nominating…</Text>
              </View>
            )}

            {/* Board (for nomination) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posFilterRow} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.base }}>
              {['ALL', ...POSITIONS_BY_SPORT[sport]].map(p => (
                <TouchableOpacity key={p} style={[styles.posPill, posFilter === p && styles.posPillOn]} onPress={() => setPosFilter(p)} activeOpacity={0.75}>
                  <Text variant="labelSmall" style={{ color: posFilter === p ? colors.textPrimary : colors.textTertiary }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <FlatList
              data={available.filter(p => posFilter === 'ALL' || p.pos === posFilter)}
              keyExtractor={p => p.name}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: 40 }}
              renderItem={({ item }) => {
                const canNominate = !nominee && nomIdx === myIdx;
                return (
                  <View style={styles.prospectRow}>
                    <Text variant="labelSmall" color={colors.textTertiary} style={{ width: 30 }}>#{item.rank}</Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>{item.name}</Text>
                      <Text variant="caption" color={colors.textTertiary}>{item.pos} · {item.team}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.nomBtn, !canNominate && { opacity: 0.4 }, canNominate && { borderColor: sportDef.primaryColor }]}
                      onPress={() => canNominate && nominate(item)}
                      disabled={!canNominate}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: canNominate ? sportDef.primaryColor : colors.textTertiary, fontWeight: '800', fontSize: 11 }}>
                        NOMINATE
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        )}

        {phase === 'done' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Animated.View entering={FadeInUp}>
              <Text style={styles.bigTitle}>AUCTION{'\n'}DONE.</Text>
              <Sticker variant="lockedIn" label="SAVED TO VAULT" />
              {grade ? (
                <View style={styles.gradeBox}>
                  <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1, marginBottom: 6 }}>AI GRADE</Text>
                  <Text variant="body" color={colors.textPrimary} style={{ lineHeight: 22 }}>{grade}</Text>
                </View>
              ) : (
                <View style={[styles.gradeBox, { alignItems: 'center' }]}>
                  <ActivityIndicator size="small" color={colors.green} />
                  <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 6 }}>Grading your roster…</Text>
                </View>
              )}
              <Text style={styles.rosterLabel}>YOUR ROSTER · ${budget - myBudget} spent</Text>
              {myRoster.map((w, i) => (
                <View key={i} style={styles.finalRow}>
                  <View style={styles.priceTag}><Text style={styles.priceText}>${w.price}</Text></View>
                  <Text variant="bodyMedium" color={colors.textPrimary} style={{ flex: 1 }}>{w.prospect.name}</Text>
                  <Text variant="caption" color={colors.textTertiary}>{w.prospect.pos} · {w.prospect.team}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                <TouchableOpacity style={[styles.doneBtn, { backgroundColor: sportDef.primaryColor, flex: 1 }]} onPress={() => setPhase('setup')} activeOpacity={0.85}>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.doneBtnText}>AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.doneBtn, styles.doneBtnGhost, { flex: 1 }]} onPress={() => router.push('/draft-vault' as any)} activeOpacity={0.85}>
                  <Ionicons name="archive" size={16} color={colors.textPrimary} />
                  <Text style={[styles.doneBtnText, { color: colors.textPrimary }]}>VAULT</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 80 }} />
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontSize: 48, fontWeight: '900', color: colors.textPrimary, letterSpacing: -2, lineHeight: 50, marginTop: spacing.md, marginBottom: spacing.sm },
  pickerLabel: { fontSize: 11, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, marginBottom: spacing.sm },
  pickerPill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 56, alignItems: 'center' },
  pickerPillOn: { backgroundColor: colors.green, borderColor: colors.green },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: spacing.md, borderRadius: 999, marginTop: spacing.lg },
  startBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.8, fontSize: 15 },
  budgetBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultStrip: { backgroundColor: colors.surface, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, marginHorizontal: spacing.base, marginTop: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  nomineeCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: `${colors.coral}66`, padding: spacing.base, margin: spacing.base, gap: 4 },
  nomineeName: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, letterSpacing: -0.5, marginTop: 6 },
  bidRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  bidInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.base, borderWidth: 1, borderColor: colors.border },
  bidInput: { flex: 1, paddingVertical: spacing.md, color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  bidBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.md },
  bidBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6 },
  passBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  nominatePrompt: { margin: spacing.base, padding: spacing.base, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  posFilterRow: { maxHeight: 40, marginBottom: spacing.xs },
  posPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  posPillOn: { backgroundColor: colors.surfaceElevated, borderColor: colors.textTertiary },
  prospectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  nomBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minWidth: 84, alignItems: 'center' },
  gradeBox: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.base, marginTop: spacing.md, marginBottom: spacing.lg },
  rosterLabel: { fontSize: 11, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, marginBottom: spacing.sm },
  finalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  priceTag: { minWidth: 44, height: 26, borderRadius: radius.sm, backgroundColor: `${colors.green}1A`, borderWidth: 1, borderColor: `${colors.green}55`, alignItems: 'center', justifyContent: 'center' },
  priceText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: 999 },
  doneBtnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  doneBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.6, fontSize: 13 },
});
