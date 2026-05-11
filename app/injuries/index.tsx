import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { gemini } from '@services/gemini';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// ─── Mock data ────────────────────────────────────────────────────────────────

type InjuryStatus = 'OUT' | 'DOUBTFUL' | 'QUESTIONABLE' | 'LIMITED' | 'FULL';
type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';
type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';

interface InjuryReport {
  id:         string;
  name:       string;
  team:       string;
  pos:        Pos;
  status:     InjuryStatus;
  injury:     string;
  bodyPart:   string;
  impact:     ImpactLevel;
  timeline:   string;
  owned:      number;
  aiTake:     string;
  handcuff?:  string;
  updatedAt:  string;
}

const MOCK_INJURIES: InjuryReport[] = [
  {
    id: '1',
    name: 'Derrick Henry',
    team: 'BAL',
    pos: 'RB',
    status: 'OUT',
    injury: 'Hamstring strain',
    bodyPart: 'Hamstring',
    impact: 'critical',
    timeline: '2–3 weeks',
    owned: 94,
    aiTake: 'Start Justice Hill and Gus Edwards immediately. Henry is done for the month.',
    handcuff: 'Justice Hill',
    updatedAt: '2h ago',
  },
  {
    id: '2',
    name: 'Christian Watson',
    team: 'GB',
    pos: 'WR',
    status: 'OUT',
    injury: 'Hamstring (IR)',
    bodyPart: 'Hamstring',
    impact: 'critical',
    timeline: 'Season-ending',
    owned: 72,
    aiTake: 'Romeo Doubs and Jayden Reed are the clear beneficiaries. Add both immediately.',
    handcuff: 'Romeo Doubs',
    updatedAt: '1d ago',
  },
  {
    id: '3',
    name: 'JuJu Smith-Schuster',
    team: 'NE',
    pos: 'WR',
    status: 'OUT',
    injury: 'Knee (IR)',
    bodyPart: 'Knee',
    impact: 'high',
    timeline: 'Season-ending',
    owned: 41,
    aiTake: 'Demario Douglas absorbs the slot targets. Deep league add only.',
    handcuff: 'Demario Douglas',
    updatedAt: '1d ago',
  },
  {
    id: '4',
    name: 'J.K. Dobbins',
    team: 'LAC',
    pos: 'RB',
    status: 'DOUBTFUL',
    injury: 'Ankle sprain',
    bodyPart: 'Ankle',
    impact: 'high',
    timeline: '1–2 weeks',
    owned: 68,
    aiTake: 'Gus Edwards is the handcuff. Start him as RB2 this week if Dobbins is out.',
    handcuff: 'Gus Edwards',
    updatedAt: '4h ago',
  },
  {
    id: '5',
    name: 'Tee Higgins',
    team: 'CIN',
    pos: 'WR',
    status: 'QUESTIONABLE',
    injury: 'Hamstring tightness',
    bodyPart: 'Hamstring',
    impact: 'medium',
    timeline: 'Day-to-day',
    owned: 85,
    aiTake: 'Monitor practice reports Thursday/Friday. If he\'s limited, consider a streamer.',
    updatedAt: '6h ago',
  },
  {
    id: '6',
    name: 'Mark Andrews',
    team: 'BAL',
    pos: 'TE',
    status: 'QUESTIONABLE',
    injury: 'Shoulder',
    bodyPart: 'Shoulder',
    impact: 'medium',
    timeline: 'Day-to-day',
    owned: 88,
    aiTake: 'He practiced limited Wednesday. 60/40 to play. Have Isaiah Likely ready.',
    handcuff: 'Isaiah Likely',
    updatedAt: '3h ago',
  },
  {
    id: '7',
    name: 'Durham Smythe',
    team: 'MIA',
    pos: 'TE',
    status: 'OUT',
    injury: 'Knee',
    bodyPart: 'Knee',
    impact: 'medium',
    timeline: '4–6 weeks',
    owned: 8,
    aiTake: 'Jonnu Smith is the direct beneficiary. Add in TE-needy leagues.',
    handcuff: 'Jonnu Smith',
    updatedAt: '12h ago',
  },
  {
    id: '8',
    name: 'Boston Scott',
    team: 'PHI',
    pos: 'RB',
    status: 'LIMITED',
    injury: 'Rib contusion',
    bodyPart: 'Ribs',
    impact: 'low',
    timeline: 'Day-to-day',
    owned: 12,
    aiTake: 'Low-end handcuff. No fantasy value unless D\'Andre Swift also gets hurt.',
    updatedAt: '8h ago',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<InjuryStatus, string> = {
  OUT:          colors.coral,
  DOUBTFUL:     '#FF7A4A',
  QUESTIONABLE: colors.gold,
  LIMITED:      '#9CA3AF',
  FULL:         colors.green,
};

const IMPACT_COLORS: Record<ImpactLevel, string> = {
  critical: colors.coral,
  high:     '#FF7A4A',
  medium:   colors.gold,
  low:      colors.textTertiary,
};

const IMPACT_LABELS: Record<ImpactLevel, string> = {
  critical: 'CRITICAL',
  high:     'HIGH',
  medium:   'MEDIUM',
  low:      'LOW',
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

type FilterTab = 'ALL' | 'OUT' | 'DOUBTFUL' | 'QUESTIONABLE';

function StatusPill({ status }: { status: InjuryStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <View style={[statusStyle.pill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <View style={[statusStyle.dot, { backgroundColor: color }]} />
      <Text variant="labelSmall" style={{ color }}>{status}</Text>
    </View>
  );
}

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <View style={[posStyle.badge, { backgroundColor: `${POS_COLORS[pos]}18` }]}>
      <Text variant="labelSmall" style={{ color: POS_COLORS[pos] }}>{pos}</Text>
    </View>
  );
}

function InjuryCard({ report, index }: { report: InjuryReport; index: number }) {
  const impactColor = IMPACT_COLORS[report.impact];
  const [aiTake, setAiTake] = useState(report.aiTake);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    setAiLoading(true);
    gemini.injuryImpact(report.name, `${report.status} — ${report.injury} (${report.timeline})`, 'NFL')
      .then(setAiTake)
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [report.name]);

  const op = useSharedValue(0);
  const ty = useSharedValue(10);
  useEffect(() => {
    op.value = withDelay(index * 55, withTiming(1, { duration: 350 }));
    ty.value = withDelay(index * 55, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={anim}>
      <View style={[icard.wrap, { borderLeftColor: STATUS_COLORS[report.status] }]}>

        {/* Top */}
        <View style={icard.top}>
          <View style={icard.topLeft}>
            <PosBadge pos={report.pos} />
            <Text variant="bodyMedium" color={colors.textPrimary}>{report.name}</Text>
          </View>
          <StatusPill status={report.status} />
        </View>

        {/* Meta */}
        <View style={icard.meta}>
          <Text variant="caption" color={colors.textTertiary}>{report.team} · {report.injury}</Text>
          <Text variant="caption" color={colors.textTertiary}>Updated {report.updatedAt}</Text>
        </View>

        {/* Stats row */}
        <View style={icard.statsRow}>
          <View style={icard.statItem}>
            <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>TIMELINE</Text>
            <Text variant="bodySmallMedium" color={colors.textPrimary}>{report.timeline}</Text>
          </View>
          <View style={icard.statDivider} />
          <View style={icard.statItem}>
            <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>OWNED</Text>
            <Text variant="bodySmallMedium" color={colors.textPrimary}>{report.owned}%</Text>
          </View>
          <View style={icard.statDivider} />
          <View style={icard.statItem}>
            <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>IMPACT</Text>
            <Text variant="bodySmallMedium" style={{ color: impactColor }}>
              {IMPACT_LABELS[report.impact]}
            </Text>
          </View>
        </View>

        {/* AI Take */}
        <View style={icard.aiTake}>
          <Text variant="labelSmall" color={colors.green} style={{ letterSpacing: 0.8 }}>AI TAKE</Text>
          {aiLoading
            ? <ActivityIndicator size="small" color={colors.green} style={{ marginTop: 6 }} />
            : <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4, lineHeight: 18 }}>{aiTake}</Text>
          }
        </View>

        {/* Handcuff */}
        {report.handcuff && (
          <View style={icard.handcuff}>
            <Ionicons name="link-outline" size={13} color={colors.gold} />
            <Text variant="caption" color={colors.textTertiary}>
              Handcuff: <Text variant="caption" style={{ color: colors.gold }}>{report.handcuff}</Text>
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function InjuriesScreen() {
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const filtered = MOCK_INJURIES.filter(r => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const critCount = MOCK_INJURIES.filter(r => r.impact === 'critical').length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Injury Tracker</Text>
          <View style={styles.critBadge}>
            <Text variant="labelSmall" style={{ color: colors.coral }}>{critCount}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>INJURY{'\n'}REPORT.</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Real-time status updates with AI fantasy impact analysis.
            </Text>
          </Animated.View>

          {/* Summary */}
          <Animated.View style={[styles.summaryRow, heroStyle]}>
            {([
              { status: 'OUT',          color: colors.coral,        count: MOCK_INJURIES.filter(r => r.status === 'OUT').length },
              { status: 'DOUBTFUL',     color: '#FF7A4A',           count: MOCK_INJURIES.filter(r => r.status === 'DOUBTFUL').length },
              { status: 'QUESTIONABLE', color: colors.gold,         count: MOCK_INJURIES.filter(r => r.status === 'QUESTIONABLE').length },
            ] as const).map(s => (
              <View key={s.status} style={[styles.summaryPill, { borderColor: `${s.color}30`, backgroundColor: `${s.color}0A` }]}>
                <Text variant="h3" style={{ color: s.color }}>{s.count}</Text>
                <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6, textAlign: 'center' }}>
                  {s.status}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Filter */}
          <View style={styles.filterRow}>
            {(['ALL', 'OUT', 'DOUBTFUL', 'QUESTIONABLE'] as FilterTab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                onPress={() => setFilter(tab)}
                activeOpacity={0.7}
              >
                <Text
                  variant="labelSmall"
                  style={{ color: filter === tab ? colors.textPrimary : colors.textTertiary, letterSpacing: 0.5 }}
                  numberOfLines={1}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Report cards */}
          {filtered.map((report, i) => (
            <InjuryCard key={report.id} report={report} index={i} />
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏥</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                No players with {filter} status.
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
  critBadge: {
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
    gap:            spacing.xs,
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
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap:        spacing.md,
  },
  emptyEmoji: { fontSize: 36 },
  bottomSpacer: { height: spacing.xl },
});

const icard = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.md,
    marginBottom:    spacing.md,
  },
  top: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  meta: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },

  statsRow: {
    flexDirection:   'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  statItem: {
    flex:    1,
    padding: spacing.md,
    gap:     4,
  },
  statDivider: {
    width:           1,
    backgroundColor: colors.border,
  },

  aiTake: {
    backgroundColor: `${colors.green}0A`,
    borderWidth:     1,
    borderColor:     `${colors.green}22`,
    borderRadius:    radius.md,
    padding:         spacing.md,
  },
  handcuff: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
});

const statusStyle = StyleSheet.create({
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingHorizontal: 9,
    paddingVertical:  3,
    borderRadius:    radius.full,
    borderWidth:     1,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
});

const posStyle = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
    minWidth:          32,
    alignItems:        'center',
  },
});
