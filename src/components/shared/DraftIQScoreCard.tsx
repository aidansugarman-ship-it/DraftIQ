import { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useStreakStore } from '@store/useStreakStore';
import { useGmHistoryStore } from '@store/useGmHistoryStore';
import { useFavoritesStore } from '@store/useFavoritesStore';
import { useTakesLog } from '@store/useTakesLog';
import { useYahooStore } from '@store/useYahooStore';

/**
 * DraftIQ Score — the flex stat, hero treatment.
 * Composite of: hit rate × highest GM score × engagement.
 * Tap "?" → modal with the formula breakdown.
 */
export function DraftIQScoreCard() {
  const calls       = useStreakStore(s => s.calls);
  const snapshots   = useGmHistoryStore(s => s.snapshots);
  const favorites   = useFavoritesStore(s => s.favorites);
  const takes       = useTakesLog(s => s.takes);
  const yahooActive = useYahooStore(s => s.active);

  const [showInfo, setShowInfo] = useState(false);

  const { score, grade, breakdown } = useMemo(() => {
    const resolved = calls.filter(c => c.outcome);
    const hits     = resolved.filter(c => c.outcome === 'hit').length;
    const hitPct   = resolved.length > 0 ? Math.round((hits / resolved.length) * 100) : 50;

    const recentScores = snapshots
      .filter(s => Date.now() - s.ts < 1000 * 60 * 60 * 24 * 14)
      .map(s => s.score);
    const bestGm = recentScores.length > 0 ? Math.max(...recentScores) : 50;

    const leagues = Object.keys(yahooActive).length;
    const engagement = Math.min(100,
        favorites.length * 4
      + takes.length * 0.5
      + leagues * 12,
    );

    const final = Math.round(hitPct * 0.4 + bestGm * 0.4 + engagement * 0.2);
    const g = final >= 90 ? 'S' : final >= 80 ? 'A' : final >= 70 ? 'B' : final >= 60 ? 'C' : 'D';
    return {
      score: final,
      grade: g,
      breakdown: { hitPct, bestGm, engagement: Math.round(engagement) },
    };
  }, [calls, snapshots, favorites, takes, yahooActive]);

  const color = score >= 80 ? colors.green : score >= 65 ? colors.gold : colors.coral;
  const flair = score >= 80 ? 'COOKING' : score >= 65 ? 'STEADY' : 'GRINDING';

  return (
    <>
      <Animated.View entering={FadeIn.duration(400)} style={[styles.wrap, { borderColor: `${color}77` }]}>
        <LinearGradient
          colors={[`${color}25`, `${color}06`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trophy" size={14} color={color} />
            <Text style={[styles.headLabel, { color }]}>DRAFTIQ SCORE</Text>
          </View>
          <TouchableOpacity onPress={() => setShowInfo(true)} hitSlop={10}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroRow}>
          <Text style={[styles.bigNum, { color }]}>{score}</Text>
          <View style={styles.heroRight}>
            <View style={[styles.gradePill, { backgroundColor: `${color}22`, borderColor: `${color}88` }]}>
              <Text style={[styles.gradeText, { color }]}>{grade}</Text>
            </View>
            <Text style={[styles.flair, { color }]}>{flair}</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <LegendStat label="HIT RATE" value={`${breakdown.hitPct}%`} />
          <View style={styles.divider} />
          <LegendStat label="GM PEAK"  value={String(breakdown.bestGm)} />
          <View style={styles.divider} />
          <LegendStat label="ENGAGE"   value={String(breakdown.engagement)} />
        </View>
      </Animated.View>

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={infoStyles.overlay}>
          <View style={infoStyles.sheet}>
            <View style={infoStyles.head}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={16} color={colors.green} />
                <Text variant="bodyMedium" color={colors.textPrimary}>DraftIQ Score</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInfo(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ paddingBottom: spacing.md }}>
              <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22, marginBottom: spacing.md }}>
                Your DraftIQ Score is one number — 0 to 100 — that captures how sharp of a fantasy GM you are right now. It rolls up three things:
              </Text>

              <FormulaRow weight="40%" label="HIT RATE" desc="% of resolved AI calls you've taken that worked out" />
              <FormulaRow weight="40%" label="GM PEAK"  desc="Your best AI-graded roster rating over the last 14 days" />
              <FormulaRow weight="20%" label="ENGAGE"   desc="Favorites + logged takes + connected leagues" />

              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.md, lineHeight: 17 }}>
                Grades: 90+ = S · 80+ = A · 70+ = B · 60+ = C · below = D. Hit rate defaults to 50 until you resolve calls.
              </Text>
            </ScrollView>
            <TouchableOpacity style={infoStyles.gotIt} onPress={() => setShowInfo(false)} activeOpacity={0.8}>
              <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800' }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function LegendStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={legendStyles.col}>
      <Text style={legendStyles.value}>{value}</Text>
      <Text style={legendStyles.label}>{label}</Text>
    </View>
  );
}

function FormulaRow({ weight, label, desc }: { weight: string; label: string; desc: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.weight}>{weight}</Text>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmallMedium" color={colors.textPrimary}>{label}</Text>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2, lineHeight: 17 }}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1.5,
    padding:         spacing.lg,
    marginBottom:    spacing.lg,
    overflow:        'hidden',
  },
  headRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
  },
  headLabel: {
    fontSize:      11,
    fontWeight:    '800',
    letterSpacing: 1.4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing.md,
    marginBottom:  spacing.md,
  },
  bigNum: {
    fontSize:      88,
    fontWeight:    '900',
    letterSpacing: -4,
    lineHeight:    92,
  },
  heroRight: {
    flex:           1,
    alignItems:     'flex-end',
    paddingBottom:  8,
    gap:            6,
  },
  gradePill: {
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderRadius:      radius.md,
    borderWidth:       1.5,
  },
  gradeText: {
    fontSize:   30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  flair: {
    fontSize:      10,
    fontWeight:    '800',
    letterSpacing: 1.6,
  },
  legendRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-around',
    paddingTop:      spacing.md,
    borderTopWidth:  1,
    borderTopColor:  `${colors.border}AA`,
  },
  divider: {
    width:           1,
    height:          24,
    backgroundColor: colors.border,
  },
});

const legendStyles = StyleSheet.create({
  col:   { alignItems: 'center', gap: 2 },
  value: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  label: { fontSize: 9,  fontWeight: '700', color: colors.textTertiary, letterSpacing: 1 },
});

const infoStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    padding:         spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
  },
  head: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}55`,
  },
  weight: {
    fontSize:      22,
    fontWeight:    '900',
    color:         colors.green,
    width:         60,
    letterSpacing: -0.5,
  },
  gotIt: {
    backgroundColor: colors.green,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
    marginTop:       spacing.md,
  },
});
