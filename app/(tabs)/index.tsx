import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { TIERS } from '@constants/tiers';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { sleeper, SleeperPlayer, TrendingPlayer } from '@services/sleeper';
import { espn, EspnNewsItem } from '@services/espn';
import { SportSwitcher } from '@components/ui/SportSwitcher';
import type { SportId } from '@constants/sports';
import { useMyRoster } from '@hooks/useMyRoster';
import { SportTint } from '@components/shared/SportTint';
import { TeamLogo } from '@components/shared/TeamLogo';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveTrendPlayer {
  id:    string;
  name:  string;
  pos:   string;
  team:  string;
  count: number;
}

// ─── Mock alerts (replace with push notification store later) ─────────────────
const MOCK_ALERTS = [
  {
    id: '1',
    type: 'injury' as const,
    emoji: '🚨',
    title: 'Josh Allen — QUESTIONABLE',
    body: 'Shoulder issue. Limited in practice Wednesday.',
    time: '12m ago',
    accent: colors.coral,
  },
  {
    id: '2',
    type: 'waiver' as const,
    emoji: '📡',
    title: 'Jaylen Wright spiking',
    body: 'Added in 4,200+ leagues this week. Top RB wire add.',
    time: '1h ago',
    accent: colors.green,
  },
  {
    id: '3',
    type: 'sleeper' as const,
    emoji: '💡',
    title: 'Sleeper Alert — Rashee Rice',
    body: 'Targeting rising — 38% target share last 2 weeks.',
    time: '3h ago',
    accent: colors.gold,
  },
];

const FANTASY_POS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);

// ─── Per-sport alerts hook (top injuries) ────────────────────────────────────

interface LiveAlert {
  id:     string;
  emoji:  string;
  title:  string;
  body:   string;
  accent: string;
}

function useLiveAlerts(sport: SportId) {
  const [alerts, setAlerts]   = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    espn.injuries(sport)
      .then((items) => {
        if (cancelled) return;
        // Surface the 3 most severe / most recent injuries as alerts
        const top = items
          .filter(i => i.athlete && i.status)
          .slice(0, 3)
          .map((i): LiveAlert => {
            const status = i.status.toUpperCase();
            const isOut = /^(OUT|IR|DOUBT)/i.test(status);
            return {
              id:     `${i.athlete.id}-${i.id}`,
              emoji:  isOut ? '🚨' : '⚠️',
              title:  `${i.athlete.fullName} — ${status}`,
              body:   i.shortComment || i.details?.detail || `${i.details?.location ?? ''} ${i.details?.type ?? ''}`.trim() || i.type,
              accent: isOut ? colors.coral : colors.gold,
            };
          });
        setAlerts(top);
      })
      .catch(() => setAlerts([]))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sport]);

  return { alerts, loading };
}

// ─── Per-sport news hook ──────────────────────────────────────────────────────

function useSportNews(sport: SportId) {
  const [items, setItems]     = useState<EspnNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    espn.news(sport, 5)
      .then((articles) => { if (!cancelled) setItems(articles); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sport]);

  return { items, loading };
}

// ─── Live trending hook ───────────────────────────────────────────────────────

function useLiveTrending() {
  const [players, setPlayers] = useState<LiveTrendPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [adds, allPlayers] = await Promise.all([
          sleeper.getTrendingAdds(25),
          sleeper.getAllPlayers(),
        ]);
        if (cancelled) return;
        const result: LiveTrendPlayer[] = adds
          .map((a) => {
            const p = allPlayers[a.player_id] as SleeperPlayer | undefined;
            if (!p || !FANTASY_POS.has(p.position) || !p.team) return null;
            return {
              id:    a.player_id,
              name:  p.full_name || `${p.first_name} ${p.last_name}`,
              pos:   p.position,
              team:  p.team,
              count: a.count,
            };
          })
          .filter((x): x is LiveTrendPlayer => x !== null)
          .slice(0, 4);
        setPlayers(result);
      } catch { /* silent — keep empty state */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { players, loading };
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: 'rookie' | 'starter' | 'gm' }) {
  const def = TIERS[tier];
  return (
    <View style={[tierStyles.badge, { borderColor: `${def.color}60`, backgroundColor: `${def.color}18` }]}>
      <Text variant="labelSmall" style={{ color: def.color, letterSpacing: 1 }}>
        {def.badge}
      </Text>
    </View>
  );
}

