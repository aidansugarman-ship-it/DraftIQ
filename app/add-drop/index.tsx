import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { sleeper, SleeperPlayer } from '@services/sleeper';
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
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

type Action   = 'add' | 'drop' | 'stream';
type Priority = 'high' | 'medium' | 'low';
type Pos      = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

interface WaiverTarget {
  id:        string;
  name:      string;
  team:      string;
  pos:       Pos;
  owned:     number;
  trend:     number;
  score:     number;
  action:    Action;
  priority:  Priority;
  reason:    string;
  aiTake:    string;
  dropsFor?: string;
  byeWeek:   number;
  injury?:   string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FANTASY_POS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);

const ACTION_COLORS: Record<Action, string> = {
  add:    colors.green,
  drop:   colors.coral,
  stream: colors.gold,
};

const ACTION_LABELS: Record<Action, string> = {
  add:    'ADD',
  drop:   'DROP',
  stream: 'STREAM',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   colors.coral,
  medium: colors.gold,
  low:    colors.textTertiary,
};

const POS_COLORS: Record<Pos, string> = {
  QB:  colors.coral,
  RB:  colors.green,
  WR:  colors.blue,
  TE:  colors.gold,
  K:   colors.textTertiary,
  DEF: colors.purple,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estimateOwnership(rank: number | null): number {
  if (!rank) return 5;
  if (rank < 10)  return 96;
  if (rank < 30)  return 88;
  if (rank < 75)  return 72;
  if (rank < 150) return 54;
  if (rank < 300) return 30;
  return 12;
}

function trendToScore(count: number): number {
  if (count > 10000) return 95;
  if (count > 5000)  return 88;
  if (count > 2000)  return 80;
  if (count > 1000)  return 72;
  if (count > 500)   return 64;
  return 55;
}

function safePos(pos: string): Pos {
  return (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(pos) ? pos : 'WR') as Pos;
}

function buildReason(p: SleeperPlayer, count: number, action: 'add' | 'drop'): string {
  if (p.injury_notes) return p.injury_notes;
  if (p.injury_status) {
    const word = action === 'add' ? 'adds' : 'drops';
    return `${p.injury_status} — ${count.toLocaleString()} ${word} in 24h after injury news.`;
  }
  const word = action === 'add' ? 'adds' : 'drops';
  return `Trending with ${count.toLocaleString()} ${word} in the last 24 hours.`;
}

function buildTargets(
  adds: { player_id: string; count: number }[],
  drops: { player_id: string; count: number }[],
  players: Record<string, SleeperPlayer>,
): WaiverTarget[] {
  const addTargets: WaiverTarget[] = adds
    .filter(t => players[t.player_id] && FANTASY_POS.has(players[t.player_id].position))
    .slice(0, 12)
    .map((t, i): WaiverTarget => {
      const p = players[t.player_id];
      const name = p.full_name || `${p.first_name} ${p.last_name}`;
      return {
        id:       t.player_id,
        name,
        team:     p.team || 'FA',
        pos:      safePos(p.position),
        owned:    estimateOwnership(p.search_rank),
        trend:    t.count,
        score:    trendToScore(t.count),
        action:   'add',
        priority: i < 3 ? 'high' : i < 7 ? 'medium' : 'low',
        reason:   buildReason(p, t.count, 'add'),
        aiTake:   '',
        byeWeek:  0,
        injury:   p.injury_status ?? undefined,
      };
    });

  const dropTargets: WaiverTarget[] = drops
    .filter(t => players[t.player_id] && FANTASY_POS.has(players[t.player_id].position))
    .slice(0, 5)
    .map((t, i): WaiverTarget => {
      const p = players[t.player_id];
      const name = p.full_name || `${p.first_name} ${p.last_name}`;
      return {
        id:       `drop-${t.player_id}`,
        name,
        team:     p.team || 'FA',
        pos:      safePos(p.position),
        owned:    estimateOwnership(p.search_rank),
        trend:    -t.count,
        score:    Math.max(10, 55 - Math.floor(t.count / 200)),
        action:   'drop',
        priority: i === 0 ? 'high' : 'medium',
        reason:   buildReason(p, t.count, 'drop'),
        aiTake:   '',
        byeWeek:  0,
        injury:   p.injury_status ?? undefined,
      };
    });

  return [...addTargets, ...dropTargets];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'ADD' | 'DROP' | 'STREAM';

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <View style={[pos_.badge, { backgroundColor: `${POS_COLORS[pos]}18` }]}>
      <Text variant="labelSmall" style={{ color: POS_COLORS[pos] }}>{pos}</Text>
    </View>
  );
}

