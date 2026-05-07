import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { OnboardingProgress } from '@components/shared/OnboardingProgress';
import { OnboardingFooter } from '@components/shared/OnboardingFooter';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useOnboardingStore } from '@store/useOnboardingStore';
import type { DraftPositionCategory } from '@types/draft';

interface CategoryDef {
  id:        DraftPositionCategory;
  label:     string;
  emoji:     string;
  rangeNote: string;
  insight:   string;
}

const CATEGORIES: CategoryDef[] = [
  {
    id:        'early',
    label:     'EARLY',
    emoji:     '🥇',
    rangeNote: 'Picks 1–4',
    insight:   'You get an elite player but wait 17+ picks for your second.',
  },
  {
    id:        'middle',
    label:     'MIDDLE',
    emoji:     '🎯',
    rangeNote: 'Picks 5–8',
    insight:   'Balanced. Skip the panic of last pick, dodge the gap of first.',
  },
  {
    id:        'late',
    label:     'LATE',
    emoji:     '🚀',
    rangeNote: 'Picks 9–12',
    insight:   'Back-to-back picks every round. Build chemistry early.',
  },
];

const getRangeForCategory = (cat: DraftPositionCategory, numTeams: number): number[] => {
  if (cat === 'early')  return Array.from({ length: Math.ceil(numTeams / 3) }, (_, i) => i + 1);
  if (cat === 'middle') {
    const start = Math.ceil(numTeams / 3) + 1;
    const end   = numTeams - Math.ceil(numTeams / 3);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  // late
  const start = numTeams - Math.ceil(numTeams / 3) + 1;
  return Array.from({ length: numTeams - start + 1 }, (_, i) => start + i);
};

const getCategoryForPosition = (n: number, numTeams: number): DraftPositionCategory => {
  const third = numTeams / 3;
  if (n <= Math.ceil(third))                return 'early';
  if (n > numTeams - Math.ceil(third))      return 'late';
  return 'middle';
};

export default function DraftPositionScreen() {
  const {
    numTeams,
    draftPositionCategory,
    draftPositionNumber,
    setDraftPosition,
  } = useOnboardingStore();

  const [category, setCategory] = useState<DraftPositionCategory | null>(draftPositionCategory);
  const [pickNum,  setPickNum]  = useState<number>(draftPositionNumber);

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

  const handleCategorySelect = (cat: DraftPositionCategory) => {
    Haptics.selectionAsync();
    setCategory(cat);
    // Default pick number to the middle of the range
    const range  = getRangeForCategory(cat, numTeams);
    const middle = range[Math.floor(range.length / 2)];
    setPickNum(middle);
  };

  const handlePickSelect = (n: number) => {
    Haptics.selectionAsync();
    setPickNum(n);
    setCategory(getCategoryForPosition(n, numTeams));
  };

  const handleContinue = () => {
    if (!category) return;
    setDraftPosition(category, pickNum);
    router.push('/(onboarding)/notifications');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={4} totalSteps={5} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, animStyle]}>
            <Text style={styles.title}>WHERE ARE YOU{'\n'}DRAFTING?</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              Your draft slot changes which players we recommend each round.
            </Text>
          </Animated.View>

          {/* Category cards */}
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((c) => {
              const isSelected = category === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => handleCategorySelect(c.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{c.emoji}</Text>
                  <Text variant="h4" color={isSelected ? colors.green : colors.textPrimary}>
                    {c.label}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary} style={styles.categoryRange}>
                    {c.rangeNote.replace('Picks', `Picks of ${numTeams}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Insight */}
          {category && (
            <View style={styles.insightCard}>
              <Text variant="labelSmall" color={colors.green} style={styles.insightLabel}>
                STRATEGIC NOTE
              </Text>
              <Text variant="body" color={colors.textPrimary} style={styles.insightText}>
                {CATEGORIES.find((c) => c.id === category)?.insight}
              </Text>
            </View>
          )}

          {/* Exact pick selector */}
          <View style={styles.exactWrap}>
            <Text variant="label" color={colors.textTertiary} style={styles.exactLabel}>
              OR PICK YOUR EXACT POSITION
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.numberRow}
            >
              {Array.from({ length: numTeams }).map((_, i) => {
                const n = i + 1;
                const isSelected = pickNum === n && category !== null;
                return (
                  <TouchableOpacity
                    key={n}
                    onPress={() => handlePickSelect(n)}
                    activeOpacity={0.85}
                    style={[
                      styles.numberPill,
                      isSelected && styles.numberPillSelected,
                    ]}
                  >
                    <Text
                      style={[styles.numberText, isSelected && styles.numberTextSelected]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <OnboardingFooter
        primaryLabel={
          category ? `Pick ${pickNum} of ${numTeams} — Continue` : 'Pick a draft slot'
        }
        onPrimary={handleContinue}
        primaryDisabled={!category}
      />
    </View>
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
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize:    40,
    lineHeight:  44,
    color:       colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { lineHeight: 24 },

  categoryGrid: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  categoryCard: {
    flex:            1,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems:      'center',
    gap:             4,
  },
  categoryCardSelected: {
    borderColor:     colors.green,
    backgroundColor: 'rgba(0,255,135,0.08)',
  },
  categoryEmoji: {
    fontSize:    32,
    marginBottom: 4,
  },
  categoryRange: {
    marginTop:  2,
    textAlign: 'center',
  },

  insightCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.base,
    gap:             spacing.xs,
    marginBottom:    spacing.lg,
  },
  insightLabel: { letterSpacing: 1 },
  insightText:  { lineHeight: 22 },

  exactWrap: {
    marginTop: spacing.md,
  },
  exactLabel: {
    letterSpacing: 1,
    marginBottom:  spacing.md,
  },
  numberRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    paddingRight:  spacing.base,
  },
  numberPill: {
    width:           54,
    height:          54,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  numberPillSelected: {
    backgroundColor: colors.green,
    borderColor:     colors.green,
  },
  numberText: {
    ...typography.h3,
    fontSize:    22,
    color:       colors.textPrimary,
  },
  numberTextSelected: {
    color: colors.background,
  },

  bottomSpacer: { height: spacing.xl },
});