function AlertCard({
  emoji, title, body, time, accent, delay,
}: typeof MOCK_ALERTS[number] & { delay: number }) {
  const op = useSharedValue(0);
  const ty = useSharedValue(10);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 400 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={[alertStyles.card, style]}>
      <View style={[alertStyles.iconWrap, { backgroundColor: `${accent}1A` }]}>
        <Text style={alertStyles.icon}>{emoji}</Text>
      </View>
      <View style={alertStyles.body}>
        <View style={alertStyles.row}>
          <Text variant="bodySmallMedium" color={colors.textPrimary} style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>{time}</Text>
        </View>
        <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>{body}</Text>
      </View>
      <View style={[alertStyles.accentBar, { backgroundColor: accent }]} />
    </Animated.View>
  );
}

function TrendingRow({
  item, delay,
}: { item: LiveTrendPlayer; delay: number }) {
  const op = useSharedValue(0);
  const tx = useSharedValue(-8);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 350 }));
    tx.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: tx.value }] }));

  return (
    <Animated.View style={[trendStyles.row, style]}>
      <View style={trendStyles.posTag}>
        <Text variant="labelSmall" color={colors.textTertiary}>{item.pos}</Text>
      </View>
      <View style={trendStyles.info}>
        <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>{item.name}</Text>
        <Text variant="caption" color={colors.textTertiary}>{item.team}</Text>
      </View>
      <Text style={trendStyles.arrow}>↑</Text>
      <View style={trendStyles.countPill}>
        <Text variant="labelSmall" style={{ color: colors.green }}>+{item.count.toLocaleString()}</Text>
      </View>
    </Animated.View>
  );
}

function TrendingSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[trendStyles.row, { opacity: 0.3 }]}>
          <View style={[trendStyles.posTag, skeletonStyles.block]} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={[skeletonStyles.block, { height: 14, width: '60%', borderRadius: radius.xs }]} />
            <View style={[skeletonStyles.block, { height: 11, width: '30%', borderRadius: radius.xs }]} />
          </View>
          <View style={[skeletonStyles.block, { height: 22, width: 52, borderRadius: radius.full }]} />
        </View>
      ))}
    </>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({
  emoji, label, accent, onPress, delay,
}: {
  emoji: string; label: string; accent: string; onPress: () => void; delay: number;
}) {
  const op = useSharedValue(0);
  const ty = useSharedValue(8);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 350 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={[style, { flex: 1 }]}>
      <TouchableOpacity
        style={[qaStyles.btn, { borderColor: `${accent}30` }]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={[qaStyles.iconCircle, { backgroundColor: `${accent}14` }]}>
          <Text style={qaStyles.emoji}>{emoji}</Text>
        </View>
        <Text variant="caption" color={colors.textSecondary} align="center" style={qaStyles.label}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label, action, onAction, live }: {
  label: string; action?: string; onAction?: () => void; live?: boolean;
}) {
  return (
    <View style={shStyles.row}>
      <View style={shStyles.left}>
        <Text variant="label" color={colors.textTertiary} style={shStyles.label}>{label}</Text>
        {live && (
          <View style={shStyles.livePill}>
            <View style={shStyles.liveDot} />
            <Text variant="labelSmall" style={{ color: colors.green, fontSize: 9 }}>LIVE</Text>
          </View>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text variant="caption" color={colors.green}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING,';
  if (h < 17) return 'GOOD AFTERNOON,';
  return 'GOOD EVENING,';
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const user = useUserStore((s) => s.user);
  const tier = useUserStore((s) => s.tier);
  const sportForData = useUserStore((s) => s.currentSport);
  const { players: trendPlayers, loading: trendLoading } = useLiveTrending();
  const { items: newsItems,      loading: newsLoading  } = useSportNews(sportForData);
  const { alerts: liveAlerts,    loading: alertsLoading } = useLiveAlerts(sportForData);
  const { roster: myRoster, hasLeague, loading: rosterLoading } = useMyRoster();

  const heroOp = useSharedValue(0);
  const heroTy = useSharedValue(12);
  useEffect(() => {
    heroOp.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    heroTy.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOp.value,
    transform: [{ translateY: heroTy.value }],
  }));

  const greeting  = getGreeting();
  const firstName = user?.displayName?.split(' ')[0] ?? 'GM';
  const sport     = useUserStore((s) => s.currentSport);
  const sportDef  = SPORTS[sport];
  const league    = user?.leagueSettings;

  return (
    <View style={styles.container}>
      <SportTint sport={sportForData} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero header ─────────────────────────────────────────────── */}
          <Animated.View style={[styles.header, heroStyle]}>
            <View style={styles.headerTop}>
              <View>
                <Text variant="caption" color={colors.textTertiary} style={styles.greetLabel}>
                  {greeting}
                </Text>
                <Text style={styles.heroName}>{firstName.toUpperCase()}</Text>
              </View>
              <View style={styles.headerRight}>
                <TierBadge tier={tier} />
                <TouchableOpacity
                  style={styles.notifBtn}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {league && (
              <View style={styles.leaguePill}>
                <Text style={styles.sportEmoji}>{sportDef.emoji}</Text>
                <Text variant="bodySmallMedium" color={colors.textSecondary}>
                  {sportDef.shortLabel}
                  {' · '}
                  {league.numTeams}-team
                  {' · '}
                  {league.scoringType?.toUpperCase()}
                  {league.isDynasty ? ' · Dynasty' : ''}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* ── Quick Actions ────────────────────────────────────────────── */}
          <View style={styles.quickRow}>
            <QuickAction
              emoji="⚡"
              label="Mock Draft"
              accent={colors.green}
              onPress={() => router.push('/draft')}
              delay={100}
            />
            <QuickAction
              emoji="🔄"
              label="Add/Drop"
              accent={colors.coral}
              onPress={() => router.push('/add-drop')}
              delay={175}
            />
            <QuickAction
              emoji="🏥"
              label="Injuries"
              accent={colors.gold}
              onPress={() => router.push('/injuries')}
              delay={250}
            />
            <QuickAction
              emoji="↔️"
              label="Trade"
              accent={colors.purple}
              onPress={() => router.push('/trade')}
              delay={325}
            />
          </View>

          {/* ── My Roster (if league connected) ─────────────────────────── */}
          {hasLeague && myRoster && (
            <>
              <SectionHeader
                label={`MY TEAM · ${myRoster.teamName.toUpperCase()}`}
                action="Full team →"
                onAction={() => router.push('/roster')}
              />
              <View style={rosterStyles.card}>
                <View style={rosterStyles.headerRow}>
                  <Text variant="bodyMedium" color={colors.textPrimary}>{myRoster.leagueName}</Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {myRoster.record.wins}-{myRoster.record.losses}{myRoster.record.ties ? `-${myRoster.record.ties}` : ''}
                  </Text>
                </View>
                {myRoster.players.filter(p => p.isStarter).slice(0, 6).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={rosterStyles.row}
                    onPress={() => router.push(`/player?id=${p.id}`)}
                    activeOpacity={0.7}
                  >
                    <PlayerAvatar sport={sportForData} id={p.id} name={p.name} size={32} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>
                        {p.position} · {p.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TeamLogo sport={sportForData} team={p.team} size={12} />
                        <Text variant="caption" color={colors.textTertiary}>
                          {p.team}{p.injury ? ` · ${p.injury.status}` : ''}
                        </Text>
                      </View>
                    </View>
                    {p.injury && <View style={[rosterStyles.injuryDot, { backgroundColor: colors.coral }]} />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {!hasLeague && sport === 'nfl' && (
            <TouchableOpacity
              style={connectCta.wrap}
              onPress={() => router.push('/settings/connect-sleeper')}
              activeOpacity={0.85}
            >
              <View style={connectCta.iconBubble}>
                <Ionicons name="link" size={20} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>Connect your Sleeper league</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Pull your real roster — every AI take becomes about YOUR players. (NFL only.)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* ── Alerts (live per sport) ──────────────────────────────────── */}
          <SectionHeader label={`${sportDef.shortLabel} ALERTS`} action="See all" onAction={() => router.push('/injuries')} live />
          <View style={styles.alertList}>
            {alertsLoading ? (
              <Text variant="bodySmall" color={colors.textTertiary} style={{ padding: spacing.md }}>
                Loading {sportDef.shortLabel} alerts…
              </Text>
            ) : liveAlerts.length === 0 ? (
              <Text variant="bodySmall" color={colors.textTertiary} style={{ padding: spacing.md }}>
                No active {sportDef.shortLabel} alerts.
              </Text>
            ) : (
              liveAlerts.map((a, i) => (
                <AlertCard key={a.id} {...a} time="Live" type="injury" delay={200 + i * 80} />
              ))
            )}
          </View>

          {/* ── Today's news (per-sport) ──────────────────────────────────── */}
          <SectionHeader
            label={`${sportDef.shortLabel} HEADLINES`}
            action="More →"
            onAction={() => router.push('/add-drop')}
            live
          />
          <View style={styles.trendCard}>
            {newsLoading ? (
              <View style={styles.trendEmpty}>
                <Text variant="bodySmall" color={colors.textTertiary} align="center">
                  Loading {sportDef.shortLabel} news…
                </Text>
              </View>
            ) : newsItems.length > 0 ? (
              newsItems.slice(0, 4).map((n) => (
                <View key={n.id} style={newsRowStyles.row}>
                  <Text style={newsRowStyles.emoji}>{sportDef.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={2}>
                      {n.headline}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                      {new Date(n.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.trendEmpty}>
                <Text variant="bodySmall" color={colors.textTertiary} align="center">
                  No {sportDef.shortLabel} news available right now.
                </Text>
              </View>
            )}
          </View>

          {/* ── Trending (NFL only — Sleeper data) ───────────────────────── */}
          {sport === 'nfl' && (
            <>
              <SectionHeader
                label="TRENDING ADDS"
                action="Full wire →"
                onAction={() => router.push('/add-drop')}
                live
              />
              <View style={styles.trendCard}>
                {trendLoading ? (
                  <TrendingSkeleton />
                ) : trendPlayers.length > 0 ? (
                  trendPlayers.map((p, i) => (
                    <TrendingRow key={p.id} item={p} delay={350 + i * 60} />
                  ))
                ) : (
                  <View style={styles.trendEmpty}>
                    <Text variant="bodySmall" color={colors.textTertiary} align="center">
                      Could not load trending data.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* ── GM Report upsell (non-GM) ────────────────────────────────── */}
          {tier !== 'gm' && (
            <TouchableOpacity
              style={styles.gmCard}
              onPress={() => router.push('/paywall')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['rgba(201,168,76,0.12)', 'rgba(201,168,76,0.04)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.gmCardInner}>
                <Text style={styles.gmEmoji}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color={colors.gold}>Unlock GM Mode</Text>
                  <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    Weekly AI team reports, season-long pickup intel, unlimited waiver alerts.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gold} />
              </View>
            </TouchableOpacity>
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
    marginTop:    spacing.base,
    marginBottom: spacing.xl,
  },
  headerTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  greetLabel:  { marginBottom: 2, letterSpacing: 1 },
  heroName: {
    ...typography.h1,
    fontSize:   48,
    lineHeight: 50,
    color:      colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginTop:     4,
  },
  notifBtn: {
    width:           38,
    height:          38,
    borderRadius:    radius.md,
    backgroundColor: `${colors.green}14`,
    borderWidth:     1,
    borderColor:     `${colors.green}30`,
    alignItems:      'center',
    justifyContent:  'center',
  },
  leaguePill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    marginTop:       spacing.md,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    alignSelf:       'flex-start',
  },
  sportEmoji: { fontSize: 14 },

  quickRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.xl,
  },

  alertList: {
    gap:          spacing.sm,
    marginBottom: spacing.xl,
  },

  trendCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    marginBottom:    spacing.xl,
  },
  trendEmpty: {
    paddingVertical: spacing['2xl'],
    alignItems:      'center',
  },

  gmCard: {
    borderWidth:  1,
    borderColor:  `${colors.gold}40`,
    borderRadius: radius.lg,
    overflow:     'hidden',
    marginBottom: spacing.xl,
  },
  gmCardInner: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       spacing.base,
    gap:           spacing.md,
  },
  gmEmoji: { fontSize: 28 },

  bottomSpacer: { height: spacing.xl },
});

const tierStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius:       radius.full,
    borderWidth:        1,
  },
});

const alertStyles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             spacing.md,
    overflow:        'hidden',
  },
  iconWrap: {
    width:          40,
    height:         40,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  icon:   { fontSize: 20 },
  body:   { flex: 1, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  accentBar: {
    position: 'absolute',
    left:     0,
    top:      0,
    bottom:   0,
    width:    3,
  },
});

const trendStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap:               spacing.md,
  },
  posTag: {
    width:           36,
    paddingVertical: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius:    radius.xs,
    alignItems:      'center',
  },
  info: { flex: 1, gap: 2 },
  arrow: {
    fontSize:  18,
    color:     colors.green,
    width:     20,
    textAlign: 'center',
  },
  countPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius:      radius.full,
    backgroundColor:  `${colors.green}14`,
    borderWidth:       1,
    borderColor:       `${colors.green}30`,
  },
});

const rosterStyles = StyleSheet.create({
  card: {
    backgroundColor:  colors.surface,
    borderRadius:     radius.lg,
    borderWidth:      1,
    borderColor:      colors.border,
    padding:          spacing.base,
    marginBottom:     spacing.md,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
    paddingBottom:  spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    paddingVertical:  spacing.xs,
  },
  posTag: {
    width:            36,
    paddingVertical:  3,
    borderRadius:     radius.sm,
    backgroundColor:  colors.background,
    alignItems:       'center',
  },
  injuryDot: {
    width:  8, height: 8, borderRadius: 4,
  },
});

const connectCta = StyleSheet.create({
  wrap: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    padding:         spacing.base,
    backgroundColor: `${colors.green}10`,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     `${colors.green}40`,
    marginBottom:    spacing.md,
  },
  iconBubble: {
    width:           40, height: 40, borderRadius: 20,
    backgroundColor: `${colors.green}24`,
    alignItems:      'center',
    justifyContent:  'center',
  },
});

const newsRowStyles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  emoji: {
    fontSize: 18,
    marginTop: 1,
  },
});

const qaStyles = StyleSheet.create({
  btn: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    paddingVertical: spacing.md,
    alignItems:      'center',
    gap:             spacing.xs,
  },
  iconCircle: {
    width:          40,
    height:         40,
    borderRadius:   radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  label: { letterSpacing: 0.2 },
});

const shStyles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  label: { letterSpacing: 1 },
  livePill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             3,
    backgroundColor: `${colors.green}18`,
    borderRadius:    radius.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderWidth:     1,
    borderColor:     `${colors.green}30`,
  },
  liveDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.green,
  },
});

const skeletonStyles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceElevated,
  },
});
