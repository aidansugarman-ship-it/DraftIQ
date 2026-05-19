import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { SelectionCard } from '@components/shared/SelectionCard';
import { OnboardingProgress } from '@components/shared/OnboardingProgress';
import { OnboardingFooter } from '@components/shared/OnboardingFooter';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useOnboardingStore } from '@store/useOnboardingStore';

type Style = 'winNow' | 'futureStars' | 'balanced' | 'starsScrubs';

const OPTIONS: Array<{
  id:    Style;
  label: string;
  desc:  string;
  emoji: string;
  color: string;
}> = [
  { id: 'winNow',      label: 'Win Now',         desc: 'Proven vets. Title window is open. Trade picks for points.',           emoji: '🏆', color: colors.gold },
  { id: 'futureStars', label: 'Future Stars',    desc: 'Young talent. Patience pays. Building for next year and beyond.',     emoji: '🌱', color: colors.green },
  { id: 'balanced',    label: 'Balanced',        desc: 'Mix of vets and upside. Compete every year. No extreme bets.',         emoji: '⚖️', color: colors.blue },
  { id: 'starsScrubs', label: 'Stars & Scrubs',  desc: 'Top-heavy. Pay up for elites. Fill the bottom with hot waiver adds.',  emoji: '💎', color: colors.purple },
];

export default function TeamStyleScreen() {
  const { teamStyle, setTeamStyle } = useOnboardingStore();
  const [selected, setSelected] = useState<Style | null>(teamStyle);

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

  const handleContinue = () => {
    if (!selected) return;
    setTeamStyle(selected);
    router.push('/(onboarding)/league-settings');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={3} totalSteps={5} showBack onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.header, heroStyle]}>
            <Text style={styles.title}>WHAT'S YOUR{'\n'}FANTASY STYLE?</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              Tunes every take to your roster philosophy. Change anytime.
            </Text>
          </Animated.View>

          <View style={styles.list}>
            {OPTIONS.map((opt) => (
              <SelectionCard
                key={opt.id}
                selected={selected === opt.id}
                onPress={() => setSelected(opt.id)}
                accentColor={opt.color}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.emojiBubble, { backgroundColor: `${opt.color}18` }]}>
                    <Text style={styles.emoji}>{opt.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color={colors.textPrimary}>{opt.label}</Text>
                  </View>
                </View>
                <Text variant="bodySmall" color={colors.textSecondary} style={styles.desc}>
                  {opt.desc}
                </Text>
              </SelectionCard>
            ))}
          </View>
        </ScrollView>

        <OnboardingFooter
          primaryLabel="Continue"
          primaryDisabled={!selected}
          onPrimary={handleContinue}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { paddingHorizontal: spacing.base, paddingBottom: 120 },
  header:    { marginTop: spacing.lg, marginBottom: spacing.xl },
  title:     { ...typography.heroSmall, color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle:  { lineHeight: 22 },
  list:      { gap: spacing.md },
  card:      { padding: spacing.base },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  emojiBubble: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji:     { fontSize: 24, lineHeight: 30 },
  desc:      { lineHeight: 19 },
});
