import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { gemini } from '@services/gemini';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';

// ─── Mock player pool ─────────────────────────────────────────────────────────

type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

interface ComparePlayer {
  id:         string;
  name:       string;
  team:       string;
  pos:        Pos;
  age:        number;
  adp:        number;
  owned:      number;
  score:      number;
  stats: {
    projPts:   number;  // weekly projected points
    floorPts:  number;
    ceilPts:   number;
    avgPts:    number;
    targets?:  number;
    carries?:  number;
    touchdowns: number;
    yards:     number;
  };
  upside:     number;   // 0–100
  floor:      number;   // 0–100
  health:     number;   // 0–100
  schedule:   number;   // 0–100 (ROS schedule strength)
  role:       string;
  aiVerdict:  string;
}

const PLAYER_POOL: ComparePlayer[] = [
  {
    id: '1',
    name: 'Christian McCaffrey',
    team: 'SF', pos: 'RB', age: 27, adp: 1.0, owned: 99, score: 98,
    stats: { projPts: 22.4, floorPts: 14, ceilPts: 38, avgPts: 24.1, carries: 18, touchdowns: 12, yards: 1420 },
    upside: 98, floor: 88, health: 70, schedule: 72,
    role: 'Workhorse RB1 — leads team in carries and targets',
    aiVerdict: 'Elite ceiling and floor. Only concern is health history.',
  },
  {
    id: '2',
    name: 'CeeDee Lamb',
    team: 'DAL', pos: 'WR', age: 25, adp: 2.0, owned: 98, score: 96,
    stats: { projPts: 20.8, floorPts: 12, ceilPts: 36, avgPts: 21.5, targets: 11.2, touchdowns: 10, yards: 1380 },
    upside: 96, floor: 80, health: 92, schedule: 78,
    role: 'True WR1 — leads league in targets from slot and outside',
    aiVerdict: 'One of the safest WR1s in fantasy. Volume guarantees a floor.',
  },
  {
    id: '3',
    name: 'Ja\'Marr Chase',
    team: 'CIN', pos: 'WR', age: 24, adp: 5.2, owned: 95, score: 92,
    stats: { projPts: 19.2, floorPts: 8, ceilPts: 42, avgPts: 18.7, targets: 10.1, touchdowns: 9, yards: 1240 },
    upside: 99, floor: 62, health: 88, schedule: 68,
    role: 'Boom-or-bust WR1 — elite ceiling, matchup-dependent floor',
    aiVerdict: 'Highest ceiling receiver in the game. Accept the variance.',
  },
  {
    id: '4',
    name: 'Justin Jefferson',
    team: 'MIN', pos: 'WR', age: 25, adp: 4.0, owned: 96, score: 93,
    stats: { projPts: 19.8, floorPts: 11, ceilPts: 38, avgPts: 20.2, targets: 10.8, touchdowns: 8, yards: 1310 },
    upside: 95, floor: 82, health: 85, schedule: 75,
    role: 'Every-route WR1 with elite route tree and target volume',
    aiVerdict: 'Consistent elite option. Great floor with matching ceiling.',
  },
  {
    id: '5',
    name: 'Breece Hall',
    team: 'NYJ', pos: 'RB', age: 23, adp: 6.0, owned: 92, score: 90,
    stats: { projPts: 18.6, floorPts: 10, ceilPts: 34, avgPts: 17.9, carries: 16, touchdowns: 8, yards: 1180 },
    upside: 88, floor: 70, health: 78, schedule: 80,
    role: 'RB1 in all three downs with receiving upside in passing game',
    aiVerdict: 'Elite age-25 breakout. NYJ offense limiting his ceiling somewhat.',
  },
  {
    id: '6',
    name: 'Travis Kelce',
    team: 'KC', pos: 'TE', age: 35, adp: 7.0, owned: 90, score: 89,
    stats: { projPts: 17.2, floorPts: 9, ceilPts: 30, avgPts: 16.8, targets: 8.4, touchdowns: 7, yards: 920 },
    upside: 82, floor: 75, health: 80, schedule: 72,
    role: 'TE1 by a wide margin — Mahomes\' safety valve on every drive',
    aiVerdict: 'Age-related decline is real but he\'s still TE1 by a mile.',
  },
  {
    id: '7',
    name: 'Josh Allen',
    team: 'BUF', pos: 'QB', age: 28, adp: 14.0, owned: 94, score: 95,
    stats: { projPts: 26.4, floorPts: 18, ceilPts: 44, avgPts: 27.1, carries: 6, touchdowns: 14, yards: 2840 },
    upside: 96, floor: 85, health: 90, schedule: 70,
    role: 'QB1 — elite dual-threat with 38+ TD pace',
    aiVerdict: 'Consensus QB1 every week. Running ability elevates his floor dramatically.',
  },
  {
    id: '8',
    name: 'Bijan Robinson',
    team: 'ATL', pos: 'RB', age: 22, adp: 10.0, owned: 88, score: 86,
    stats: { projPts: 16.8, floorPts: 9, ceilPts: 32, avgPts: 15.2, carries: 15, touchdowns: 7, yards: 1080 },
    upside: 92, floor: 65, health: 88, schedule: 76,
    role: 'Feature back with three-down upside in a run-heavy offense',
    aiVerdict: 'Dynasty asset with RB1 upside. 2025 looks even brighter.',
  },
  {
    id: '9',
    name: 'Amon-Ra St. Brown',
    team: 'DET', pos: 'WR', age: 24, adp: 22.0, owned: 84, score: 83,
    stats: { projPts: 16.4, floorPts: 12, ceilPts: 26, avgPts: 16.9, targets: 9.8, touchdowns: 6, yards: 1020 },
    upside: 75, floor: 84, health: 92, schedule: 82,
    role: 'Route runner slot WR — volume-based floor every week',
    aiVerdict: 'Best floor WR in fantasy. Ceiling is capped but rock-solid.',
  },
  {
    id: '10',
    name: 'Davante Adams',
    team: 'LV', pos: 'WR', age: 31, adp: 8.1, owned: 88, score: 88,
    stats: { projPts: 17.8, floorPts: 10, ceilPts: 32, avgPts: 17.1, targets: 10.4, touchdowns: 8, yards: 1160 },
    upside: 86, floor: 72, health: 84, schedule: 65,
    role: 'WR1 in LV passing attack — Garoppolo target hog',
    aiVerdict: 'Age is fine — route running is elite. QB situation is the risk.',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const POS_COLORS: Record<Pos, string> = {
  QB:  colors.coral,
  RB:  colors.green,
  WR:  colors.blue,
  TE:  colors.gold,
  K:   colors.textTertiary,
  DEF: colors.purple,
};

interface MetricDef {
  key:   keyof ComparePlayer;
  label: string;
  max:   number;
  color: string;
}

const METRICS: MetricDef[] = [
  { key: 'score',    label: 'Overall',  max: 100, color: colors.green },
  { key: 'upside',   label: 'Upside',   max: 100, color: colors.blue },
  { key: 'floor',    label: 'Floor',    max: 100, color: colors.gold },
  { key: 'health',   label: 'Health',   max: 100, color: colors.coral },
  { key: 'schedule', label: 'Schedule', max: 100, color: colors.purple },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <View style={[pb.badge, { backgroundColor: `${POS_COLORS[pos]}18` }]}>
      <Text variant="labelSmall" style={{ color: POS_COLORS[pos] }}>{pos}</Text>
    </View>
  );
}

function MetricBar({
  value,
  max,
  color,
  compareValue,
  delay = 0,
}: {
  value:         number;
  max:           number;
  color:         string;
  compareValue?: number;
  delay?:        number;
}) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming((value / max) * 100, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={mb.track}>
      <Animated.View style={[mb.fill, { backgroundColor: color }, barStyle]} />
      {compareValue !== undefined && (
        <View style={[mb.marker, { left: `${(compareValue / max) * 100}%` as any }]} />
      )}
    </View>
  );
}

