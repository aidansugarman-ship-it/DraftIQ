import { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useUserStore } from '@store/useUserStore';
import { SPORTS, type SportId } from '@constants/sports';
import { sleeper } from '@services/sleeper';
import { espn } from '@services/espn';
import { JargonTip, JARGON } from '@components/ui/JargonTip';
import { canAccess } from '@constants/tiers';
import { gemini } from '@services/gemini';
import { useGeminiTake } from '@hooks/useGeminiTake';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Mock player data ─────────────────────────────────────────────────────────

const MOCK_PLAYER = {
  id:          '8',
  name:        'Josh Allen',
  firstName:   'Josh',
  lastName:    'Allen',
  position:    'QB',
  team:        'Buffalo Bills',
  teamAbbrev:  'BUF',
  age:         28,
  experience:  6,
  jerseyNumber: '17',
  injuryStatus: 'questionable' as const,
  injuryNote:  'Limited in practice Wed–Thu with shoulder issue. Expected to play Sunday.',
  injuryBodyPart: 'Shoulder',
  fantasyScore: 91,
  adp:         7.0,
  adpTrend:    'stable' as const,
  adpTrendSpots: 0,
  ownership:   98.2,
  contractYear: false,
  contractYearsRemaining: 3,
  impliedTeamTotal: 27.5,
  gameOverUnder: 51.0,

  aiAnalysis: {
    whyDraft:
      'Allen is the single most valuable fantasy asset at QB. His dual-threat ability gives him a 10–15 point floor even when passing is limited. In a Bills offense built around him, his upside is uncapped — 350+ yards and 3 TDs in good matchups. He carries elite-tier value through the entire season.',
    whyAvoid:
      'The shoulder concern is real — any significant injury dramatically tanks his value. He\'s also a late-round pick in most formats (5–8 range), meaning you\'re giving up elite positional advantage early. If you miss him, there\'s no comparable replacement on the wire.',
    injuryRiskLevel: 'medium' as const,
    injuryRiskNote:  'Shoulder injuries in QBs can linger and affect throw power. Monitor practice reports.',
    schemeFit:       'Kellen Moore\'s play-action heavy scheme maximizes Allen\'s arm talent and keeps his rush attempts efficient.',
    upside:          10,
    floor:           8,
    confidenceScore: 88,
    generatedAt:     new Date().toISOString(),
    newsHash:        'abc123',
  },

  recentNews: [
    {
      id: 'n1',
      headline: 'Allen limited in practice Wednesday',
      body: 'Josh Allen was limited Wednesday with a shoulder issue. The Bills are being cautious but expect him available for Sunday\'s game against Miami.',
      source: 'NFL.com',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      fantasyImpact: 'negative' as const,
      aiAnalysis: 'Monitor through the week — likely plays but worth having a streaming backup.',
    },
    {
      id: 'n2',
      headline: 'Bills favored by 4.5 vs Dolphins',
      body: 'Buffalo enters Sunday as 4.5-point home favorites. O/U set at 51, implying a 27.5 implied team total for the Bills.',
      source: 'Vegas Insider',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      fantasyImpact: 'positive' as const,
      aiAnalysis: 'Strong implied total. Bills expected to score — great Allen game environment.',
    },
  ],

  recentPerformance: [
    { week: 11, opponent: 'KC',  isHome: false, fantasyPoints: 32.4, stats: { pass_yds: 315, pass_td: 2, rush_yds: 42, rush_td: 1 } },
    { week: 10, opponent: 'IND', isHome: true,  fantasyPoints: 28.1, stats: { pass_yds: 289, pass_td: 3, rush_yds: 18, rush_td: 0 } },
    { week: 9,  opponent: 'NE',  isHome: true,  fantasyPoints: 41.2, stats: { pass_yds: 362, pass_td: 4, rush_yds: 55, rush_td: 1 } },
    { week: 8,  opponent: 'SEA', isHome: false, fantasyPoints: 18.6, stats: { pass_yds: 244, pass_td: 1, rush_yds: 28, rush_td: 0 } },
    { week: 7,  opponent: 'TEN', isHome: true,  fantasyPoints: 35.7, stats: { pass_yds: 331, pass_td: 3, rush_yds: 61, rush_td: 1 } },
  ],

  upcomingSchedule: [
    { week: 12, opponent: 'MIA', opponentAbbrev: 'MIA', isHome: true,  strengthRating: 3, date: '2024-11-24', opponentRank: 28 },
    { week: 13, opponent: 'SF',  opponentAbbrev: 'SF',  isHome: false, strengthRating: 8, date: '2024-12-01', opponentRank: 4 },
    { week: 14, opponent: 'LAR', opponentAbbrev: 'LAR', isHome: true,  strengthRating: 5, date: '2024-12-08', opponentRank: 15 },
    { week: 15, opponent: 'DET', opponentAbbrev: 'DET', isHome: false, strengthRating: 7, date: '2024-12-15', opponentRank: 7 },
  ],
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  healthy:      'HEALTHY',
  questionable: 'QUESTIONABLE',
  doubtful:     'DOUBTFUL',
  out:          'OUT',
  ir:           'IR',
  'day-to-day': 'DAY-TO-DAY',
};

