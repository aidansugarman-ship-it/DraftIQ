import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { sleeper, SleeperPlayer } from '@services/sleeper';
import { espn, EspnInjury } from '@services/espn';
import { gemini } from '@services/gemini';
import { router } from 'expo-router';
import { useUserStore } from '@store/useUserStore';
import { SPORTS, type SportId } from '@constants/sports';
import { SportSwitcher } from '@components/ui/SportSwitcher';
import { SportTint } from '@components/shared/SportTint';
import { EmptyState } from '@components/shared/EmptyState';
import { TeamLogo } from '@components/shared/TeamLogo';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type InjuryStatus = 'OUT' | 'DOUBTFUL' | 'QUESTIONABLE' | 'LIMITED' | 'FULL';
type Pos          = string;
type ImpactLevel  = 'critical' | 'high' | 'medium' | 'low';

interface InjuryReport {
  id:        string;
  name:      string;
  team:      string;
  pos:       Pos;
  status:    InjuryStatus;
  injury:    string;
  bodyPart:  string;
  impact:    ImpactLevel;
  timeline:  string;
  owned:     number;
  aiTake:    string;
  handcuff?: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FANTASY_POS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);

const STATUS_ORDER: Record<InjuryStatus, number> = {
  OUT: 0, DOUBTFUL: 1, QUESTIONABLE: 2, LIMITED: 3, FULL: 4,
};

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

const POS_COLORS: Record<string, string> = {
  QB:  colors.coral,
  RB:  colors.green,
  WR:  colors.blue,
  TE:  colors.gold,
  K:   colors.textTertiary,
  DEF: colors.purple,
};
const posColor = (pos: string): string => POS_COLORS[pos] ?? colors.textSecondary;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeStatus(s: string): InjuryStatus {
  const l = s.toLowerCase();
  if (l === 'ir' || l.includes('injured reserve') || l.includes('pup') || l === 'out') return 'OUT';
  if (l.includes('doubt')) return 'DOUBTFUL';
  if (l.includes('quest')) return 'QUESTIONABLE';
  if (l.includes('limit') || l === 'lp') return 'LIMITED';
  return 'QUESTIONABLE';
}

function rankToImpact(rank: number): ImpactLevel {
  if (rank < 30)  return 'critical';
  if (rank < 100) return 'high';
  if (rank < 250) return 'medium';
  return 'low';
}

function statusToTimeline(s: string): string {
  const l = s.toLowerCase();
  if (l === 'ir' || l.includes('injured reserve')) return 'Season-ending';
  if (l.includes('pup'))   return 'Out until Week 5+';
  if (l === 'out')         return 'Week-to-week';
  if (l.includes('doubt')) return '1–2 weeks';
  if (l.includes('quest')) return 'Day-to-day';
  if (l.includes('limit')) return 'Day-to-day';
  return 'TBD';
}

function estimateOwnership(rank: number | null): number {
  if (!rank) return 5;
  if (rank < 10)  return 96;
  if (rank < 30)  return 88;
  if (rank < 75)  return 72;
  if (rank < 150) return 54;
  if (rank < 300) return 30;
  return 12;
}

function safePos(pos: string): Pos {
  return (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(pos) ? pos : 'WR') as Pos;
}