function TrendArrow({ trend }: { trend: number }) {
  if (trend === 0) return null;
  const up    = trend > 0;
  const color = up ? colors.green : colors.coral;
  const label = up ? `+${Math.abs(trend).toLocaleString()}` : `-${Math.abs(trend).toLocaleString()}`;
  return (
    <View style={trend_.wrap}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
      <Text variant="caption" style={{ color }}>{label}</Text>
    </View>
  );
}

function WaiverCard({ target, index }: { target: WaiverTarget; index: number }) {
  const accentColor = ACTION_COLORS[target.action];
  const [aiTake, setAiTake]     = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (target.action !== 'add') return;
    setAiLoading(true);
    gemini.addDropAdvice(target.name, target.dropsFor ?? 'a bench player', 'NFL')
      .then(setAiTake)
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [target.name]);

  const op = useSharedValue(0);
  const ty = useSharedValue(12);
  useEffect(() => {
    op.value = withDelay(index * 60, withTiming(1, { duration: 350 }));
    ty.value = withDelay(index * 60, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={anim}>
      <View style={[card.wrap, { borderColor: `${accentColor}30` }]}>
        <LinearGradient
          colors={[`${accentColor}08`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Top row */}
        <View style={card.top}>
          <View style={card.left}>
            <View style={[card.actionBadge, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}45` }]}>
              <Text variant="labelSmall" style={{ color: accentColor, letterSpacing: 1 }}>
                {ACTION_LABELS[target.action]}
              </Text>
            </View>
            <View style={[card.priorityDot, { backgroundColor: PRIORITY_COLORS[target.priority] }]} />
          </View>
          <View style={card.scoreBox}>
            <Text variant="labelSmall" color={colors.textTertiary}>Score</Text>
            <Text variant="bodyMedium" style={{ color: target.score >= 70 ? colors.green : target.score >= 55 ? colors.gold : colors.coral }}>
              {target.score}
            </Text>
          </View>
        </View>

        {/* Player info */}
        <View style={card.playerRow}>
          <View style={{ flex: 1 }}>
            <View style={card.nameRow}>
              <PosBadge pos={target.pos} />
              <Text variant="bodyMedium" color={colors.textPrimary}>{target.name}</Text>
            </View>
            <View style={card.metaRow}>
              <Text variant="caption" color={colors.textTertiary}>{target.team}</Text>
              {target.injury && (
                <View style={card.injuryTag}>
                  <Text variant="caption" style={{ color: colors.coral }}>⚠ {target.injury}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={card.statsCol}>
            <Text variant="caption" color={colors.textTertiary}>{target.owned}% owned</Text>
            <TrendArrow trend={target.trend} />
          </View>
        </View>

        {/* Reason */}
        <Text variant="bodySmall" color={colors.textSecondary} style={card.reason}>
          {target.reason}
        </Text>

        {/* AI Take — only for adds */}
        {target.action === 'add' && (
          <View style={card.aiTake}>
            <Text variant="labelSmall" color={colors.green} style={{ letterSpacing: 0.8 }}>AI TAKE</Text>
            {aiLoading
              ? <ActivityIndicator size="small" color={colors.green} style={{ marginTop: 6 }} />
              : aiTake
                ? <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4, lineHeight: 18 }}>{aiTake}</Text>
                : null
            }
          </View>
        )}

        {/* Drop suggestion */}
        {target.dropsFor && target.action === 'add' && (
          <View style={card.dropSuggestion}>
            <Ionicons name="swap-horizontal" size={13} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary}>
              Drop <Text variant="caption" color={colors.coral}>{target.dropsFor}</Text>
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AddDropScreen() {
  const [filter, setFilter]           = useState<FilterTab>('ALL');
  const [waiverTargets, setTargets]   = useState<WaiverTarget[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [adds, drops, players] = await Promise.all([
        sleeper.getTrendingAdds(20),
        sleeper.getTrendingDrops(8),
        sleeper.getAllPlayers(),
      ]);
      const targets = buildTargets(adds, drops, players);
      setTargets(targets);
    } catch {
      // keep empty, show fallback
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const filtered   = waiverTargets.filter(t => filter === 'ALL' || t.action.toUpperCase() === filter);
  const highCount  = waiverTargets.filter(t => t.priority === 'high').length;
  const addCount   = waiverTargets.filter(t => t.action === 'add').length;
  const dropCount  = waiverTargets.filter(t => t.action === 'drop').length;
  const streamCount = waiverTargets.filter(t => t.action === 'stream').length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Add/Drop Advisor</Text>
          <View style={styles.alertBadge}>
            <Text variant="labelSmall" style={{ color: colors.coral }}>{highCount}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>WAIVER{'\n'}WIRE.</Text>
            <View style={styles.subtitleRow}>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Live trending players from Sleeper — AI-ranked adds, drops, and streamers.
              </Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text variant="caption" style={{ color: colors.green }}>LIVE</Text>
              </View>
            </View>
          </Animated.View>

          {/* Summary pills */}
          <Animated.View style={[styles.summaryRow, heroStyle]}>
            {[
              { label: 'ADDS',    count: addCount,    color: colors.green },
              { label: 'DROPS',   count: dropCount,   color: colors.coral },
              { label: 'STREAMS', count: streamCount, color: colors.gold },
            ].map(s => (
              <View key={s.label} style={[styles.summaryPill, { borderColor: `${s.color}30`, backgroundColor: `${s.color}0C` }]}>
                {dataLoading
                  ? <ActivityIndicator size="small" color={s.color} />
                  : <Text variant="h3" style={{ color: s.color }}>{s.count}</Text>
                }
                <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.8 }}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {(['ALL', 'ADD', 'DROP', 'STREAM'] as FilterTab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text
                  variant="labelSmall"
                  style={{ color: filter === tab ? colors.textPrimary : colors.textTertiary, letterSpacing: 0.6 }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cards */}
          {dataLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                Fetching live Sleeper data…
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            filtered.map((target, i) => (
              <WaiverCard key={target.id} target={target} index={i} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                No {filter.toLowerCase()} recommendations right now.
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width:           36,
    height:          36,
    borderRadius:    radius.sm,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  alertBadge: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: `${colors.coral}18`,
    borderWidth:     1,
    borderColor:     `${colors.coral}40`,
    alignItems:      'center',
    justifyContent:  'center',
  },

  title: {
    ...typography.h1,
    fontSize:     44,
    lineHeight:   46,
    color:        colors.textPrimary,
    marginTop:    spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
    marginBottom:  spacing.xl,
  },
  subtitle: {
    flex:       1,
    lineHeight: 22,
  },
  livePill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:    radius.full,
    backgroundColor: `${colors.green}12`,
    borderWidth:     1,
    borderColor:     `${colors.green}30`,
    marginTop:       2,
  },
  liveDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },

  summaryRow: {
    flexDirection: 'row',
    gap:           spacing.md,
    marginBottom:  spacing.xl,
  },
  summaryPill: {
    flex:            1,
    alignItems:      'center',
    borderWidth:     1,
    borderRadius:    radius.lg,
    paddingVertical: spacing.md,
    gap:             4,
  },

  filterRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  filterTab: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: spacing.sm,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor:     colors.textTertiary,
  },

  loadingBox: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap:        spacing.md,
  },
  emptyEmoji:   { fontSize: 36 },
  bottomSpacer: { height: spacing.xl },
});

const card = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.md,
    marginBottom:    spacing.md,
    overflow:        'hidden',
  },
  top: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  actionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical:   3,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  priorityDot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  scoreBox: {
    alignItems: 'center',
    gap:        2,
  },

  playerRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  injuryTag: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    backgroundColor:   `${colors.coral}15`,
  },
  statsCol: {
    alignItems: 'flex-end',
    gap:        4,
  },

  reason: { lineHeight: 18 },
  aiTake: {
    backgroundColor: `${colors.green}0A`,
    borderWidth:     1,
    borderColor:     `${colors.green}25`,
    borderRadius:    radius.md,
    padding:         spacing.md,
  },
  dropSuggestion: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
});

const pos_ = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
    minWidth:          32,
    alignItems:        'center',
  },
});

const trend_ = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },
});
