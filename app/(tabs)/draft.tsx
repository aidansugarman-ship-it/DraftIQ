import { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { TIERS, canAccess } from '@constants/tiers';
import { useUserStore } from '@store/useUserStore';

interface FeatureCardProps {
  emoji:       string;
  title:       string;
  description: string;
  badge?:      string;
  accent:      string;
  locked:      boolean;
  onPress:     () => void;
  delay:       number;
}

function FeatureCard({
  emoji, title, description, badge, accent, locked, onPress, delay,
}: FeatureCardProps) {
  const op = useSharedValue(0);
  const ty = useSharedValue(12);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 400 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={style}>
      <TouchableOpacity
        style={[cardStyles.card, { borderColor: locked ? colors.border : `${accent}40` }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {!locked && (
          <LinearGradient
            colors={[`${accent}0C`, 'transparent']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        <View style={cardStyles.top}>
          <View style={[cardStyles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <Text style={cardStyles.emoji}>{emoji}</Text>
          </View>
          <View style={cardStyles.badges}>
            {badge && (
              <View style={[cardStyles.badge, { backgroundColor: `${accent}22`, borderColor: `${accent}50` }]}>
                <Text variant="labelSmall" style={{ color: accent }}>{badge}</Text>
              </View>
            )}
            {locked && (
              <View style={cardStyles.lockBadge}>
                <Ionicons name="lock-closed" size={11} color={colors.textTertiary} />
                <Text variant="labelSmall" color={colors.textTertiary}>PRO</Text>
              </View>
            )}
          </View>
        </View>

        <Text variant="bodyMedium" color={locked ? colors.textSecondary : colors.textPrimary} style={cardStyles.title}>
          {title}
        </Text>
        <Text variant="bodySmall" color={colors.textTertiary} style={cardStyles.desc}>
          {description}
        </Text>

        <View style={cardStyles.cta}>
          <Text variant="bodySmallMedium" color={locked ? colors.textTertiary : accent}>
            {locked ? 'Upgrade to unlock' : 'Get started →'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function DraftScreen() {
  const tier = useUserStore((s) => s.tier);
  const user = useUserStore((s) => s.user);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({
    opacity:   op.value,
    transform: [{ translateY: ty.value }],
  }));

  const league = user?.leagueSettings;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.hero, heroStyle]}>
            <Text style={styles.title}>DRAFT{'\n'}COMMAND.</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              AI-powered tools for every stage — prep, mock, and live day.
            </Text>
          </Animated.View>

          {/* ── League context ─────────────────────────────────────────────── */}
          {league && (
            <Animated.View style={[styles.leagueCard, heroStyle]}>
              <View style={styles.leagueRow}>
                <View>
                  <Text variant="labelSmall" color={colors.textTertiary} style={styles.leagueLabel}>
                    YOUR LEAGUE
                  </Text>
                  <Text variant="bodyMedium" color={colors.textPrimary}>
                    {league.numTeams}-team · {league.scoringType?.toUpperCase()} · Pick {league.draftPositionNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/profile')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ── Feature cards ─────────────────────────────────────────────── */}
          <View style={styles.grid}>
            <FeatureCard
              emoji="⚡"
              title="Mock Draft"
              description="Simulate a full draft against AI teams. Grade your picks and sharpen your strategy."
              badge="FREE"
              accent={colors.green}
              locked={false}
              onPress={() => router.push('/draft')}
              delay={150}
            />

            <FeatureCard
              emoji="📋"
              title="AI Draft Board"
              description="Personalized rankings built around your archetype, league settings, and draft slot."
              badge="STARTER+"
              accent={colors.blue}
              locked={!canAccess(tier, 'starter')}
              onPress={() => canAccess(tier, 'starter') ? router.push('/draft') : router.push('/paywall')}
              delay={230}
            />

            <FeatureCard
              emoji="🎯"
              title="War Room"
              description="Live draft companion. Real-time picks tracking, AI suggestions, and instant alerts."
              badge="GM"
              accent={colors.gold}
              locked={!canAccess(tier, 'gm')}
              onPress={() => canAccess(tier, 'gm') ? router.push('/draft') : router.push('/paywall')}
              delay={310}
            />

            <FeatureCard
              emoji="🔄"
              title="Auction Draft"
              description="Budget-based bidding strategy. Know your targets and when to let go."
              badge="GM"
              accent={colors.purple}
              locked={!canAccess(tier, 'gm')}
              onPress={() => canAccess(tier, 'gm') ? router.push('/draft') : router.push('/paywall')}
              delay={390}
            />
          </View>

          {/* ── Recent drafts placeholder ─────────────────────────────────── */}
          <View style={styles.recentSection}>
            <Text variant="label" color={colors.textTertiary} style={styles.recentLabel}>
              RECENT MOCK DRAFTS
            </Text>
            <View style={styles.emptyDrafts}>
              <Text style={styles.emptyEmoji}>📂</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                No mock drafts yet.{'\n'}Run your first draft to see it here.
              </Text>
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => router.push('/draft')}
                activeOpacity={0.8}
              >
                <Text variant="bodyMedium" color={colors.background}>Start Draft</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     100,
  },

  hero: {
    marginTop:    spacing.base,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize:     48,
    lineHeight:   50,
    color:        colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { lineHeight: 24 },

  leagueCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    marginBottom:    spacing.xl,
  },
  leagueRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  leagueLabel: { letterSpacing: 0.8, marginBottom: 4 },
  editBtn: {
    width:          32,
    height:         32,
    borderRadius:   radius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems:     'center',
    justifyContent: 'center',
  },

  grid: { gap: spacing.md, marginBottom: spacing.xl },

  recentSection: { marginBottom: spacing.xl },
  recentLabel: { letterSpacing: 1, marginBottom: spacing.md },
  emptyDrafts: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing['2xl'],
    alignItems:      'center',
    gap:             spacing.md,
  },
  emptyEmoji: { fontSize: 36 },
  startBtn: {
    backgroundColor: colors.green,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop:       spacing.xs,
  },

  bottomSpacer: { height: spacing.xl },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.sm,
    overflow:        'hidden',
  },
  top: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  iconWrap: {
    width:          44,
    height:         44,
    borderRadius:   radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  badges: {
    flexDirection: 'row',
    gap:           spacing.xs,
    alignItems:    'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
  lockBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             3,
    paddingHorizontal: 8,
    paddingVertical:  2,
    borderRadius:    radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  title: { marginTop: spacing.xs },
  desc:  { lineHeight: 18 },
  cta:   { marginTop: spacing.xs },
});
