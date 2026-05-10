import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
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
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { canAccess } from '@constants/tiers';
import { useUserStore } from '@store/useUserStore';

// ─── Mock data ────────────────────────────────────────────────────────────────

type Action = 'add' | 'drop' | 'stream';
type Priority = 'high' | 'medium' | 'low';
type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

interface WaiverTarget {
  id:         string;
  name:       string;
  team:       string;
  pos:        Pos;
  owned:      number;    // % owned
  trend:      number;    // +/- adds this week
  score:      number;
  action:     Action;
  priority:   Priority;
  reason:     string;
  aiTake:     string;
  dropsFor?:  string;    // suggested drop pairing
  byeWeek:    number;
  injury?:    string;
}

const MOCK_WAIVER: WaiverTarget[] = [
  {
    id: '1',
    name: 'Tyjae Spears',
    team: 'TEN',
    pos: 'RB',
    owned: 38,
    trend: +1840,
    score: 72,
    action: 'add',
    priority: 'high',
    reason: 'Derrick Henry out 2–3 weeks. Spears becomes the lead back.',
    aiTake: 'Immediate RB2 value. Start in all formats this week.',
    dropsFor: 'Cam Akers',
    byeWeek: 6,
  },
  {
    id: '2',
    name: 'Romeo Doubs',
    team: 'GB',
    pos: 'WR',
    owned: 52,
    trend: +620,
    score: 68,
    action: 'add',
    priority: 'high',
    reason: 'Christian Watson on IR. Doubs is now the WR1 target share in GB.',
    aiTake: 'WR2 upside with Love targeting him 8+ times per game.',
    dropsFor: 'Tyler Boyd',
    byeWeek: 6,
  },
  {
    id: '3',
    name: 'Jonnu Smith',
    team: 'MIA',
    pos: 'TE',
    owned: 14,
    trend: +980,
    score: 64,
    action: 'add',
    priority: 'medium',
    reason: 'Durham Smythe injured. Smith step into TE1 role in Tua\'s offense.',
    aiTake: 'Streamer with upside. MIA faces a soft TE matchup this week.',
    dropsFor: 'Irv Smith Jr.',
    byeWeek: 10,
  },
  {
    id: '4',
    name: 'Elijah Moore',
    team: 'CLE',
    pos: 'WR',
    owned: 22,
    trend: +410,
    score: 59,
    action: 'stream',
    priority: 'medium',
    reason: 'Faces league-worst pass defense. CLE projects for 35+ pass attempts.',
    aiTake: 'One-week streamer only. Sell after favorable matchup.',
    byeWeek: 5,
  },
  {
    id: '5',
    name: 'Gus Edwards',
    team: 'LAC',
    pos: 'RB',
    owned: 61,
    trend: +210,
    score: 66,
    action: 'add',
    priority: 'medium',
    reason: 'J.K. Dobbins listed doubtful. Edwards likely to see 15+ touches.',
    aiTake: 'Solid handcuff with standalone value if Dobbins misses.',
    dropsFor: 'Boston Scott',
    byeWeek: 5,
  },
  {
    id: '6',
    name: 'Demario Douglas',
    team: 'NE',
    pos: 'WR',
    owned: 9,
    trend: +1200,
    score: 61,
    action: 'add',
    priority: 'low',
    reason: 'Racking up slot targets in NE. JuJu Smith-Schuster lost for season.',
    aiTake: 'Deep league add. Volume-based upside only.',
    byeWeek: 14,
  },
  {
    id: '7',
    name: 'Cam Akers',
    team: 'MIN',
    pos: 'RB',
    owned: 48,
    trend: -680,
    score: 40,
    action: 'drop',
    priority: 'high',
    reason: 'Aaron Jones is fully healthy. Akers is now in a timeshare with 0 upside.',
    aiTake: 'Drop him. His window as a starter has closed.',
    byeWeek: 6,
  },
  {
    id: '8',
    name: 'Tyler Boyd',
    team: 'CIN',
    pos: 'WR',
    owned: 55,
    trend: -320,
    score: 45,
    action: 'drop',
    priority: 'medium',
    reason: 'Tee Higgins returned healthy. Boyd back to 4th in CIN target pecking order.',
    aiTake: 'Replaceable by waiver adds with better upside.',
    byeWeek: 7,
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

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
  const label = up ? `+${trend.toLocaleString()}` : trend.toLocaleString();
  return (
    <View style={trend_.wrap}>
      <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
      <Text variant="caption" style={{ color }}>{label}</Text>
    </View>
  );
}

function WaiverCard({ target, index }: { target: WaiverTarget; index: number }) {
  const accentColor = ACTION_COLORS[target.action];

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
              <Text variant="caption" color={colors.textTertiary}>{target.team} · Bye {target.byeWeek}</Text>
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

        {/* AI Take */}
        <View style={card.aiTake}>
          <Text variant="labelSmall" color={colors.green} style={{ letterSpacing: 0.8 }}>AI TAKE</Text>
          <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4, lineHeight: 18 }}>
            {target.aiTake}
          </Text>
        </View>

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
  const tier = useUserStore(s => s.tier);
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const filtered = MOCK_WAIVER.filter(t => {
    if (filter === 'ALL') return true;
    return t.action.toUpperCase() === filter;
  });

  const highCount = MOCK_WAIVER.filter(t => t.priority === 'high').length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Add/Drop Advisor</Text>
          <View style={[styles.alertBadge]}>
            <Text variant="labelSmall" style={{ color: colors.coral }}>{highCount}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>WAIVER{'\n'}WIRE.</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              AI-ranked adds, drops, and streamers — updated every Tuesday morning.
            </Text>
          </Animated.View>

          {/* Summary pills */}
          <Animated.View style={[styles.summaryRow, heroStyle]}>
            {[
              { label: 'ADDS',    count: MOCK_WAIVER.filter(t => t.action === 'add').length,    color: colors.green },
              { label: 'DROPS',   count: MOCK_WAIVER.filter(t => t.action === 'drop').length,   color: colors.coral },
              { label: 'STREAMS', count: MOCK_WAIVER.filter(t => t.action === 'stream').length, color: colors.gold },
            ].map(s => (
              <View key={s.label} style={[styles.summaryPill, { borderColor: `${s.color}30`, backgroundColor: `${s.color}0C` }]}>
                <Text variant="h3" style={{ color: s.color }}>{s.count}</Text>
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
          {filtered.map((target, i) => (
            <WaiverCard key={target.id} target={target} index={i} />
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                No {filter.toLowerCase()} recommendations this week.
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
  subtitle: {
    lineHeight:   22,
    marginBottom: spacing.xl,
  },

  summaryRow: {
    flexDirection:  'row',
    gap:            spacing.md,
    marginBottom:   spacing.xl,
  },
  summaryPill: {
    flex:           1,
    alignItems:     'center',
    borderWidth:    1,
    borderRadius:   radius.lg,
    paddingVertical: spacing.md,
    gap:            4,
  },

  filterRow: {
    flexDirection:  'row',
    gap:            spacing.sm,
    marginBottom:   spacing.lg,
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

  emptyState: {
    alignItems:   'center',
    paddingTop:   spacing['2xl'],
    gap:          spacing.md,
  },
  emptyEmoji: { fontSize: 36 },

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

  reason: {
    lineHeight: 18,
  },
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
