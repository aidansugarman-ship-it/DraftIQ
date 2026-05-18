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

type Level = 'beginner' | 'experienced';

const OPTIONS: Array<{
  id:      Level;
  label:   string;
  tagline: string;
  desc:    string;
  emoji:   string;
}> = [
  {
    id:      'beginner',
    label:   'Just getting into fantasy',
    tagline: 'Walk me through it',
    desc:    'The app explains positions, scoring, strategy, and walks you through every decision. AI takes are longer and beginner-friendly.',
    emoji:   '🌱',
  },
  {
    id:      'experienced',
    label:   "I've done this before",
    tagline: 'Cut to the chase',
    desc:    'Skip the basics. AI calls are sharp and assume you know terms like ADP, target share, BABIP, xG. Get the takes, not the textbook.',
    emoji:   '🎯',
  },
];

export default function ExperienceScreen() {
  const { experienceLevel, setExperienceLevel } = useOnboardingStore();
  const [selected, setSelected] = useState<Level | null>(experienceLevel);

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
    setExperienceLevel(selected);
    router.push('/(onboarding)/league-settings');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={2} totalSteps={4} showBack onBack={() => router.back()} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, heroStyle]}>
            <Text style={styles.title}>HOW MUCH{'\n'}FANTASY{'\n'}HAVE YOU PLAYED?</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              We'll tune the app and the AI to match. You can change this later.
            </Text>
          </Animated.View>

          <View style={styles.list}>
            {OPTIONS.map((opt) => (
              <SelectionCard
                key={opt.id}
                selected={selected === opt.id}
                onPress={() => setSelected(opt.id)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color={colors.textPrimary}>{opt.label}</Text>
                    <Text variant="caption" color={colors.green} style={styles.tagline}>
                      {opt.tagline.toUpperCase()}
                    </Text>
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
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     120,
  },
  header: {
    marginTop:    spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heroSmall,
    color:        colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    padding: spacing.base,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    marginBottom:  spacing.sm,
  },
  emoji: {
    fontSize: 32,
  },
  tagline: {
    letterSpacing: 0.8,
    marginTop:     2,
  },
  desc: {
    lineHeight: 19,
  },
});
