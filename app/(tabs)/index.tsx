import { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
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

// ─── Mock data (replace with real queries later) ─────────────────────────────
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

const MOCK_TRENDING = [
  { id: 'p1', name: 'CJ Stroud',      pos: 'QB', team: 'HOU', score: 92, trend: 'up'   as const },
  { id: 'p2', name: 'Puka Nacua',     pos: 'WR', team: 'LAR', score: 88, trend: 'up'   as const },
  { id: 'p3', name: 'Sam LaPorta',    pos: 'TE', team: 'DET', score: 84, trend: 'stable' as const },
  { id: 'p4', name: "De'Von Achane",  pos: 'RB', team: 'MIA', score: 79, trend: 'down' as const },
];

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
  name, pos, team, score, trend, delay,
}: typeof MOCK_TRENDING[number] & { delay: number }) {
  const op = useSharedValue(0);
  const tx = useSharedValue(-8);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 350 }));
    tx.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: tx.value }] }));

  const trendColor = trend === 'up' ? colors.green : trend === 'down' ? colors.coral : colors.textTertiary;
  const trendIcon  = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <Animated.View style={[trendStyles.row, style]}>
      <View style={trendStyles.posTag}>
        <Text variant="labelSmall" color={colors.textTertiary}>{pos}</Text>
      </View>
      <View style={trendStyles.info}>
        <Text variant="bodyMedium" color={colors.textPrimary}>{name}</Text>
        <Text variant="caption" color={colors.textTertiary}>{team}</Text>
      </View>
      <Text style={[trendStyles.trendArrow, { color: trendColor }]}>{trendIcon}</Text>
      <View style={trendStyles.scoreWrap}>
        <Text style={[trendStyles.score, { color: scoreColor(score) }]}>{score}</Text>
      </View>
    </Animated.View>
  );
}

function scoreColor(n: number) {
  if (n >= 90) return colors.green;
  if (n >= 75) return colors.gold;
  return colors.textSecondary;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const user = useUserStore((s) => s.user);
  const tier = useUserStore((s) => s.tier);

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

  const greeting = getGreeting();
  const firstName = user?.displayName?.split(' ')[0] ?? 'GM';
  const sport     = user?.primarySport ?? 'nfl';
  const sportDef  = SPORTS[sport];
  const league    = user?.leagueSettings;

  return (
    <View style={styles.container}>
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
                  onPress={() => router.push('/profile')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* League context pill */}
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
              emoji="📋"
              label="My Board"
              accent={colors.blue}
              onPress={() => router.push('/(tabs)/board')}
              delay={175}
            />
            <QuickAction
              emoji="📊"
              label="GM Report"
              accent={colors.gold}
              onPress={() => router.push('/gm-report')}
              delay={250}
            />
            <QuickAction
              emoji="🔄"
              label="Trade Tool"
              accent={colors.purple}
              onPress={() => router.push('/trade')}
              delay={325}
            />
          </View>

          {/* ── Alerts ──────────────────────────────────────────────────── */}
          <SectionHeader label="ALERTS" action="See all" onAction={() => {}} />
          <View style={styles.alertList}>
            {MOCK_ALERTS.map((a, i) => (
              <AlertCard key={a.id} {...a} delay={200 + i * 80} />
            ))}
          </View>

          {/* ── Trending ────────────────────────────────────────────────── */}
          <SectionHeader
            label="TRENDING"
            action="Full board"
            onAction={() => router.push('/(tabs)/board')}
          />
          <View style={styles.trendCard}>
            {MOCK_TRENDING.map((p, i) => (
              <TrendingRow key={p.id} {...p} delay={350 + i * 60} />
            ))}
          </View>

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
                    Weekly AI team reports, live draft companion, unlimited waiver alerts.
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

function SectionHeader({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <View style={shStyles.row}>
      <Text variant="label" color={colors.textTertiary} style={shStyles.label}>{label}</Text>
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
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
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
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.xs,
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
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap:            spacing.md,
  },
  posTag: {
    width:          36,
    paddingVertical: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius:   radius.xs,
    alignItems:     'center',
  },
  info:   { flex: 1, gap: 2 },
  trendArrow: {
    ...typography.h4,
    fontSize: 18,
  },
  scoreWrap: {
    width:          44,
    alignItems:     'flex-end',
  },
  score: {
    ...typography.stat,
    fontSize: 22,
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
  label: { letterSpacing: 1 },
});
