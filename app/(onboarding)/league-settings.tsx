import { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
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
import { SPORTS } from '@constants/sports';
import { useOnboardingStore } from '@store/useOnboardingStore';

const TEAM_OPTIONS = [8, 10, 12, 14, 16] as const;

interface PillGroupProps<T extends string | number> {
  options:    readonly { id: T; label: string; sub?: string }[];
  value:      T | null;
  onSelect:   (v: T) => void;
}

function PillGroup<T extends string | number>({ options, value, onSelect }: PillGroupProps<T>) {
  return (
    <View style={pillStyles.row}>
      {options.map(({ id, label, sub }) => {
        const selected = value === id;
        return (
          <TouchableOpacity
            key={String(id)}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(id);
            }}
            activeOpacity={0.85}
            style={[
              pillStyles.pill,
              selected && pillStyles.pillSelected,
            ]}
          >
            <Text
              variant="bodyMedium"
              color={selected ? colors.background : colors.textPrimary}
              style={pillStyles.pillLabel}
            >
              {label}
            </Text>
            {sub && (
              <Text
                variant="caption"
                color={selected ? 'rgba(13,13,15,0.7)' : colors.textTertiary}
              >
                {sub}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function LeagueSettingsScreen() {
  const {
    primarySport,
    scoringType, setScoringType,
    numTeams,    setNumTeams,
    format,      setFormat,
    isDynasty,   setIsDynasty,
  } = useOnboardingStore();

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

  // Scoring options come from the sport's definition — keeps it sport-agnostic
  const scoringOptions = useMemo(() => {
    return SPORTS[primarySport].scoringTypes.map((s) => ({
      id:    s.id,
      label: s.label,
      sub:   s.description,
    }));
  }, [primarySport]);

  const teamOptions = TEAM_OPTIONS.map((n) => ({
    id:    n,
    label: String(n),
  }));

  const formatOptions = [
    { id: 'snake'   as const, label: 'Snake',   sub: 'Standard draft order' },
    { id: 'auction' as const, label: 'Auction', sub: 'Budget-based bidding' },
  ];

  const isValid = !!scoringType;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={2} totalSteps={5} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, animStyle]}>
            <Text style={styles.title}>YOUR LEAGUE{'\n'}SETUP.</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              We'll personalize your draft board around these settings.
            </Text>
          </Animated.View>

          {/* ── Scoring Type ───────────────────────────────────────────── */}
          <Section
            label="Scoring Type"
            sport={SPORTS[primarySport].shortLabel}
          >
            <PillGroup
              options={scoringOptions}
              value={scoringType}
              onSelect={setScoringType}
            />
          </Section>

          {/* ── Team Count ─────────────────────────────────────────────── */}
          <Section label="Number of Teams">
            <PillGroup
              options={teamOptions}
              value={numTeams}
              onSelect={setNumTeams}
            />
          </Section>

          {/* ── Format ─────────────────────────────────────────────────── */}
          <Section label="Draft Format">
            <PillGroup
              options={formatOptions}
              value={format}
              onSelect={setFormat}
            />
          </Section>

          {/* ── Dynasty Toggle ─────────────────────────────────────────── */}
          <View style={styles.dynastyCard}>
            <View style={styles.dynastyText}>
              <View style={styles.dynastyHeader}>
                <Text variant="bodyMedium" color={colors.textPrimary}>
                  Dynasty / Keeper League
                </Text>
                <View style={styles.gmBadge}>
                  <Text variant="labelSmall" color={colors.gold}>👑 GM</Text>
                </View>
              </View>
              <Text variant="bodySmall" color={colors.textSecondary} style={styles.dynastySub}>
                Multi-year rosters. Unlocks dynasty rookie rankings and long-term value projections.
              </Text>
            </View>
            <Switch
              value={isDynasty}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setIsDynasty(v);
              }}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <OnboardingFooter
        primaryLabel={isValid ? 'Continue' : 'Pick a scoring type'}
        onPrimary={() => router.push('/(onboarding)/archetype')}
        primaryDisabled={!isValid}
      />
    </View>
  );
}

function Section({
  label, sport, children,
}: {
  label: string;
  sport?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sectionStyles.wrap}>
      <View style={sectionStyles.headerRow}>
        <Text variant="label" color={colors.textTertiary} style={sectionStyles.label}>
          {label.toUpperCase()}
        </Text>
        {sport && (
          <Text variant="labelSmall" color={colors.textTertiary}>{sport}</Text>
        )}
      </View>
      {children}
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
  subtitle: {
    lineHeight: 24,
  },

  dynastyCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.base,
    marginTop:       spacing.lg,
  },
  dynastyText: { flex: 1 },
  dynastyHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  spacing.xs,
  },
  dynastySub: {
    lineHeight: 18,
  },
  gmBadge: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderRadius:    99,
    paddingHorizontal: 8,
    paddingVertical:  2,
    borderWidth:      1,
    borderColor:      'rgba(201,168,76,0.4)',
  },
  bottomSpacer: { height: spacing.xl },
});

const sectionStyles = StyleSheet.create({
  wrap: { marginTop: spacing.lg },
  headerRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.md,
  },
  label: { letterSpacing: 1 },
});

const pillStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  pill: {
    flexGrow:    1,
    flexBasis:   '30%',
    minHeight:   54,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.border,
    borderRadius:      radius.md,
    alignItems:        'center',
    justifyContent:    'center',
    gap:               2,
  },
  pillSelected: {
    backgroundColor: colors.green,
    borderColor:     colors.green,
  },
  pillLabel: {
    letterSpacing: 0.3,
  },
});
