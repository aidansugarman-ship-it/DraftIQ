import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useStreakStore } from '@store/useStreakStore';
import { useGmHistoryStore } from '@store/useGmHistoryStore';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { useTakesLog } from '@store/useTakesLog';
import { useYahooStore } from '@store/useYahooStore';

/**
 * DraftIQ Score — one number to flex.
 * Composite of: hit rate × highest GM score × engagement
 * (favorites + logged takes + connected leagues).
 */
export function DraftIQScoreCard() {
  const calls       = useStreakStore(s => s.calls);
  const snapshots   = useGmHistoryStore(s => s.snapshots);
  const favorites   = useFavoritesStore(s => s.favorites);
  const takes       = useTakesLog(s => s.takes);
  const yahooActive = useYahooStore(s => s.active);

  const { score, grade, breakdown } = useMemo(() => {
    // Hit rate (0-100), defaults to 50 if you've made no calls yet
    const resolved = calls.filter(c => c.outcome);
    const hits     = resolved.filter(c => c.outcome === 'hit').length;
    const hitPct   = resolved.length > 0 ? Math.round((hits / resolved.length) * 100) : 50;

    // Best recent GM Score across all leagues
    const recentScores = snapshots
      .filter(s => Date.now() - s.ts < 1000 * 60 * 60 * 24 * 14)
      .map(s => s.score);
    const bestGm = recentScores.length > 0 ? Math.max(...recentScores) : 50;

    // Engagement — capped 100
    const leagues = Object.keys(yahooActive).length;
    const engagement = Math.min(100,
        favorites.length * 4   // each favorite = +4
      + takes.length * 0.5     // each logged take = +0.5
      + leagues * 12,          // each connected league = +12
    );

    // Final: 40% hit rate + 40% best GM + 20% engagement
    const final = Math.round(hitPct * 0.4 + bestGm * 0.4 + engagement * 0.2);

    const g = final >= 90 ? 'S' : final >= 80 ? 'A' : final >= 70 ? 'B' : final >= 60 ? 'C' : 'D';
    return {
      score: final,
      grade: g,
      breakdown: { hitPct, bestGm, engagement: Math.round(engagement) },
    };
  }, [calls, snapshots, favorites, takes, yahooActive]);

  const color = score >= 80 ? colors.green : score >= 65 ? colors.gold : colors.coral;

  return (
    <View style={[styles.wrap, { borderColor: `${color}55` }]}>
      <View style={styles.headRow}>
        <Ionicons name="trophy" size={14} color={color} />
        <Text variant="labelSmall" style={{ color, letterSpacing: 1.2, fontWeight: '800' }}>
          DRAFTIQ SCORE
        </Text>
      </View>

      <View style={styles.numRow}>
        <Text style={[styles.bigNum, { color }]}>{score}</Text>
        <View style={[styles.gradePill, { backgroundColor: `${color}1A`, borderColor: `${color}55` }]}>
          <Text style={[styles.gradeText, { color }]}>{grade}</Text>
        </View>
      </View>

      <View style={styles.legend}>
        <LegendStat label="HIT RATE" value={`${breakdown.hitPct}%`} />
        <LegendStat label="GM PEAK"  value={String(breakdown.bestGm)} />
        <LegendStat label="ENGAGE"   value={String(breakdown.engagement)} />
      </View>
    </View>
  );
}

function LegendStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={legendStyles.col}>
      <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 9, letterSpacing: 0.6 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1.5,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.sm,
  },
  numRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    marginBottom:  spacing.md,
  },
  bigNum: {
    fontSize:      56,
    fontWeight:    '800',
    letterSpacing: -2,
  },
  gradePill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   4,
    borderRadius:      radius.md,
    borderWidth:       1,
  },
  gradeText: {
    fontSize:   24,
    fontWeight: '800',
  },
  legend: {
    flexDirection:  'row',
    justifyContent: 'space-around',
  },
});

const legendStyles = StyleSheet.create({
  col: { alignItems: 'center', gap: 2 },
});
