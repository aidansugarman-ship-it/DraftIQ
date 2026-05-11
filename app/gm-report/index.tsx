import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { gemini } from '@services/gemini';
import { useGeminiTake } from '@hooks/useGeminiTake';
import { useMyRosterNames } from '@hooks/useSleeperData';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { canAccess } from '@constants/tiers';
import { useUserStore } from '@store/useUserStore';

// ─── Mock report data ─────────────────────────────────────────────────────────

const MOCK_REPORT = {
  week:        12,
  generatedAt: 'Tuesday, Nov 19 · 6:00 AM',
  overallGrade: 'B+',
  headline: 'Your team is playoff-bound — but your RB depth is a ticking clock.',
  summary:
    'Strong QB and WR production carried you this week, but two key RBs are showing wear. You need a wire pickup at RB2 before the deadline or you\'re one injury from missing the playoffs.',

  positionGrades: [
    { pos: 'QB',  grade: 'A',  note: 'Allen went off. 41 pts Week 9 was your season-high.' },
    { pos: 'RB',  grade: 'C+', note: 'Pollard and Achane both underwhelmed. Depth is thin.' },
    { pos: 'WR',  grade: 'A-', note: 'Jefferson + Nacua giving you a elite 1-2 punch.' },
    { pos: 'TE',  grade: 'B',  note: 'LaPorta is reliable but not a difference-maker.' },
    { pos: 'K',   grade: 'B+', note: 'Consistent. Often overlooked but never a liability.' },
    { pos: 'DEF', grade: 'B-', note: 'Streaming has worked but you need a better matchup Week 13.' },
  ],

  boldMoves: [
    {
      id: 'm1',
      emoji: '⚡',
      title: 'Drop Pollard, Add Jaylen Wright',
      body: 'Wright has back-to-back 18+ carry weeks. Pollard is splitting carries and your week 13 matchup is brutal. Make the swap now while Wright is still available.',
      urgency: 'high' as const,
    },
    {
      id: 'm2',
      emoji: '🔄',
      title: 'Trade Kelce for a RB2',
      body: 'Kelce is producing but TE is a position of depth on waivers. Flip him for an RB2 while his value is at peak — you can replace him with LaPorta full-time.',
      urgency: 'medium' as const,
    },
    {
      id: 'm3',
      emoji: '📡',
      title: 'Stream Dallas DEF vs. Washington',
      body: 'Washington turns the ball over 2.3 times per game over the last 4 weeks. Dallas is a top-5 streaming option this week. Drop your current DEF.',
      urgency: 'low' as const,
    },
  ],

  flags: [
    { id: 'f1', type: 'warning' as const, label: 'Achane: declining snap count', body: 'Used under 50% of snaps last 2 weeks. Monitor.' },
    { id: 'f2', type: 'danger'  as const, label: 'RB bye week collision', body: 'Two of your RBs have byes in Week 14. Plan now.' },
    { id: 'f3', type: 'good'    as const, label: 'Favorable 3-week stretch', body: 'Your WRs face bottom-10 defenses Weeks 12–14.' },
  ],

  weeklyOutlook: 'Projected 142 pts this week. Your matchup is winnable — opponent projects at 128. Key to victory: Allen needs 30+ and your WRs need to hold up against a decent CB corps.',
};

// ─── Grade color ──────────────────────────────────────────────────────────────

function gradeColor(g: string) {
  if (g.startsWith('A')) return colors.green;
  if (g.startsWith('B')) return colors.gold;
  return colors.coral;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function GradeCard({ pos, grade, note, delay }: { pos: string; grade: string; note: string; delay: number }) {
  const op = useSharedValue(0);
  const ty = useSharedValue(8);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 350 }));
    ty.value = withDelay(delay, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));
  const gc = gradeColor(grade);

  return (
    <Animated.View style={[gradeStyles.card, style]}>
      <View style={[gradeStyles.posTag, { borderColor: `${gc}40`, backgroundColor: `${gc}10` }]}>
        <Text variant="label" style={{ color: gc }}>{pos}</Text>
      </View>
      <View style={gradeStyles.body}>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 17 }}>{note}</Text>
      </View>
      <Text style={[gradeStyles.grade, { color: gc }]}>{grade}</Text>
    </Animated.View>
  );
}

function BoldMove({ emoji, title, body, urgency, delay }: typeof MOCK_REPORT.boldMoves[number] & { delay: number }) {
  const op = useSharedValue(0);
  const tx = useSharedValue(-10);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 400 }));
    tx.value = withDelay(delay, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: tx.value }] }));
  const urgencyColor = urgency === 'high' ? colors.coral : urgency === 'medium' ? colors.gold : colors.textTertiary;

  return (
    <Animated.View style={[moveStyles.card, style]}>
      <View style={moveStyles.top}>
        <Text style={moveStyles.emoji}>{emoji}</Text>
        <View style={moveStyles.titleRow}>
          <Text variant="bodyMedium" color={colors.textPrimary} style={{ flex: 1 }}>{title}</Text>
          <View style={[moveStyles.urgencyDot, { backgroundColor: urgencyColor }]} />
        </View>
      </View>
      <Text variant="bodySmall" color={colors.textSecondary} style={moveStyles.body}>{body}</Text>
    </Animated.View>
  );
}

