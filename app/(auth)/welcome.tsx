import { useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing } from '@constants/spacing';
import { typography } from '@constants/typography';

const FEATURES = [
  {
    emoji:    '🧠',
    label:    'AI Player Intelligence',
    sub:      'Why Draft + Why Avoid paragraphs, background stories, fun facts insiders know',
    color:    colors.green,
    delay:    400,
  },
  {
    emoji:    '🎰',
    label:    'Vegas-Backed Edge',
    sub:      'Implied team totals, weather alerts, and contract year flags built into every card',
    color:    colors.purple,
    delay:    550,
  },
  {
    emoji:    '⚡',
    label:    'Live War Room',
    sub:      'Real-time AI commentary during your actual draft — target alerts, pivot signals',
    color:    colors.gold,
    delay:    700,
  },
] as const;

function FeatureRow({
  emoji, label, sub, color, delay,
}: { emoji: string; label: string; sub: string; color: string; delay: number }) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-16);

  useEffect(() => {
    opacity.value    = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }));
    translateX.value = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[styles.featureRow, animStyle]}>
      <View style={[styles.featureIconWrap, { backgroundColor: `${color}18` }]}>
        <Text style={styles.featureEmoji}>{emoji}</Text>
      </View>
      <View style={styles.featureText}>
        <Text variant="bodyMedium" color={colors.textPrimary}>{label}</Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.featureSub}>
          {sub}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const heroOpacity    = useSharedValue(0);
  const heroTranslateY = useSharedValue(24);
  const ctaOpacity     = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value    = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
    heroTranslateY.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
    ctaOpacity.value     = withDelay(900, withTiming(1, { duration: 500 }));
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  return (
    <View style={styles.container}>
      {/* Subtle radial glow at top */}
      <View style={styles.glowOrb} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.heroSection, heroStyle]}>
            {/* Wordmark */}
            <View style={styles.wordmarkWrap}>
              <Text style={styles.wordmark}>DRAFTIQ</Text>
              {/* Green underline glow */}
              <LinearGradient
                colors={['transparent', colors.green, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.wordmarkLine}
              />
            </View>

            <Text
              variant="bodyLarge"
              color={colors.textSecondary}
              align="center"
              style={styles.tagline}
            >
              The smartest person in your{'\n'}fantasy league.{' '}
              <Text variant="bodyLarge" color={colors.textPrimary}>Every week.</Text>
            </Text>

            {/* Sport pills */}
            <View style={styles.sportPills}>
              {['🏈 NFL', '🏀 NBA', '⚾ MLB', '🏒 NHL'].map((s) => (
                <View key={s} style={styles.pill}>
                  <Text variant="labelSmall" color={colors.textTertiary}>{s}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Feature rows ──────────────────────────────────────────────── */}
          <View style={styles.featuresSection}>
            {FEATURES.map((f) => (
              <FeatureRow key={f.label} {...f} />
            ))}
          </View>

          {/* ── Proof strip ───────────────────────────────────────────────── */}
          <Animated.View style={[styles.proofStrip, heroStyle]}>
            <View style={styles.proofItem}>
              <Text variant="h3" color={colors.green}>4</Text>
              <Text variant="caption" color={colors.textTertiary} align="center">Sports</Text>
            </View>
            <View style={styles.proofDivider} />
            <View style={styles.proofItem}>
              <Text variant="h3" color={colors.green}>AI</Text>
              <Text variant="caption" color={colors.textTertiary} align="center">Powered</Text>
            </View>
            <View style={styles.proofDivider} />
            <View style={styles.proofItem}>
              <Text variant="h3" color={colors.green}>24/7</Text>
              <Text variant="caption" color={colors.textTertiary} align="center">Alerts</Text>
            </View>
          </Animated.View>

          {/* ── CTAs ──────────────────────────────────────────────────────── */}
          <Animated.View style={[styles.ctaSection, ctaStyle]}>
            <Button
              label="Get Started Free"
              variant="primary"
              onPress={() => router.push('/(auth)/signup')}
            />
            <View style={styles.ctaGap} />
            <Button
              label="Sign In"
              variant="ghost"
              onPress={() => router.push('/(auth)/login')}
            />
            <Text
              variant="caption"
              color={colors.textTertiary}
              align="center"
              style={styles.legalNote}
            >
              Free to start. No credit card required.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowOrb: {
    position:        'absolute',
    top:             -120,
    left:            '50%',
    marginLeft:      -180,
    width:           360,
    height:          360,
    borderRadius:    180,
    backgroundColor: 'rgba(0,255,135,0.06)',
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    flexGrow:        1,
    paddingHorizontal: spacing.base,
    paddingTop:      spacing['4xl'],
    paddingBottom:   spacing['3xl'],
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  wordmarkWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  wordmark: {
    ...typography.hero,
    fontSize:      72,
    lineHeight:    72,
    letterSpacing: 4,
    color:         colors.textPrimary,
    textAlign:     'center',
  },
  wordmarkLine: {
    width:        200,
    height:       2,
    marginTop:    4,
    borderRadius: 1,
  },
  tagline: {
    textAlign:    'center',
    lineHeight:   28,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  sportPills: {
    flexDirection: 'row',
    gap:           spacing.sm,
    flexWrap:      'wrap',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical:   4,
    borderRadius:      99,
    backgroundColor:   colors.surfaceElevated,
    borderWidth:       1,
    borderColor:       colors.border,
  },

  // Features
  featuresSection: {
    marginBottom: spacing['2xl'],
    gap:          spacing.md,
  },
  featureRow: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: colors.surface,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    gap:             spacing.md,
  },
  featureIconWrap: {
    width:         44,
    height:        44,
    borderRadius:  12,
    alignItems:    'center',
    justifyContent: 'center',
    flexShrink:    0,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
  },
  featureSub: {
    marginTop: 3,
    lineHeight: 18,
  },

  // Proof strip
  proofStrip: {
    flexDirection:   'row',
    backgroundColor: colors.surface,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingVertical: spacing.base,
    marginBottom:    spacing['2xl'],
    alignItems:      'center',
  },
  proofItem: {
    flex:    1,
    alignItems: 'center',
    gap:     2,
  },
  proofDivider: {
    width:           1,
    height:          32,
    backgroundColor: colors.border,
  },

  // CTAs
  ctaSection: {
    gap: 0,
  },
  ctaGap: {
    height: spacing.sm,
  },
  legalNote: {
    marginTop: spacing.base,
  },
});