function PlayerPicker({
  slot,
  player,
  onOpen,
  accentColor,
}: {
  slot:        1 | 2;
  player:      ComparePlayer | null;
  onOpen:      () => void;
  accentColor: string;
}) {
  if (!player) {
    return (
      <TouchableOpacity style={[picker.empty, { borderColor: `${accentColor}30` }]} onPress={onOpen} activeOpacity={0.75}>
        <Ionicons name="person-add-outline" size={20} color={accentColor} />
        <Text variant="bodySmall" style={{ color: accentColor }}>Add Player {slot}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(250)} layout={Layout}>
      <TouchableOpacity
        style={[picker.filled, { borderColor: `${POS_COLORS[player.pos]}35` }]}
        onPress={onOpen}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[`${POS_COLORS[player.pos]}08`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={picker.top}>
          <PosBadge pos={player.pos} />
          <Text variant="caption" color={colors.textTertiary}>{player.team} · Age {player.age}</Text>
        </View>
        <Text variant="bodyMedium" color={colors.textPrimary}>{player.name}</Text>
        <View style={picker.stats}>
          <View style={picker.stat}>
            <Text variant="caption" color={colors.textTertiary}>PROJ</Text>
            <Text variant="bodySmallMedium" color={colors.textPrimary}>{player.stats.projPts}</Text>
          </View>
          <View style={picker.stat}>
            <Text variant="caption" color={colors.textTertiary}>SCORE</Text>
            <Text variant="bodySmallMedium" style={{ color: player.score >= 90 ? colors.green : colors.blue }}>
              {player.score}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SearchModal({
  visible,
  onClose,
  onSelect,
  excluded,
}: {
  visible:  boolean;
  onClose:  () => void;
  onSelect: (p: ComparePlayer) => void;
  excluded: string[];
}) {
  const [query, setQuery] = useState('');
  const [posFilter, setPosFilter] = useState<Pos | 'ALL'>('ALL');

  const filtered = PLAYER_POOL.filter(p => {
    if (excluded.includes(p.id)) return false;
    const matchPos = posFilter === 'ALL' || p.pos === posFilter;
    const matchQ   = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.team.toLowerCase().includes(query.toLowerCase());
    return matchPos && matchQ;
  });

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={modal.overlay}>
      <View style={modal.sheet}>
        <View style={modal.handle} />
        <View style={modal.header}>
          <Text variant="bodyMedium" color={colors.textPrimary}>Select Player</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color={colors.textTertiary} /></TouchableOpacity>
        </View>
        <View style={modal.searchWrap}>
          <Ionicons name="search" size={14} color={colors.textTertiary} style={{ marginRight: 6 }} />
          <TextInput style={modal.input} placeholder="Search…" placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} autoFocus />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.posScroll} contentContainerStyle={{ paddingRight: spacing.base }}>
          {(['ALL', 'QB', 'RB', 'WR', 'TE'] as const).map(pos => (
            <TouchableOpacity key={pos} style={[modal.pill, posFilter === pos && modal.pillActive]} onPress={() => setPosFilter(pos)} activeOpacity={0.7}>
              <Text variant="labelSmall" style={{ color: posFilter === pos ? colors.textPrimary : colors.textTertiary }}>{pos}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={modal.row} onPress={() => { onSelect(item); onClose(); }} activeOpacity={0.75}>
              <PosBadge pos={item.pos} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>{item.name}</Text>
                <Text variant="caption" color={colors.textTertiary}>{item.team} · {item.pos} · ADP {item.adp}</Text>
              </View>
              <Text variant="bodySmallMedium" style={{ color: item.score >= 90 ? colors.green : colors.blue }}>{item.score}</Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 360 }}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        />
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type OpenSlot = 1 | 2 | null;

export default function CompareScreen() {
  const [playerA,  setPlayerA]  = useState<ComparePlayer | null>(null);
  const [playerB,  setPlayerB]  = useState<ComparePlayer | null>(null);
  const [openSlot, setOpenSlot] = useState<OpenSlot>(null);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const excluded = [playerA?.id, playerB?.id].filter(Boolean) as string[];

  function handleSelect(player: ComparePlayer) {
    if (openSlot === 1) setPlayerA(player);
    else if (openSlot === 2) setPlayerB(player);
  }

  const bothSelected = playerA !== null && playerB !== null;
  const [aiVerdict, setAiVerdict] = useState('');
  const [verdictLoading, setVerdictLoading] = useState(false);

  useEffect(() => {
    if (!playerA || !playerB) return;
    setAiVerdict('');
    setVerdictLoading(true);
    gemini.comparePlayers(playerA.name, playerB.name, 'NFL')
      .then(setAiVerdict)
      .catch(() => {})
      .finally(() => setVerdictLoading(false));
  }, [playerA?.id, playerB?.id]);

  function getWinner(metric: keyof ComparePlayer): 'A' | 'B' | 'tie' {
    if (!playerA || !playerB) return 'tie';
    const a = playerA[metric] as number;
    const b = playerB[metric] as number;
    if (a > b) return 'A';
    if (b > a) return 'B';
    return 'tie';
  }

  const metricWins = METRICS.reduce((acc, m) => {
    acc[m.key as string] = getWinner(m.key);
    return acc;
  }, {} as Record<string, 'A' | 'B' | 'tie'>);

  const aWins = Object.values(metricWins).filter(v => v === 'A').length;
  const bWins = Object.values(metricWins).filter(v => v === 'B').length;
  const overallWinner = aWins > bWins ? 'A' : bWins > aWins ? 'B' : 'tie';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Player Compare</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>COMPARE.</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Head-to-head player analysis — stats, upside, floor, and AI verdict.
            </Text>
          </Animated.View>

          {/* Picker row */}
          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <PlayerPicker slot={1} player={playerA} onOpen={() => setOpenSlot(1)} accentColor={colors.blue} />
            </View>
            <View style={styles.vsCircle}>
              <Text variant="labelSmall" color={colors.textTertiary}>VS</Text>
            </View>
            <View style={styles.pickerCol}>
              <PlayerPicker slot={2} player={playerB} onOpen={() => setOpenSlot(2)} accentColor={colors.gold} />
            </View>
          </View>

          {/* Comparison metrics */}
          {bothSelected && (
            <Animated.View entering={FadeIn.duration(400)}>

              {/* Winner banner */}
              {overallWinner !== 'tie' && (
                <View style={[styles.winnerBanner, {
                  borderColor: overallWinner === 'A' ? `${colors.blue}40` : `${colors.gold}40`,
                  backgroundColor: overallWinner === 'A' ? `${colors.blue}0C` : `${colors.gold}0C`,
                }]}>
                  <Ionicons name="trophy" size={16} color={overallWinner === 'A' ? colors.blue : colors.gold} />
                  <Text variant="bodyMedium" style={{ color: overallWinner === 'A' ? colors.blue : colors.gold }}>
                    {overallWinner === 'A' ? playerA!.name : playerB!.name} wins overall
                  </Text>
                  <Text variant="bodySmall" color={colors.textTertiary}>
                    {Math.max(aWins, bWins)}–{Math.min(aWins, bWins)}
                  </Text>
                </View>
              )}

              {/* Metric bars */}
              <View style={styles.metricsCard}>
                <Text variant="label" color={colors.textTertiary} style={styles.metricsTitle}>
                  HEAD-TO-HEAD
                </Text>
                {METRICS.map((m, i) => {
                  const valA = playerA![m.key] as number;
                  const valB = playerB![m.key] as number;
                  const winner = metricWins[m.key as string];
                  return (
                    <Animated.View key={m.key as string} entering={FadeIn.delay(i * 80).duration(300)} style={styles.metricRow}>
                      <View style={styles.metricLeft}>
                        <Text
                          variant="bodySmallMedium"
                          style={{ color: winner === 'A' ? colors.textPrimary : colors.textTertiary }}
                        >
                          {valA}
                        </Text>
                        {winner === 'A' && <Ionicons name="chevron-forward" size={12} color={colors.blue} />}
                      </View>
                      <View style={styles.metricCenter}>
                        <Text variant="caption" color={colors.textTertiary} style={{ textAlign: 'center', letterSpacing: 0.5 }}>
                          {m.label}
                        </Text>
                        <MetricBar value={valA} max={m.max} color={colors.blue} delay={i * 80} />
                        <MetricBar value={valB} max={m.max} color={colors.gold} delay={i * 80} />
                      </View>
                      <View style={styles.metricRight}>
                        {winner === 'B' && <Ionicons name="chevron-back" size={12} color={colors.gold} />}
                        <Text
                          variant="bodySmallMedium"
                          style={{ color: winner === 'B' ? colors.textPrimary : colors.textTertiary }}
                        >
                          {valB}
                        </Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>

              {/* Projections */}
              <View style={styles.projCard}>
                <Text variant="label" color={colors.textTertiary} style={styles.metricsTitle}>
                  WEEKLY PROJECTIONS
                </Text>
                {[
                  { label: 'Projected Pts', a: playerA!.stats.projPts, b: playerB!.stats.projPts },
                  { label: 'Floor',         a: playerA!.stats.floorPts, b: playerB!.stats.floorPts },
                  { label: 'Ceiling',       a: playerA!.stats.ceilPts,  b: playerB!.stats.ceilPts },
                  { label: 'Season Avg',    a: playerA!.stats.avgPts,   b: playerB!.stats.avgPts },
                ].map((row, i) => (
                  <Animated.View key={row.label} entering={FadeIn.delay(i * 60).duration(300)} style={styles.projRow}>
                    <Text
                      variant="bodySmallMedium"
                      style={{ color: row.a >= row.b ? colors.blue : colors.textTertiary, width: 44, textAlign: 'right' }}
                    >
                      {row.a}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary} style={{ flex: 1, textAlign: 'center' }}>{row.label}</Text>
                    <Text
                      variant="bodySmallMedium"
                      style={{ color: row.b > row.a ? colors.gold : colors.textTertiary, width: 44, textAlign: 'left' }}
                    >
                      {row.b}
                    </Text>
                  </Animated.View>
                ))}
              </View>

              {/* Verdict */}
              <View style={styles.verdictSection}>
                <Text variant="label" color={colors.textTertiary} style={styles.metricsTitle}>
                  THE CALL
                </Text>
                <View style={[styles.verdictCard, { borderColor: `${colors.green}30` }]}>
                  <View style={styles.verdictName}>
                    <Text variant="bodySmallMedium" color={colors.green}>
                      {playerA!.name} vs {playerB!.name}
                    </Text>
                  </View>
                  {verdictLoading
                    ? <ActivityIndicator size="small" color={colors.green} style={{ marginTop: spacing.sm }} />
                    : <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 20, marginTop: spacing.sm }}>
                        {aiVerdict || `${playerA!.aiVerdict} | ${playerB!.aiVerdict}`}
                      </Text>
                  }
                </View>
              </View>

            </Animated.View>
          )}

          {!bothSelected && (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                Select two players above to see a head-to-head comparison.
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <SearchModal
          visible={openSlot !== null}
          onClose={() => setOpenSlot(null)}
          onSelect={handleSelect}
          excluded={excluded}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     100,
  },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width:          36,
    height:         36,
    borderRadius:   radius.sm,
    backgroundColor: colors.surface,
    borderWidth:    1,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },

  title: {
    ...typography.h1,
    fontSize:     44,
    lineHeight:   46,
    color:        colors.textPrimary,
    marginTop:    spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight:   22,
    marginBottom: spacing.xl,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  spacing.xl,
  },
  pickerCol: { flex: 1 },
  vsCircle: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: colors.surfaceElevated,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  winnerBanner: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    borderWidth:    1,
    borderRadius:   radius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    marginBottom:   spacing.xl,
  },

  metricsCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    marginBottom:    spacing.xl,
    gap:             spacing.lg,
  },
  metricsTitle: {
    letterSpacing: 1,
    marginBottom:  spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  metricLeft: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:            4,
    width:          44,
  },
  metricCenter: {
    flex: 1,
    gap:  4,
  },
  metricRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    width:         44,
  },

  projCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    marginBottom:    spacing.xl,
    gap:             spacing.md,
  },
  projRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  verdictSection: { marginBottom: spacing.xl },
  verdictCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.base,
  },
  verdictName: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },

  emptyHint: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap:        spacing.md,
  },
  emptyEmoji: { fontSize: 36 },
  bottomSpacer: { height: spacing.xl },
});

