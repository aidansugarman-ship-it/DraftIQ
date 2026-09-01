import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useMyRosterNames } from '@hooks/useSleeperData';
import { generateGMReport, type GMReport } from '@services/gmReport';
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

function BoldMove({ emoji, title, body, urgency, delay }: GMReport['boldMoves'][number] & { delay: number }) {
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

function FlagRow({ type, label, body }: GMReport['flags'][number]) {
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

  const roster = useMyRosterNames();
  const [r,       setReport]  = useState<GMReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);

  const load = async () => {
    if (roster.length === 0) { setLoading(false); return; }
    setLoading(true);
    setFailed(false);
    const report = await generateGMReport(roster, 'NFL');
    if (report) setReport(report); else setFailed(true);
    setLoading(false);
  };

  useEffect(() => { load(); }, [roster.join(',')]);

  const gc = gradeColor(r?.overallGrade ?? '');

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>GM REPORT</Text>
          <Text variant="caption" color={colors.textTertiary}>{r?.generatedAt ?? ''}</Text>
        </View>
        {children}
      </SafeAreaView>
    </View>
  );

  if (roster.length === 0) {
    return (
      <Frame>
        <View style={styles.stateWrap}>
          <Text style={styles.stateEmoji}>🔗</Text>
          <Text variant="bodyMedium" color={colors.textPrimary} align="center">
            Connect your league first
          </Text>
          <Text variant="bodySmall" color={colors.textTertiary} align="center" style={{ lineHeight: 19 }}>
            Your GM Report is built from your actual roster, so we need a league connected before we can grade it.
          </Text>
          <TouchableOpacity
            style={styles.stateBtn}
            onPress={() => router.push('/settings/connect-sleeper')}
            activeOpacity={0.85}
          >
            <Text variant="bodySmallMedium" color={colors.background}>Connect a league</Text>
          </TouchableOpacity>
        </View>
      </Frame>
    );
  }

  if (loading || !r) {
    return (
      <Frame>
        <View style={styles.stateWrap}>
          {loading ? (
            <>
              <ActivityIndicator color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary} align="center">
                Grading your roster…
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.stateEmoji}>🫤</Text>
              <Text variant="bodyMedium" color={colors.textPrimary} align="center">
                Couldn't build your report
              </Text>
              <Text variant="bodySmall" color={colors.textTertiary} align="center">
                {failed ? 'The AI hit a snag.' : ''} Give it another go.
              </Text>
              <TouchableOpacity style={styles.stateBtn} onPress={load} activeOpacity={0.85}>
                <Text variant="bodySmallMedium" color={colors.background}>Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Frame>
    );
  }

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
            <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>{r.summary}</Text>
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
            <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 18 }}>
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
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  stateEmoji: { fontSize: 44, lineHeight: 52 },
  stateBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.green,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
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