const STATUS_COLOR: Record<string, string> = {
  healthy:      colors.statusHealthy,
  questionable: colors.statusQuestionable,
  doubtful:     colors.statusDoubtful,
  out:          colors.statusOut,
  ir:           colors.statusIR,
  'day-to-day': colors.statusQuestionable,
};

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const pct = score / 100;
  const color = score >= 90 ? colors.green : score >= 75 ? colors.gold : colors.coral;

  return (
    <View style={gaugeStyles.wrap}>
      <Text style={[gaugeStyles.number, { color }]}>{score}</Text>
      <Text variant="caption" color={colors.textTertiary}>AI SCORE</Text>
      <View style={gaugeStyles.bar}>
        <View style={[gaugeStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent, definition }: { label: string; value: string; accent?: string; definition?: string }) {
  return (
    <View style={statStyles.pill}>
      <Text style={[statStyles.value, { color: accent ?? colors.textPrimary }]}>{value}</Text>
      {definition ? (
        <JargonTip term={label} definition={definition}>
          <Text variant="caption" color={colors.textTertiary}>{label}</Text>
        </JargonTip>
      ) : (
        <Text variant="caption" color={colors.textTertiary}>{label}</Text>
      )}
    </View>
  );
}

// ─── Performance Bar ──────────────────────────────────────────────────────────

function PerfBar({ week, opponent, isHome, pts, max, delay }: {
  week: number; opponent: string; isHome: boolean; pts: number; max: number; delay: number;
}) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(delay, withTiming(pts / max, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, []);
  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  const color = pts >= 30 ? colors.green : pts >= 20 ? colors.gold : colors.coral;

  return (
    <View style={perfStyles.row}>
      <Text variant="caption" color={colors.textTertiary} style={perfStyles.week}>Wk{week}</Text>
      <Text variant="caption" color={colors.textSecondary} style={perfStyles.opp}>
        {isHome ? 'vs' : '@'} {opponent}
      </Text>
      <View style={perfStyles.barBg}>
        <Animated.View style={[perfStyles.barFill, barStyle, { backgroundColor: color }]} />
      </View>
      <Text style={[perfStyles.pts, { color }]}>{pts.toFixed(1)}</Text>
    </View>
  );
}

// ─── Schedule Matchup ─────────────────────────────────────────────────────────

function MatchupBadge({ week, opp, isHome, strength }: {
  week: number; opp: string; isHome: boolean; strength: number;
}) {
  const color = strength <= 3 ? colors.green : strength <= 6 ? colors.gold : colors.coral;
  return (
    <View style={matchStyles.badge}>
      <Text variant="labelSmall" color={colors.textTertiary} style={matchStyles.wk}>WK{week}</Text>
      <Text variant="bodySmallMedium" color={colors.textPrimary}>{isHome ? 'vs' : '@'} {opp}</Text>
      <View style={[matchStyles.dot, { backgroundColor: color }]} />
    </View>
  );
}

// ─── News Card ────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: typeof MOCK_PLAYER.recentNews[number] }) {
  const impactColor = item.fantasyImpact === 'positive' ? colors.green
    : item.fantasyImpact === 'negative' ? colors.coral : colors.textTertiary;

  const hoursAgo = Math.round((Date.now() - new Date(item.publishedAt).getTime()) / 1000 / 3600);

  return (
    <View style={newsStyles.card}>
      <View style={newsStyles.header}>
        <View style={[newsStyles.impactDot, { backgroundColor: impactColor }]} />
        <Text variant="bodySmallMedium" color={colors.textPrimary} style={{ flex: 1 }}>
          {item.headline}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>{hoursAgo}h</Text>
      </View>
      <Text variant="bodySmall" color={colors.textSecondary} style={newsStyles.body}>
        {item.body}
      </Text>
      {item.aiAnalysis && (
        <View style={newsStyles.aiWrap}>
          <Text variant="labelSmall" color={colors.green} style={newsStyles.aiLabel}>AI TAKE</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>{item.aiAnalysis}</Text>
        </View>
      )}
      <Text variant="caption" color={colors.textTertiary} style={newsStyles.source}>
        {item.source}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Tab = 'analysis' | 'stats' | 'schedule' | 'news';

export default function PlayerScreen() {
  // Callers can pass full player info via URL params so we never have to fall back to MOCK_PLAYER.
  const { id, name, team, pos } = useLocalSearchParams<{
    id:    string;
    name?: string;
    team?: string;
    pos?:  string;
  }>();
  const tier        = useUserStore((s) => s.tier);
  const currentSport = useUserStore((s) => s.currentSport);
  const sportLabel  = SPORTS[currentSport].shortLabel;
  const [activeTab, setActiveTab] = useState<Tab>('analysis');

  // Seed with anything the caller passed — beats showing Josh Allen as a fallback.
  const seededMeta: Partial<typeof MOCK_PLAYER> | null = (name || team || pos) ? {
    id:         id ?? 'unknown',
    name:       name ?? 'Unknown player',
    firstName:  name?.split(' ')[0],
    lastName:   name?.split(' ').slice(1).join(' '),
    team:       team ?? 'FA',
    teamAbbrev: team ?? 'FA',
    position:   pos ?? '—',
  } : null;

  // Fetch real player metadata — Sleeper for NFL, ESPN for others. Falls back to URL params.
  const [realMeta, setRealMeta] = useState<Partial<typeof MOCK_PLAYER> | null>(seededMeta);
  useEffect(() => {
    let cancelled = false;
    if (!id) { setRealMeta(null); return; }

    if (currentSport === 'nfl') {
      sleeper.getAllPlayers().then((all) => {
        if (cancelled) return;
        const p = all[id];
        if (!p) { setRealMeta(null); return; }
        setRealMeta({
          id:             p.player_id,
          name:           p.full_name || `${p.first_name} ${p.last_name}`,
          firstName:      p.first_name,
          lastName:       p.last_name,
          position:       p.position,
          team:           p.team ?? 'FA',
          teamAbbrev:     p.team ?? 'FA',
          age:            p.age ?? MOCK_PLAYER.age,
          experience:     p.years_exp ?? MOCK_PLAYER.experience,
          jerseyNumber:   p.number?.toString() ?? MOCK_PLAYER.jerseyNumber,
          injuryStatus:   (p.injury_status?.toLowerCase() as any) ?? 'healthy',
          injuryNote:     p.injury_notes ?? '',
          injuryBodyPart: p.injury_body_part ?? '',
        });
      }).catch(() => setRealMeta(null));
    } else {
      espn.athlete(currentSport, id).then((a) => {
        if (cancelled || !a) { setRealMeta(null); return; }
        setRealMeta({
          id:             a.id,
          name:           a.fullName || a.displayName,
          firstName:      a.fullName?.split(' ')[0],
          lastName:       a.fullName?.split(' ').slice(1).join(' '),
          position:       a.position?.abbreviation ?? '—',
          team:           a.team?.displayName ?? a.team?.abbreviation ?? 'FA',
          teamAbbrev:     a.team?.abbreviation ?? 'FA',
          age:            a.age ?? MOCK_PLAYER.age,
          jerseyNumber:   a.jersey ?? MOCK_PLAYER.jerseyNumber,
          injuryStatus:   (a.status?.name?.toLowerCase() as any) ?? 'healthy',
        });
      }).catch(() => setRealMeta(null));
    }

    return () => { cancelled = true; };
  }, [id, currentSport]);

  const player = useMemo(
    () => realMeta ? { ...MOCK_PLAYER, ...realMeta } : MOCK_PLAYER,
    [realMeta]
  );

  const { take: whyDraft, loading: loadingDraft } = useGeminiTake(
    () => gemini.playerAnalysis(player.name, player.position, player.team, sportLabel),
    [player.name, sportLabel]
  );
  const { take: whyAvoid, loading: loadingAvoid } = useGeminiTake(
    () => gemini.playerAnalysis(
      `Risks and concerns for ${player.name} (${player.position}, ${player.team}) — injury history, schedule, situation`,
      player.position, player.team, sportLabel
    ),
    [player.name, sportLabel]
  );

  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const maxPts = Math.max(...player.recentPerformance.map((p) => p.fantasyPoints));
  const statusColor = STATUS_COLOR[player.injuryStatus];
  const isLocked = !canAccess(tier, 'starter');

  const TABS: { id: Tab; label: string }[] = [
    { id: 'analysis',  label: 'AI Analysis' },
    { id: 'stats',     label: 'Stats' },
    { id: 'schedule',  label: 'Schedule' },
    { id: 'news',      label: 'News' },
  ];

  return (
    <View style={styles.container}>
      {/* Back button outside SafeArea so it sits over gradient */}
      <SafeAreaView style={styles.backSafe} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </SafeAreaView>

      <Animated.View style={[{ flex: 1 }, fadeStyle]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* ── Hero card ──────────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(0,255,135,0.08)', 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <View style={styles.heroTop}>
              <View style={styles.heroInfo}>
                <View style={styles.posRow}>
                  <View style={styles.posTag}>
                    <Text variant="label" color={colors.textTertiary}>{player.position}</Text>
                  </View>
                  <Text variant="bodySmall" color={colors.textTertiary}>#{player.jerseyNumber}</Text>
                </View>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text variant="body" color={colors.textSecondary}>{player.team}</Text>
              </View>
              <ScoreGauge score={player.fantasyScore} />
            </View>

            {/* Injury status */}
            {player.injuryStatus !== 'healthy' && (
              <View style={[styles.injuryBanner, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}10` }]}>
                <View style={[styles.injuryDot, { backgroundColor: statusColor }]} />
                <Text variant="bodySmallMedium" style={{ color: statusColor }}>
                  {STATUS_LABEL[player.injuryStatus]}
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1 }}>
                  {player.injuryNote}
                </Text>
              </View>
            )}

            {/* Quick stats row */}
            <View style={styles.statsRow}>
              <StatPill label="ADP" value={String(player.adp)} definition={JARGON.ADP} />
              <StatPill label="OWNED" value={`${player.ownership}%`} accent={colors.blue} definition="Percentage of fantasy leagues where this player is on a roster. 95%+ means almost everyone owns them; under 20% means they're widely available on the waiver wire." />
              <StatPill label="TEAM TOTAL" value={String(player.impliedTeamTotal)} accent={colors.gold} definition="Vegas-implied points the player's team will score this game. Higher = better scoring environment for fantasy. 25+ is great, under 18 is a bad spot." />
              <StatPill label="O/U" value={String(player.gameOverUnder)} definition="The over/under: Vegas-projected total points for both teams combined. High O/U (50+) means lots of expected scoring, good for fantasy. Low O/U (under 40) suggests a defensive struggle." />
            </View>
          </View>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                style={[styles.tab, activeTab === t.id && styles.tabActive]}
                activeOpacity={0.75}
              >
                <Text
                  variant="bodySmallMedium"
                  color={activeTab === t.id ? colors.green : colors.textTertiary}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Tab content ───────────────────────────────────────────────── */}
          <View style={styles.tabContent}>

            {/* Analysis */}
            {activeTab === 'analysis' && (
              <View style={styles.section}>
                {isLocked ? (
                  <LockedCard onUpgrade={() => router.push('/paywall')} />
                ) : (
                  <>
                    <AIBlock
                      title="WHY DRAFT"
                      body={loadingDraft ? '' : whyDraft}
                      loading={loadingDraft}
                      accent={colors.green}
                      emoji="✅"
                    />
                    <AIBlock
                      title="WHY AVOID"
                      body={loadingAvoid ? '' : whyAvoid}
                      loading={loadingAvoid}
                      accent={colors.coral}
                      emoji="⚠️"
                    />
                    <View style={styles.metricsRow}>
                      <MetricGauge label="UPSIDE" value={player.aiAnalysis.upside} max={10} color={colors.green} />
                      <MetricGauge label="FLOOR"  value={player.aiAnalysis.floor}  max={10} color={colors.blue} />
                      <MetricGauge label="RISK"   value={player.aiAnalysis.injuryRiskLevel === 'low' ? 2 : player.aiAnalysis.injuryRiskLevel === 'medium' ? 5 : 8} max={10} color={colors.coral} />
                    </View>
                    <View style={styles.schemeCard}>
                      <Text variant="labelSmall" color={colors.textTertiary} style={styles.schemeLabel}>
                        SCHEME FIT
                      </Text>
                      <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 18 }}>
                        {player.aiAnalysis.schemeFit}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Stats */}
            {activeTab === 'stats' && (
              <View style={styles.section}>
                {currentSport === 'nfl' ? (
                  <>
                    <Text variant="label" color={colors.textTertiary} style={styles.subLabel}>
                      LAST 5 WEEKS
                    </Text>
                    <View style={styles.perfList}>
                      {player.recentPerformance.map((p, i) => (
                        <PerfBar
                          key={p.week}
                          week={p.week}
                          opponent={p.opponent}
                          isHome={p.isHome}
                          pts={p.fantasyPoints}
                          max={maxPts}
                          delay={i * 60}
                        />
                      ))}
                    </View>
                    <View style={styles.statGrid}>
                      {Object.entries(player.recentPerformance[0].stats).map(([k, v]) => (
                        <View key={k} style={styles.statGridCell}>
                          <Text style={styles.statGridValue}>{v}</Text>
                          <Text variant="caption" color={colors.textTertiary}>
                            {k.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text variant="label" color={colors.textTertiary} style={styles.subLabel}>
                      KEY {sportLabel} STATS
                    </Text>
                    <View style={styles.statGrid}>
                      {SPORTS[currentSport].statLabels.keyStats.map((statName) => (
                        <View key={statName} style={styles.statGridCell}>
                          <Text style={styles.statGridValue}>—</Text>
                          <Text variant="caption" color={colors.textTertiary}>
                            {statName.toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ padding: spacing.md, marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md }}>
                      <Text variant="bodySmall" color={colors.textSecondary} align="center">
                        Real {sportLabel} game logs coming when we wire a proper stats source (next push).
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Schedule */}
            {activeTab === 'schedule' && (
              <View style={styles.section}>
                <Text variant="label" color={colors.textTertiary} style={styles.subLabel}>
                  UPCOMING MATCHUPS
                </Text>
                <View style={styles.matchRow}>
                  {player.upcomingSchedule.map((g) => (
                    <MatchupBadge
                      key={g.week}
                      week={g.week}
                      opp={g.opponentAbbrev}
                      isHome={g.isHome}
                      strength={g.strengthRating}
                    />
                  ))}
                </View>
                <View style={styles.schedLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
                    <Text variant="caption" color={colors.textTertiary}>Easy</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
                    <Text variant="caption" color={colors.textTertiary}>Neutral</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.coral }]} />
                    <Text variant="caption" color={colors.textTertiary}>Tough</Text>
                  </View>
                </View>
              </View>
            )}

            {/* News */}
            {activeTab === 'news' && (
              <View style={styles.section}>
                {player.recentNews.map((n) => (
                  <NewsCard key={n.id} item={n} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── AI Block ─────────────────────────────────────────────────────────────────

function AIBlock({ title, body, accent, emoji, loading }: {
  title: string; body: string; accent: string; emoji: string; loading?: boolean;
}) {
  return (
    <View style={[aiStyles.card, { borderColor: `${accent}30` }]}>
      <LinearGradient
        colors={[`${accent}0A`, 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={aiStyles.header}>
        <Text style={aiStyles.emoji}>{emoji}</Text>
        <Text variant="labelSmall" style={{ color: accent, letterSpacing: 0.8 }}>{title}</Text>
      </View>
      {loading
        ? <ActivityIndicator size="small" color={accent} style={{ marginVertical: 8 }} />
        : <Text variant="body" color={colors.textSecondary} style={aiStyles.body}>{body}</Text>
      }
    </View>
  );
}

// ─── Metric Gauge ─────────────────────────────────────────────────────────────

function MetricGauge({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withDelay(100, withTiming(value / max, { duration: 700, easing: Easing.out(Easing.quad) }));
  }, []);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` as any }));

  return (
    <View style={mgStyles.wrap}>
      <View style={mgStyles.top}>
        <Text variant="labelSmall" color={colors.textTertiary}>{label}</Text>
        <Text style={[mgStyles.val, { color }]}>{value}<Text style={mgStyles.max}>/{max}</Text></Text>
      </View>
      <View style={mgStyles.bar}>
        <Animated.View style={[mgStyles.fill, barStyle, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Locked Card ─────────────────────────────────────────────────────────────

function LockedCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <TouchableOpacity style={lockStyles.card} onPress={onUpgrade} activeOpacity={0.85}>
      <LinearGradient
        colors={['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.03)']}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name="lock-closed" size={28} color={colors.gold} />
      <Text variant="bodyMedium" color={colors.gold} style={{ marginTop: spacing.sm }}>
        Unlock AI Analysis
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} align="center" style={{ lineHeight: 18, marginTop: 4 }}>
        Full Why Draft, Why Avoid, scheme fit, and confidence scores require Starter or GM.
      </Text>
      <View style={lockStyles.btn}>
        <Text variant="bodySmallMedium" color={colors.background}>Upgrade →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  backSafe:   { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: {
    marginLeft:      spacing.base,
    marginTop:       spacing.sm,
    width:           38,
    height:          38,
    borderRadius:    radius.md,
    backgroundColor: 'rgba(13,13,15,0.7)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     colors.border,
  },

  hero: {
    paddingTop:    80,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow:      'hidden',
  },
  heroTop: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  heroInfo:  { flex: 1, gap: 4 },
  posRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  posTag: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      radius.xs,
    backgroundColor:   colors.surfaceElevated,
  },
  playerName: {
    ...typography.h2,
    fontSize:  36,
    lineHeight: 38,
    color:     colors.textPrimary,
  },

  injuryBanner: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    borderWidth:     1,
    borderRadius:    radius.md,
    padding:         spacing.md,
    gap:             spacing.sm,
    marginBottom:    spacing.md,
  },
  injuryDot: {
    width:         8,
    height:        8,
    borderRadius:  4,
    marginTop:     5,
    flexShrink:    0,
  },

  statsRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginTop:     spacing.sm,
  },

  tabRow: {
    flexDirection:    'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.base,
  },
  tab: {
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.sm,
    marginRight:       spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.green,
  },

  tabContent:  { paddingHorizontal: spacing.base, paddingTop: spacing.xl },
  section:     { gap: spacing.md },
  subLabel:    { letterSpacing: 1, marginBottom: spacing.sm },

  metricsRow: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  schemeCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.base,
    gap:             spacing.xs,
  },
  schemeLabel: { letterSpacing: 0.8 },

  perfList: { gap: spacing.sm, marginBottom: spacing.xl },
  statGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  statGridCell: {
    flex:            1,
    minWidth:        '22%',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.md,
    alignItems:      'center',
    gap:             4,
  },
  statGridValue: {
    ...typography.stat,
    color: colors.textPrimary,
  },

  matchRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  schedLegend: {
    flexDirection: 'row',
    gap:           spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  legendDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
});

const gaugeStyles = StyleSheet.create({
  wrap: {
    alignItems:  'center',
    gap:         2,
    paddingLeft: spacing.md,
  },
  number: {
    ...typography.statLarge,
    fontSize: 42,
  },
  bar: {
    width:           64,
    height:          4,
    backgroundColor: colors.surfaceElevated,
    borderRadius:    2,
    marginTop:       4,
    overflow:        'hidden',
  },
  fill: {
    height:       4,
    borderRadius: 2,
  },
});

const statStyles = StyleSheet.create({
  pill: {
    flex:            1,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    paddingVertical: spacing.sm,
    alignItems:      'center',
    gap:             2,
  },
  value: {
    ...typography.statSmall,
    fontSize: 18,
  },
});

const perfStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  week:  { width: 28 },
  opp:   { width: 52 },
  barBg: {
    flex:            1,
    height:          6,
    backgroundColor: colors.surfaceElevated,
    borderRadius:    3,
    overflow:        'hidden',
  },
  barFill: {
    height:       6,
    borderRadius: 3,
  },
  pts: {
    ...typography.statSmall,
    fontSize:  16,
    width:     40,
    textAlign: 'right',
  },
});

const matchStyles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.md,
    alignItems:      'center',
    gap:             4,
    minWidth:        72,
  },
  wk:  { letterSpacing: 0.5 },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginTop:    2,
  },
});

const newsStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  impactDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    marginTop:    5,
    flexShrink:   0,
  },
  body:    { lineHeight: 18 },
  aiWrap: {
    backgroundColor: 'rgba(0,255,135,0.06)',
    borderRadius:    radius.sm,
    borderWidth:     1,
    borderColor:     'rgba(0,255,135,0.15)',
    padding:         spacing.md,
    gap:             4,
  },
  aiLabel:  { letterSpacing: 0.8 },
  source:   { marginTop: spacing.xs },
});

const aiStyles = StyleSheet.create({
  card: {
    borderWidth:  1,
    borderRadius: radius.lg,
    padding:      spacing.base,
    overflow:     'hidden',
    gap:          spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  emoji: { fontSize: 18 },
  body:  { lineHeight: 22 },
});

const mgStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.md,
    gap:             spacing.sm,
  },
  top: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  val: {
    ...typography.h4,
    fontSize: 18,
  },
  max: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  bar: {
    height:          6,
    backgroundColor: colors.surfaceElevated,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: {
    height:       6,
    borderRadius: 3,
  },
});

const lockStyles = StyleSheet.create({
  card: {
    borderWidth:   1,
    borderColor:   `${colors.gold}40`,
    borderRadius:  radius.xl,
    padding:       spacing['2xl'],
    alignItems:    'center',
    overflow:      'hidden',
    gap:           spacing.sm,
  },
  btn: {
    backgroundColor: colors.gold,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    marginTop:       spacing.sm,
  },
});
