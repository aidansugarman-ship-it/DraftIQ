import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
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
import { TIERS } from '@constants/tiers';
import { useUserStore } from '@store/useUserStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  getTierFromCustomerInfo,
} from '@lib/revenuecat';
import type { PurchasesPackage } from 'react-native-purchases';

type BillingPeriod = 'monthly' | 'annual';
type SelectedTier  = 'starter' | 'gm';

// ─── Feature list per tier ────────────────────────────────────────────────────

const STARTER_FEATURES = [
  'Unlimited player lookups — all 4 sports',
  'Full AI analysis on every player',
  'Why Draft + Why Avoid breakdowns',
  'Player background stories & fun facts',
  'Unlimited mock drafts',
  'Add/Drop advisor (5 per week)',
  'Trade analyzer',
  'Full article access',
  'No ads',
];

const GM_FEATURES = [
  'Everything in Starter',
  'Unlimited Add/Drop advisor',
  'Full personalized AI draft board',
  'Real-time waiver wire push alerts',
  'War Room — live draft companion',
  'Dynasty mode & multi-year projections',
  'DFS lineup optimizer',
  'Weekly personalized GM team report',
  'GM badge on profile',
  'Priority AI response speed',
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function FeatureRow({ label, delay }: { label: string; delay: number }) {
  const op = useSharedValue(0);
  const tx = useSharedValue(-8);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 300 }));
    tx.value = withDelay(delay, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: tx.value }] }));

  return (
    <Animated.View style={[featureStyles.row, style]}>
      <View style={featureStyles.check}>
        <Ionicons name="checkmark" size={13} color={colors.background} />
      </View>
      <Text variant="bodySmall" color={colors.textSecondary} style={featureStyles.label}>
        {label}
      </Text>
    </Animated.View>
  );
}