function buildReportsFromEspn(injuries: EspnInjury[]): InjuryReport[] {
  return injuries
    .filter(i => i.athlete && i.status)
    .map((i): InjuryReport => {
      const pos = i.athlete.position?.abbreviation ?? '—';
      const detail = i.details;
      const injuryText = i.shortComment
        || [detail?.type, detail?.location, detail?.side].filter(Boolean).join(' ')
        || i.type
        || 'Undisclosed';
      const timeline = detail?.returnDate
        ? `Return: ${new Date(detail.returnDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : statusToTimeline(i.status);
      return {
        id:        `${i.athlete.id}-${i.id}`,
        name:      i.athlete.fullName || i.athlete.displayName,
        team:      i.athlete.team?.abbreviation ?? '—',
        pos,
        status:    normalizeStatus(i.status),
        injury:    injuryText,
        bodyPart:  detail?.location ?? 'Undisclosed',
        impact:    'medium',
        timeline,
        owned:     30,
        aiTake:    '',
        updatedAt: 'Live',
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    .slice(0, 40);
}

function buildReports(players: Record<string, SleeperPlayer>): InjuryReport[] {
  return Object.values(players)
    .filter(p =>
      p.injury_status &&
      FANTASY_POS.has(p.position) &&
      p.search_rank !== null &&
      p.search_rank < 500 &&
      p.team !== null,
    )
    .map((p): InjuryReport => ({
      id:        p.player_id,
      name:      p.full_name || `${p.first_name} ${p.last_name}`,
      team:      p.team || 'FA',
      pos:       safePos(p.position),
      status:    normalizeStatus(p.injury_status!),
      injury:    p.injury_notes || p.injury_body_part || p.injury_status || 'Undisclosed',
      bodyPart:  p.injury_body_part || 'Undisclosed',
      impact:    rankToImpact(p.search_rank!),
      timeline:  statusToTimeline(p.injury_status!),
      owned:     estimateOwnership(p.search_rank),
      aiTake:    '',
      updatedAt: 'Live',
    }))
    .sort((a, b) => {
      const impactOrder: Record<ImpactLevel, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDiff !== 0) return statusDiff;
      return impactOrder[a.impact] - impactOrder[b.impact];
    })
    .slice(0, 40);
}

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
  const color = posColor(pos);
  return (
    <View style={[posStyle.badge, { backgroundColor: `${color}18` }]}>
      <Text variant="labelSmall" style={{ color }}>{pos}</Text>
    </View>
  );
}

function InjuryCard({ report, index }: { report: InjuryReport; index: number }) {
  const sport                         = useUserStore((s) => s.currentSport);
  const impactColor                   = IMPACT_COLORS[report.impact];
  const [aiTake, setAiTake]           = useState('');
  const [aiLoading, setAiLoading]     = useState(false);

  useEffect(() => {
    setAiLoading(true);
    gemini.injuryImpact(report.name, `${report.status} — ${report.injury} (${report.timeline})`, SPORTS[sport].shortLabel)
      .then(setAiTake)
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [report.id, sport]);

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
            <PlayerAvatar sport={sport} id={report.id.split('-')[0]} name={report.name} size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <PosBadge pos={report.pos} />
                <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                  {report.name}
                </Text>
              </View>
            </View>
          </View>
          <StatusPill status={report.status} />
        </View>

        {/* Meta */}
        <View style={icard.meta}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TeamLogo sport={sport} team={report.team} size={12} />
            <Text variant="caption" color={colors.textTertiary}>{report.team} · {report.injury}</Text>
          </View>
          <View style={icard.liveBadge}>
            <View style={icard.liveDot} />
            <Text variant="caption" style={{ color: colors.green }}>LIVE</Text>
          </View>
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
            <Text variant="bodySmallMedium" color={colors.textPrimary}>~{report.owned}%</Text>
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
            : aiTake
              ? <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4, lineHeight: 18 }}>{aiTake}</Text>
              : null
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
  const sport                         = useUserStore((s) => s.currentSport);
  const sportDef                      = SPORTS[sport];
  const [filter, setFilter]           = useState<FilterTab>('ALL');
  const [injuries, setInjuries]       = useState<InjuryReport[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadInjuries = useCallback(async (sportId: SportId) => {
    setDataLoading(true);
    try {
      if (sportId === 'nfl') {
        const players = await sleeper.getAllPlayers();
        setInjuries(buildReports(players));
      } else {
        const espnInjuries = await espn.injuries(sportId);
        setInjuries(buildReportsFromEspn(espnInjuries));
      }
    } catch {
      setInjuries([]);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadInjuries(sport); }, [loadInjuries, sport]);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const filtered  = injuries.filter(r => filter === 'ALL' || r.status === filter);
  const critCount = injuries.filter(r => r.impact === 'critical').length;
  const outCount  = injuries.filter(r => r.status === 'OUT').length;
  const dbtCount  = injuries.filter(r => r.status === 'DOUBTFUL').length;
  const qstCount  = injuries.filter(r => r.status === 'QUESTIONABLE').length;

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
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
            <View style={styles.subtitleRow}>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Live {sportDef.shortLabel} injury statuses — AI fantasy impact for each.
              </Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text variant="caption" style={{ color: colors.green }}>LIVE</Text>
              </View>
            </View>
          </Animated.View>

          {/* Summary pills */}
          <Animated.View style={[styles.summaryRow, heroStyle]}>
            {([
              { status: 'OUT',          color: colors.coral,  count: outCount },
              { status: 'DOUBTFUL',     color: '#FF7A4A',     count: dbtCount },
              { status: 'QUESTIONABLE', color: colors.gold,   count: qstCount },
            ] as const).map(s => (
              <View key={s.status} style={[styles.summaryPill, { borderColor: `${s.color}30`, backgroundColor: `${s.color}0A` }]}>
                {dataLoading
                  ? <ActivityIndicator size="small" color={s.color} />
                  : <Text variant="h3" style={{ color: s.color }}>{s.count}</Text>
                }
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

          {/* Cards */}
          {dataLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                Loading live injury data…
              </Text>
            </View>
          ) : filtered.length > 0 ? (
            filtered.map((report, i) => (
              <InjuryCard key={report.id} report={report} index={i} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏥</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                No players with {filter} status right now.
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
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      radius.full,
    backgroundColor:   `${colors.green}12`,
    borderWidth:       1,
    borderColor:       `${colors.green}30`,
    marginTop:         2,
  },
  liveDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
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
    gap:           spacing.xs,
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
  liveBadge: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  liveDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.green,
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
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 9,
    paddingVertical:   3,
    borderRadius:      radius.full,
    borderWidth:       1,
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
