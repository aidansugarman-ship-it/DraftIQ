import { useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { SelectionCard } from '@components/shared/SelectionCard';
import { OnboardingProgress } from '@components/shared/OnboardingProgress';
import { OnboardingFooter } from '@components/shared/OnboardingFooter';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { ARCHETYPES, type TeamArchetype } from '@types/draft';
import { useOnboardingStore } from '@store/useOnboardingStore';

const ARCHETYPE_ORDER: TeamArchetype[] = [
  'balanced',
  'rb-heavy',
  'wr-heavy',
  'zero-rb',
  'stars-scrubs',
  'upside-chaser',
  'safe-floor',
];

export default function ArchetypeScreen() {
  const { archetype, setArchetype } = useOnboardingStore();

  const opacity = useSharedValue(0);
  const ty      = useSharedValue(16);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value      = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={3} totalSteps={5} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, animStyle]}>
            <Text style={styles.title}>WHAT'S YOUR{'\n'}DRAFT STYLE?</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              The AI builds your personalized draft board around this strategy.
            </Text>
          </Animated.View>

          {/* Recommended pick */}
          <View style={styles.recBanner}>
            <Text style={styles.recEmoji}>💡</Text>
            <View style={styles.recText}>
              <Text variant="labelSmall" color={colors.green} style={styles.recLabel}>
                NOT SURE?
              </Text>
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.recBody}>
                Pick <Text variant="bodySmallMedium" color={colors.textPrimary}>Balanced</Text> —
                it works for any league and reacts to the board.
              </Text>
            </View>
          </View>

          <View style={styles.list}>
            {ARCHETYPE_ORDER.map((id, idx) => {
              const def = ARCHETYPES[id];
              return (
                <ArchetypeRow
                  key={id}
                  id={id}
                  delay={idx * 50}
                  selected={archetype === id}
                  onPress={() => setArchetype(id)}
                  emoji={def.emoji}
                  label={def.label}
                  description={def.description}
                  bestFor={def.bestFor}
                />
              );
            })}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <OnboardingFooter
        primaryLabel={archetype ? 'Continue' : 'Pick a strategy'}
        onPrimary={() => router.push('/(onboarding)/draft-position')}
        primaryDisabled={!archetype}
      />
    </View>
  );
}

function ArchetypeRow({
  id, delay, selected, onPress, emoji, label, description, bestFor,
}: {
  id: TeamArchetype;
  delay: number;
  selected: boolean;
  onPress: () => void;
  emoji: string;
  label: string;
  description: string;
  bestFor: string[];
}) {
  const opacity = useSharedValue(0);
  const tx      = useSharedValue(-12);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    tx.value      = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <SelectionCard selected={selected} onPress={onPress} style={rowStyles.card}>
        <View style={rowStyles.inner}>
          <View style={rowStyles.iconWrap}>
            <Text style={rowStyles.emoji}>{emoji}</Text>
          </View>
          <View style={rowStyles.body}>
            <Text variant="bodyMedium" color={colors.textPrimary} style={rowStyles.label}>
              {label}
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={rowStyles.desc}>
              {description}
            </Text>
            <View style={rowStyles.tagRow}>
              {bestFor.slice(0, 2).map((tag) => (
                <View key={tag} style={rowStyles.tag}>
                  <Text variant="labelSmall" color={colors.textTertiary}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </SelectionCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     200,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    fontSize:    40,
    lineHeight:  44,
    color:       colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { lineHeight: 24 },

  recBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(0,255,135,0.06)',
    borderWidth:     1,
    borderColor:     'rgba(0,255,135,0.18)',
    borderRadius:    radius.md,
    padding:         spacing.md,
    gap:             spacing.sm,
    marginBottom:    spacing.lg,
  },
  recEmoji: { fontSize: 22 },
  recText:  { flex: 1, gap: 2 },
  recLabel: { letterSpacing: 0.8 },
  recBody:  { lineHeight: 18 },

  list:  { gap: spacing.sm },
  bottomSpacer: { height: spacing.xl },
});

const rowStyles = StyleSheet.create({
  card: {
    paddingRight: spacing['2xl'],
  },
  inner: {
    flexDirection: 'row',
    gap:           spacing.md,
    alignItems:    'center',
  },
  iconWrap: {
    width:         48,
    height:        48,
    borderRadius:  12,
    backgroundColor: colors.surfaceElevated,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  body: {
    flex: 1,
    gap:  4,
  },
  label: {
    fontSize: 16,
  },
  desc: {
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: 'row',
    gap:           spacing.xs,
    marginTop:     4,
    flexWrap:      'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      99,
    backgroundColor:   colors.surfaceElevated,
    borderWidth:       1,
    borderColor:       colors.border,
  },
});