function TierCard({
  tierId,
  selected,
  billing,
  onSelect,
  delay,
}: {
  tierId:   SelectedTier;
  selected: boolean;
  billing:  BillingPeriod;
  onSelect: () => void;
  delay:    number;
}) {
  const def     = TIERS[tierId];
  const price   = def.price!;
  const amount  = billing === 'annual' ? price.annualPerMonth : price.monthly;
  const badge   = billing === 'annual' ? 'SAVE 40%' : null;

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
        style={[
          cardStyles.card,
          selected && { borderColor: def.color, backgroundColor: `${def.color}0A` },
        ]}
        onPress={onSelect}
        activeOpacity={0.8}
      >
        {selected && (
          <LinearGradient
            colors={[`${def.color}10`, 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={cardStyles.top}>
          <View style={cardStyles.left}>
            <View style={[cardStyles.dot, { backgroundColor: selected ? def.color : colors.border }]}>
              {selected && <View style={cardStyles.dotInner} />}
            </View>
            <View>
              <Text variant="bodyMedium" color={selected ? colors.textPrimary : colors.textSecondary}>
                {def.label}
              </Text>
              {billing === 'annual' && (
                <Text variant="caption" color={colors.textTertiary}>
                  Billed {price.annual}/yr
                </Text>
              )}
            </View>
          </View>
          <View style={cardStyles.right}>
            {badge && (
              <View style={[cardStyles.saveBadge, { backgroundColor: `${def.color}20`, borderColor: `${def.color}50` }]}>
                <Text variant="labelSmall" style={{ color: def.color }}>{badge}</Text>
              </View>
            )}
            <Text style={[cardStyles.price, { color: selected ? def.color : colors.textSecondary }]}>
              {amount}
            </Text>
            <Text variant="caption" color={colors.textTertiary}>/ mo</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { setTier, updateUser } = useUserStore();
  const currentTier = useUserStore((s) => s.tier);

  const [selectedTier, setSelectedTier] = useState<SelectedTier>('gm');
  const [billing,      setBilling]      = useState<BillingPeriod>('annual');
  const [loading,      setLoading]      = useState(false);
  const [restoring,    setRestoring]    = useState(false);

  const heroOp = useSharedValue(0);
  const heroTy = useSharedValue(16);
  useEffect(() => {
    heroOp.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    heroTy.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOp.value,
    transform: [{ translateY: heroTy.value }],
  }));

  const features = selectedTier === 'gm' ? GM_FEATURES : STARTER_FEATURES;
  const tierDef  = TIERS[selectedTier];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const offering = await getOfferings();
      if (!offering) throw new Error('No offerings available');

      // Find the matching package
      const packageId = `${selectedTier}_${billing}`;
      const pkg = offering.availablePackages.find(
        (p: PurchasesPackage) => p.identifier === packageId,
      ) ?? offering.availablePackages[0];

      if (!pkg) throw new Error('Package not found');

      const info = await purchasePackage(pkg);
      const tier = getTierFromCustomerInfo(info);
      setTier(tier);
      updateUser({ tier });

      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert(
          'Purchase failed',
          'Something went wrong. Please try again or restore your purchases.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      const tier = getTierFromCustomerInfo(info);
      if (tier !== 'rookie') {
        setTier(tier);
        updateUser({ tier });
        Alert.alert('Restored!', `Your ${TIERS[tier].label} subscription has been restored.`);
        router.back();
      } else {
        Alert.alert('Nothing to restore', 'No active subscription found for this account.');
      }
    } catch {
      Alert.alert('Restore failed', 'Could not restore purchases. Try again.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Close button */}
      <SafeAreaView style={styles.closeSafe} edges={['top']}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.hero, heroStyle]}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.heroTitle}>UPGRADE YOUR{'\n'}GAME.</Text>
          <Text variant="bodyLarge" color={colors.textSecondary} style={styles.heroSub}>
            The edge serious fantasy GMs use to win leagues.
          </Text>
        </Animated.View>

        {/* ── Billing toggle ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.billingWrap, heroStyle]}>
          <TouchableOpacity
            style={[styles.billingPill, billing === 'monthly' && styles.billingPillActive]}
            onPress={() => setBilling('monthly')}
            activeOpacity={0.8}
          >
            <Text variant="bodySmallMedium" color={billing === 'monthly' ? colors.background : colors.textTertiary}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingPill, billing === 'annual' && styles.billingPillActive]}
            onPress={() => setBilling('annual')}
            activeOpacity={0.8}
          >
            <Text variant="bodySmallMedium" color={billing === 'annual' ? colors.background : colors.textTertiary}>
              Annual
            </Text>
            <View style={styles.saveBubble}>
              <Text variant="labelSmall" color={colors.green}>SAVE 40%</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Tier cards ─────────────────────────────────────────────────── */}
        <View style={styles.tierCards}>
          <TierCard
            tierId="starter"
            selected={selectedTier === 'starter'}
            billing={billing}
            onSelect={() => setSelectedTier('starter')}
            delay={150}
          />
          <TierCard
            tierId="gm"
            selected={selectedTier === 'gm'}
            billing={billing}
            onSelect={() => setSelectedTier('gm')}
            delay={230}
          />
        </View>

        {/* ── Feature list ───────────────────────────────────────────────── */}
        <View style={styles.featuresWrap}>
          <Text variant="label" color={colors.textTertiary} style={styles.featuresLabel}>
            WHAT YOU GET
          </Text>
          <View style={styles.featureList}>
            {features.map((f, i) => (
              <FeatureRow key={f} label={f} delay={300 + i * 40} />
            ))}
          </View>
        </View>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: tierDef.color }]}
            onPress={handlePurchase}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text variant="bodyBold" color={colors.background}>
              {loading
                ? 'Processing…'
                : `Start ${tierDef.label} — ${billing === 'annual' ? TIERS[selectedTier].price?.annualPerMonth : TIERS[selectedTier].price?.monthly}/mo`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={handleRestore}
            activeOpacity={0.7}
            disabled={restoring}
          >
            <Text variant="bodySmall" color={colors.textTertiary}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </Text>
          </TouchableOpacity>

          <Text variant="caption" color={colors.textTertiary} align="center" style={styles.legal}>
            Subscriptions auto-renew. Cancel anytime in your {Platform.OS === 'ios' ? 'App Store' : 'Play Store'} settings.
            By subscribing you agree to our Terms of Service.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  closeSafe:  { position: 'absolute', top: 0, right: 0, zIndex: 10 },
  closeBtn: {
    margin:          spacing.base,
    width:           36,
    height:          36,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        80,
    paddingBottom:     40,
  },

  hero: {
    alignItems:   'center',
    marginBottom: spacing.xl,
  },
  crown: {
    fontSize:     48,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.h1,
    fontSize:   44,
    lineHeight: 46,
    color:      colors.textPrimary,
    textAlign:  'center',
    marginBottom: spacing.md,
  },
  heroSub: {
    textAlign:  'center',
    lineHeight: 24,
    maxWidth:   280,
  },

  billingWrap: {
    flexDirection:   'row',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.full,
    padding:         3,
    marginBottom:    spacing.xl,
    alignSelf:       'center',
  },
  billingPill: {
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
  },
  billingPillActive: {
    backgroundColor: colors.textPrimary,
  },
  saveBubble: {
    backgroundColor: 'rgba(0,255,135,0.15)',
    borderRadius:    radius.full,
    paddingHorizontal: 6,
    paddingVertical:   1,
  },

  tierCards: {
    gap:          spacing.md,
    marginBottom: spacing.xl,
  },

  featuresWrap: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    marginBottom:    spacing.xl,
  },
  featuresLabel: {
    letterSpacing: 1,
    marginBottom:  spacing.md,
  },
  featureList: { gap: spacing.sm },

  ctaWrap: {
    gap: spacing.md,
    alignItems: 'center',
  },
  ctaBtn: {
    width:         '100%',
    height:        56,
    borderRadius:  radius.lg,
    alignItems:    'center',
    justifyContent: 'center',
  },
  restoreBtn: {
    paddingVertical: spacing.sm,
  },
  legal: {
    lineHeight:  16,
    maxWidth:    300,
    paddingHorizontal: spacing.base,
  },

  bottomSpacer: { height: spacing.xl },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
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
    gap:           spacing.md,
  },
  dot: {
    width:          20,
    height:         20,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dotInner: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.background,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           4,
  },
  saveBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
    marginRight:       spacing.xs,
  },
  price: {
    ...typography.h3,
    fontSize: 22,
  },
});

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  check: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: colors.green,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       1,
    flexShrink:      0,
  },
  label: { flex: 1, lineHeight: 18 },
});
