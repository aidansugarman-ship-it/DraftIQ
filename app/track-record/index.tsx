import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useStreakStore } from '@store/useStreakStore';

/**
 * Track Record — the grading loop. Lists the AI's calls; you mark each a
 * hit or miss. Resolved calls feed the hit-rate, the DraftIQ Score, the
 * Weekly Wrap, and (crucially) the AI's own prompt memory so it can flex
 * a hot streak or own a cold one.
 */
export default function TrackRecordScreen() {
  const sport   = useUserStore(s => s.currentSport);
  const calls   = useStreakStore(s => s.calls);
  const resolve = useStreakStore(s => s.resolve);

  const { pending, resolved, hits, pct } = useMemo(() => {
    const pending  = calls.filter(c => !c.outcome);
    const resolved = calls.filter(c => c.outcome === 'hit' || c.outcome === 'miss');
    const hits = resolved.filter(c => c.outcome === 'hit').length;
    const pct = resolved.length ? Math.round((hits / resolved.length) * 100) : 0;
    return { pending, resolved, hits, pct };
  }, [calls]);

  function grade(id: string, outcome: 'hit' | 'miss') {
    Haptics.impactAsync(
      outcome === 'hit' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
    resolve(id, outcome);
  }

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Track Record" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>DID THE AI{'\n'}CALL IT?</Text>
          <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
            Grade the calls. Your hit-rate, GM Score, and how the AI talks to you
            all key off this — be honest.
          </Text>

          {/* Hit-rate header */}
          {resolved.length > 0 && (
            <View style={[styles.rateCard, { borderColor: `${pct >= 60 ? colors.green : pct >= 40 ? colors.gold : colors.coral}88` }]}>
              <Text style={[styles.rateNum, { color: pct >= 60 ? colors.green : pct >= 40 ? colors.gold : colors.coral }]}>
                {pct}%
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>
                  {hits} / {resolved.length} calls hit
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {pct >= 60 ? "The AI's cooking — it'll flex this." : pct >= 40 ? 'Solid, room to climb.' : 'Cold stretch — it knows.'}
                </Text>
              </View>
            </View>
          )}

          {/* Pending */}
          <Text style={styles.sectionLabel}>NEEDS A VERDICT · {pending.length}</Text>
          {pending.length === 0 ? (
            <EmptyState emoji="✅" title="All caught up" body="No calls waiting to be graded. Open your sport hubs to generate more." />
          ) : (
            pending.map(c => (
              <Animated.View key={c.id} entering={FadeIn} layout={Layout} style={styles.callCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Text style={{ fontSize: 13 }}>{SPORTS[c.sport].emoji}</Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    {SPORTS[c.sport].shortLabel} · {new Date(c.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text variant="bodyMedium" color={colors.textPrimary} style={{ lineHeight: 21, marginBottom: spacing.sm }}>
                  {c.headline}
                </Text>
                <View style={styles.gradeRow}>
                  <TouchableOpacity style={[styles.gradeBtn, styles.hitBtn]} onPress={() => grade(c.id, 'hit')} activeOpacity={0.8}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                    <Text variant="bodySmallMedium" style={{ color: colors.green }}>HIT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.gradeBtn, styles.missBtn]} onPress={() => grade(c.id, 'miss')} activeOpacity={0.8}>
                    <Ionicons name="close-circle" size={16} color={colors.coral} />
                    <Text variant="bodySmallMedium" style={{ color: colors.coral }}>MISS</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))
          )}

          {/* Resolved history */}
          {resolved.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>GRADED · {resolved.length}</Text>
              {resolved.slice(0, 20).map(c => (
                <View key={c.id} style={styles.resolvedRow}>
                  <Ionicons
                    name={c.outcome === 'hit' ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={c.outcome === 'hit' ? colors.green : colors.coral}
                  />
                  <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }} numberOfLines={2}>
                    {c.headline}
                  </Text>
                </View>
              ))}
            </>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  title: {
    fontSize: 34, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: -0.5, lineHeight: 38, marginTop: spacing.md,
  },
  rateCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5,
    padding: spacing.base, marginBottom: spacing.lg,
  },
  rateNum: { fontSize: 40, fontWeight: '900', letterSpacing: -2 },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textTertiary,
    letterSpacing: 1.2, marginBottom: spacing.sm,
  },
  callCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, padding: spacing.base, marginBottom: spacing.sm,
  },
  gradeRow: { flexDirection: 'row', gap: spacing.sm },
  gradeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1,
  },
  hitBtn:  { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}55` },
  missBtn: { backgroundColor: `${colors.coral}12`, borderColor: `${colors.coral}55` },
  resolvedRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
});
