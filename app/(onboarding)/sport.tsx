import { useState, useEffect } from 'react';
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
import { spacing } from '@constants/spacing';
import { typography } from '@constants/typography';
import { SPORTS, SPORT_IDS, type SportId } from '@constants/sports';
import { useOnboardingStore } from '@store/useOnboardingStore';

const isInSeason = (sportId: SportId): boolean => {
  const month = new Date().getMonth() + 1; // 1-12
  const { startMonth, endMonth } = SPORTS[sportId].season;
  return startMonth <= endMonth
    ? month >= startMonth && month <= endMonth
    : month >= startMonth || month <= endMonth;
};

export default function SportScreen() {
  const { preferredSports, setPreferredSports } = useOnboardingStore();
  const [selected, setSelected] = useState<SportId[]>(preferredSports);

  const heroOpacity = useSharedValue(0);
  const heroY       = useSharedValue(16);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    heroY.value       = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);

  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOpacity.value,
    transform: [{ translateY: heroY.value }],
  }));

  const toggle = (id: SportId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    setPreferredSports(selected);
    router.push('/(onboarding)/league-settings');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={1} totalSteps={5} showBack={false} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, heroStyle]}>
            <Text style={styles.title}>WHICH SPORTS{'\n'}DO YOU PLAY?</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              Pick one or more. Your first selection becomes your primary sport.
            </Text>
          </Animated.View>

          <View style={styles.grid}>
            {SPORT_IDS.map((id, idx) => {
              const sport      = SPORTS[id];
              const isSelected = selected.includes(id);
              const isPrimary  = isSelected && selected[0] === id;
              const inSeason   = isInSeason(id);

              return (
                <SelectionCard
                  key={id}
                  selected={isSelected}
                  onPress={() => toggle(id)}
                  style={styles.sportCard}
                >
                  <View style={styles.sportHeader}>
                    <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                    {inSeason && (
                      <View style={styles.seasonBadge}>
                        <View style={styles.seasonDot} />
                        <Text variant="labelSmall" color={colors.green}>LIVE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.sportText}>
                    <Text style={styles.sportShort}>{sport.shortLabel}</Text>
                    <Text variant="bodySmall" color={colors.textSecondary} style={styles.sportFull}>
                      {sport.label.replace(`${sport.shortLabel} `, '')}
                    </Text>
                  </View>

                  {isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text variant="labelSmall" color={colors.background}>PRIMARY</Text>
                    </View>
                  )}
                </SelectionCard>
              );
            })}
          </View>

          {selected.length > 1 && (
            <Text variant="bodySmall" color={colors.textTertiary} align="center" style={styles.hint}>
              Tap your most-played sport first to make it primary.
            </Text>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <OnboardingFooter
        primaryLabel={
          selected.length === 0       ? 'Pick a sport to continue'
          : selected.length === 1     ? `Continue with ${SPORTS[selected[0]].shortLabel}`
                                       : `Continue with ${selected.length} sports`
        }
        onPrimary={handleContinue}
        primaryDisabled={selected.length === 0}
      />
    </View>
  );
}

const CARD_GAP = spacing.md;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     200,
  },

  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize:    40,
    lineHeight:  44,
    color:       colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 24,
  },

  grid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           CARD_GAP,
  },
  sportCard: {
    width:    `${(100 - 4) / 2}%`,  // 2 columns with gap
    aspectRatio: 1,
    justifyContent: 'space-between',
  },
  sportHeader: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-between',
  },
  sportEmoji: {
    fontSize: 40,
  },
  seasonBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: 'rgba(0,255,135,0.12)',
    borderRadius:    99,
    paddingHorizontal: 8,
    paddingVertical:  3,
  },
  seasonDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.green,
  },
  sportText: {
    gap: 2,
  },
  sportShort: {
    ...typography.h2,
    fontSize:   28,
    lineHeight: 30,
    color:      colors.textPrimary,
  },
  sportFull: {
    letterSpacing: 0.2,
  },
  primaryBadge: {
    position: 'absolute',
    bottom:   spacing.md,
    right:    spacing.md,
    backgroundColor: colors.green,
    borderRadius:    99,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  hint: {
    marginTop: spacing.lg,
  },
  bottomSpacer: { height: spacing.xl },
});