const picker = StyleSheet.create({
  empty: {
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderStyle:     'dashed',
    borderRadius:    radius.lg,
    paddingVertical: spacing.xl,
    gap:             spacing.sm,
  },
  filled: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             spacing.sm,
    overflow:        'hidden',
  },
  top: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  stats: {
    flexDirection: 'row',
    gap:           spacing.xl,
  },
  stat: { gap: 3 },
});

const pb = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
    minWidth:          32,
    alignItems:        'center',
  },
});

const mb = StyleSheet.create({
  track: {
    height:          5,
    backgroundColor: colors.surfaceElevated,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: {
    height:       5,
    borderRadius: 3,
  },
  marker: {
    position:   'absolute',
    top:        0,
    bottom:     0,
    width:      2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});

const modal = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent:  'flex-end',
    zIndex:          100,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth:  1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor:     colors.border,
    paddingBottom:   40,
    maxHeight:       '80%',
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: colors.border,
    alignSelf:       'center',
    marginTop:       spacing.md,
    marginBottom:    spacing.sm,
  },
  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingBottom:    spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.background,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    marginHorizontal: spacing.base,
    marginTop:       spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical:  8,
  },
  input: {
    flex: 1, color: colors.textPrimary, fontSize: 14, fontFamily: 'DMSans_400Regular',
  },
  posScroll: { marginTop: spacing.md, marginLeft: spacing.base, marginBottom: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full,
    marginRight: spacing.xs, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.surfaceElevated, borderColor: colors.textTertiary },
  row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base,
    paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
});