function FlagRow({ type, label, body }: typeof MOCK_REPORT.flags[number]) {
  const icon  = type === 'danger' ? '🚨' : type === 'warning' ? '⚠️' : '✅';
  const color = type === 'danger' ? colors.coral : type === 'warning' ? colors.gold : colors.green;
  return (
    <View style={flagStyles.row}>
      <Text style={flagStyles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmallMedium" color={colors.textPrimary}>{label}</Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 17, marginTop: 2 }}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GMReportScreen() {
  const tier = useUserStore((s) => s.tier);
  const isGM = canAccess(tier, 'gm');

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const r = MOCK_REPORT;
  const gc = gradeColor(r.overallGrade);
  const realRoster = useMyRosterNames();
  const roster = realRoster.length > 0 ? realRoster : r.positionGrades.map(g => g.pos);
  const { take: aiSummary, loading: summaryLoading } = useGeminiTake(
    () => gemini.gmWeeklyReport(roster, 'NFL'),
    [roster.join(',')]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GM REPORT</Text>
          <Text variant="caption" color={colors.textTertiary}>{r.generatedAt}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Hero grade card ────────────────────────────────────────────── */}
          <Animated.View style={[styles.heroCard, heroStyle]}>
            <LinearGradient
              colors={[`${gc}14`, 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text variant="label" color={colors.textTertiary} style={styles.weekLabel}>
                  WEEK {r.week} REPORT
                </Text>
                <Text style={[styles.overallGrade, { color: gc }]}>{r.overallGrade}</Text>
                <Text variant="bodySmall" color={colors.textTertiary}>Overall Team Grade</Text>
              </View>
              <Text style={styles.trophyEmoji}>📊</Text>
            </View>
            <Text variant="body" color={colors.textSecondary} style={styles.headline}>
              {r.headline}
            </Text>
          </Animated.View>

          {/* ── Summary ───────────────────────────────────────────────────── */}
          <SectionLabel label="AI SUMMARY" />
          <View style={styles.summaryCard}>
            {summaryLoading
              ? <ActivityIndicator size="small" color={colors.green} />
              : <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>{aiSummary || r.summary}</Text>
            }
          </View>

          {/* ── Position grades ───────────────────────────────────────────── */}
          <SectionLabel label="POSITION GRADES" />
          <View style={styles.gradeGrid}>
            {r.positionGrades.map((g, i) => (
              <GradeCard key={g.pos} {...g} delay={200 + i * 60} />
            ))}
          </View>

          {/* ── Bold moves (GM-gated) ──────────────────────────────────────── */}
          <SectionLabel label="BOLD MOVES" />
          {isGM ? (
            <View style={styles.moveList}>
              {r.boldMoves.map((m, i) => (
                <BoldMove key={m.id} {...m} delay={300 + i * 80} />
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.lockCard} onPress={() => router.push('/paywall')} activeOpacity={0.85}>
              <LinearGradient colors={['rgba(201,168,76,0.1)', 'rgba(201,168,76,0.03)']} style={StyleSheet.absoluteFill} />
              <Ionicons name="lock-closed" size={22} color={colors.gold} />
              <Text variant="bodyMedium" color={colors.gold}>GM tier required</Text>
              <Text variant="bodySmall" color={colors.textTertiary} align="center">
                Unlock bold move recommendations, waiver targets, and trade advice.
              </Text>
              <View style={styles.lockBtn}>
                <Text variant="bodySmallMedium" color={colors.background}>Upgrade to GM →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Flags ─────────────────────────────────────────────────────── */}
          <SectionLabel label="FLAGS" />
          <View style={styles.flagCard}>
            {r.flags.map((f) => <FlagRow key={f.id} {...f} />)}
          </View>

          {/* ── Weekly outlook ────────────────────────────────────────────── */}
          <SectionLabel label="WEEKLY OUTLOOK" />
          <View style={styles.outlookCard}>
            <LinearGradient colors={['rgba(0,255,135,0.06)', 'transparent']} style={StyleSheet.absoluteFill} />
            <Text style={styles.projLabel}>PROJECTED PTS</Text>
            <Text style={styles.projPts}>{142}</Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 18, marginTop: spacing.sm }}>
              {r.weeklyOutlook}
            </Text>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text variant="label" color={colors.textTertiary} style={sectionStyles.label}>{label}</Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    gap:            spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...typography.h4, color: colors.textPrimary, flex: 1 },

  scroll: { paddingHorizontal: spacing.base, paddingBottom: 40 },

  heroCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.base, marginBottom: spacing.xl, overflow: 'hidden',
  },
  heroTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  weekLabel:    { letterSpacing: 0.8, marginBottom: spacing.xs },
  overallGrade: { ...typography.hero, fontSize: 64, lineHeight: 64 },
  trophyEmoji:  { fontSize: 40 },
  headline:     { lineHeight: 20 },

  summaryCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.base, marginBottom: spacing.xl,
  },

  gradeGrid:    { gap: spacing.sm, marginBottom: spacing.xl },

  moveList:     { gap: spacing.sm, marginBottom: spacing.xl },

  lockCard: {
    borderWidth: 1, borderColor: `${colors.gold}40`, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
    overflow: 'hidden', marginBottom: spacing.xl,
  },
  lockBtn: {
    backgroundColor: colors.gold, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, marginTop: spacing.xs,
  },

  flagCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.xl,
  },

  outlookCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.base, overflow: 'hidden', marginBottom: spacing.xl,
  },
  projLabel: { ...typography.label, color: colors.textTertiary, letterSpacing: 1 },
  projPts:   { ...typography.hero, fontSize: 56, color: colors.green },

  bottomSpacer: { height: spacing.xl },
});

const sectionStyles = StyleSheet.create({
  label: { letterSpacing: 1, marginBottom: spacing.md },
});

const gradeStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, gap: spacing.md,
  },
  posTag: {
    width: 44, height: 44, borderRadius: radius.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  body:  { flex: 1 },
  grade: { ...typography.h3, fontSize: 24 },
});

const moveStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.base, gap: spacing.sm,
  },
  top:        { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  emoji:      { fontSize: 24 },
  titleRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },
  body:       { lineHeight: 18 },
});

const flagStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: spacing.base, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  icon: { fontSize: 18 },
});
