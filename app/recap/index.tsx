import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';

// ─── Mock recap data ──────────────────────────────────────────────────────────

type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

interface RecapPick {
  round:   number;
  pick:    number;
  name:    string;
  team:    string;
  pos:     Pos;
  grade:   'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  adp:     number;
  value:   number;  // +/- vs ADP
}

interface DraftRecap {
  id:           string;
  date:         string;
  format:       string;
  scoring:      string;
  numTeams:     number;
  draftSlot:    number;
  overallGrade: string;
  picks:        RecapPick[];
  bestPick:     string;
  worstPick:    string;
  summary:      string;
  posGrades: {
    pos:   Pos;
    grade: string;
    count: number;
  }[];
}

const MOCK_RECAP: DraftRecap = {
  id:           'draft_001',
  date:         'Nov 19, 2024 · 2:14 PM',
  format:       'Snake',
  scoring:      'PPR',
  numTeams:     12,
  draftSlot:    5,
  overallGrade: 'B+',
  bestPick:     'Breece Hall (Rd 2, Pick 20)',
  worstPick:    'Mark Andrews (Rd 3, Pick 29)',
  summary:      'Strong draft overall. You secured elite WR1 value in rounds 1–2, then maximized RB depth in rounds 3–5. Minor reach on Andrews in round 3 was the only blemish.',
  picks: [
    { round: 1, pick: 5,  name: 'CeeDee Lamb',      team: 'DAL', pos: 'WR', grade: 'A',  adp: 2.0,  value: +3.0 },
    { round: 2, pick: 20, name: 'Breece Hall',       team: 'NYJ', pos: 'RB', grade: 'A+', adp: 6.0,  value: +6.0 },
    { round: 3, pick: 29, name: 'Mark Andrews',      team: 'BAL', pos: 'TE', grade: 'C+', adp: 46.0, value: -17.0 },
    { round: 4, pick: 44, name: 'Josh Jacobs',       team: 'GB',  pos: 'RB', grade: 'B+', adp: 20.0, value: +2.0 },
    { round: 5, pick: 53, name: 'Drake London',      team: 'ATL', pos: 'WR', grade: 'B',  adp: 53.3, value: +0.3 },
  ],
  posGrades: [
    { pos: 'WR',  grade: 'A',  count: 2 },
    { pos: 'RB',  grade: 'B+', count: 2 },
    { pos: 'TE',  grade: 'C+', count: 1 },
  ],
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': colors.green,
  'A':  colors.green,
  'B+': '#7BC67E',
  'B':  colors.blue,
  'C+': colors.gold,
  'C':  colors.gold,
  'D':  colors.coral,
  'F':  '#FF4444',
};

const POS_COLORS: Record<Pos, string> = {
  QB:  colors.coral,
  RB:  colors.green,
  WR:  colors.blue,
  TE:  colors.gold,
  K:   colors.textTertiary,
  DEF: colors.purple,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PosBadge({ pos }: { pos: Pos }) {
  return (
    <View style={[pb.badge, { backgroundColor: `${POS_COLORS[pos]}18` }]}>
      <Text variant="labelSmall" style={{ color: POS_COLORS[pos] }}>{pos}</Text>
    </View>
  );
}

function GradeChip({ grade }: { grade: string }) {
  const color = GRADE_COLORS[grade] ?? colors.textTertiary;
  return (
    <View style={[gc.chip, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
      <Text variant="label" style={{ color, letterSpacing: 0.5 }}>{grade}</Text>
    </View>
  );
}

function PickRow({ pick, index }: { pick: RecapPick; index: number }) {
  const valueColor = pick.value >= 3 ? colors.green : pick.value >= -2 ? colors.textTertiary : colors.coral;
  const valueLabel = pick.value > 0 ? `+${pick.value.toFixed(1)} value` : `${pick.value.toFixed(1)} value`;

  return (
    <Animated.View entering={FadeIn.delay(index * 70).duration(300)} style={pr.row}>
      <View style={pr.roundBadge}>
        <Text variant="caption" color={colors.textTertiary}>R{pick.round}</Text>
      </View>
      <PosBadge pos={pick.pos} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={colors.textPrimary}>{pick.name}</Text>
        <Text variant="caption" color={colors.textTertiary}>{pick.team} · ADP {pick.adp} · Pick {pick.pick}</Text>
      </View>
      <View style={pr.right}>
        <Text variant="caption" style={{ color: valueColor }}>{valueLabel}</Text>
        <GradeChip grade={pick.grade} />
      </View>
    </Animated.View>
  );
}

// ─── Share card (styled for screenshot) ──────────────────────────────────────

function ShareCard({ recap }: { recap: DraftRecap }) {
  const overallColor = GRADE_COLORS[recap.overallGrade] ?? colors.green;

  const scale = useSharedValue(0.92);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, []);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[sc.card, cardAnim]}>
      <LinearGradient
        colors={['#141418', '#0D0D0F', '#111114']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={[`${overallColor}18`, 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.6 }}
      />

      {/* Header */}
      <View style={sc.header}>
        <View>
          <Text style={sc.brand}>DRAFTIQ</Text>
          <Text variant="caption" color={colors.textTertiary}>{recap.date}</Text>
        </View>
        <View style={[sc.gradeBubble, { borderColor: `${overallColor}50`, backgroundColor: `${overallColor}15` }]}>
          <Text style={[sc.gradeText, { color: overallColor }]}>{recap.overallGrade}</Text>
        </View>
      </View>

      {/* League info */}
      <View style={sc.leagueRow}>
        {[
          `${recap.numTeams}-Team`,
          recap.scoring,
          recap.format,
          `Pick ${recap.draftSlot}`,
        ].map((label, i) => (
          <View key={i} style={sc.leaguePill}>
            <Text variant="labelSmall" color={colors.textTertiary}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Picks */}
      <View style={sc.picksSection}>
        <Text variant="label" color={colors.textTertiary} style={sc.picksLabel}>MY TEAM</Text>
        {recap.picks.map((pick, i) => (
          <View key={i} style={sc.pickRow}>
            <View style={[sc.posTag, { backgroundColor: `${POS_COLORS[pick.pos]}20` }]}>
              <Text variant="caption" style={{ color: POS_COLORS[pick.pos] }}>{pick.pos}</Text>
            </View>
            <Text variant="bodySmall" color={colors.textPrimary} style={{ flex: 1 }}>{pick.name}</Text>
            <View style={[sc.gradeTag, { backgroundColor: `${GRADE_COLORS[pick.grade]}18`, borderColor: `${GRADE_COLORS[pick.grade]}40` }]}>
              <Text variant="caption" style={{ color: GRADE_COLORS[pick.grade] }}>{pick.grade}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Position grades */}
      <View style={sc.posGrades}>
        {recap.posGrades.map(pg => (
          <View key={pg.pos} style={sc.posGradeItem}>
            <Text variant="caption" color={colors.textTertiary}>{pg.pos}</Text>
            <Text variant="bodySmallMedium" style={{ color: GRADE_COLORS[pg.grade] }}>{pg.grade}</Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={sc.footer}>
        <Text variant="caption" color={colors.textTertiary}>Powered by DraftIQ AI · draftiq.app</Text>
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RecapScreen() {
  const recap = MOCK_RECAP;
  const overallColor = GRADE_COLORS[recap.overallGrade] ?? colors.green;

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  async function handleShare() {
    try {
      await Share.share({
        message: `I just finished a mock draft on DraftIQ and got a ${recap.overallGrade}!\n\nMy top pick: ${recap.bestPick}\n\nDownload DraftIQ to build your winning team.`,
        title: `DraftIQ Mock Draft — ${recap.overallGrade}`,
      });
    } catch (_) {}
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Draft Recap</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>DRAFT{'\n'}RECAP.</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              {recap.date} · {recap.numTeams}-team {recap.scoring} · Pick {recap.draftSlot}
            </Text>
          </Animated.View>

          {/* Share card */}
          <ShareCard recap={recap} />

          {/* AI Summary */}
          <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.summaryCard}>
            <Text variant="label" color={colors.textTertiary} style={styles.sectionLabel}>AI SUMMARY</Text>
            <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>{recap.summary}</Text>
            <View style={styles.highlightsRow}>
              <View style={styles.highlight}>
                <Ionicons name="trophy-outline" size={14} color={colors.green} />
                <View>
                  <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>BEST PICK</Text>
                  <Text variant="bodySmall" color={colors.textPrimary}>{recap.bestPick}</Text>
                </View>
              </View>
              <View style={[styles.highlight, { borderTopColor: colors.coral }]}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.coral} />
                <View>
                  <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>WORST PICK</Text>
                  <Text variant="bodySmall" color={colors.textPrimary}>{recap.worstPick}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Picks breakdown */}
          <Text variant="label" color={colors.textTertiary} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            PICKS BREAKDOWN
          </Text>
          <View style={styles.picksCard}>
            {recap.picks.map((pick, i) => (
              <PickRow key={pick.pick} pick={pick} index={i} />
            ))}
          </View>

          {/* Position grades */}
          <Text variant="label" color={colors.textTertiary} style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            POSITION GRADES
          </Text>
          <View style={styles.posGradesRow}>
            {recap.posGrades.map((pg, i) => (
              <Animated.View
                key={pg.pos}
                entering={FadeIn.delay(i * 80).duration(300)}
                style={[styles.posGradeCard, { borderColor: `${GRADE_COLORS[pg.grade]}35` }]}
              >
                <LinearGradient
                  colors={[`${GRADE_COLORS[pg.grade]}0C`, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <Text variant="label" style={{ color: POS_COLORS[pg.pos] }}>{pg.pos}</Text>
                <Text style={[styles.posGradeText, { color: GRADE_COLORS[pg.grade] }]}>{pg.grade}</Text>
                <Text variant="caption" color={colors.textTertiary}>{pg.count} pick{pg.count > 1 ? 's' : ''}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Share CTA */}
          <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.shareCta}>
            <TouchableOpacity style={styles.shareCtaBtn} onPress={handleShare} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.green, '#00CC6A']}
                style={styles.shareCtaGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="share-social" size={16} color={colors.background} />
                <Text variant="bodyMedium" color={colors.background}>Share My Draft</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text variant="caption" color={colors.textTertiary} align="center">
              Show off your {recap.overallGrade} draft grade
            </Text>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     100,
  },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width:          36,
    height:         36,
    borderRadius:   radius.sm,
    backgroundColor: colors.surface,
    borderWidth:    1,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width:          36,
    height:         36,
    borderRadius:   radius.sm,
    backgroundColor: colors.surface,
    borderWidth:    1,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },

  title: {
    ...typography.h1,
    fontSize:     44,
    lineHeight:   46,
    color:        colors.textPrimary,
    marginTop:    spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight:   22,
    marginBottom: spacing.xl,
  },

  sectionLabel: {
    letterSpacing: 1,
    marginBottom:  spacing.md,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.lg,
    marginTop:       spacing.xl,
    marginBottom:    spacing.md,
  },
  highlightsRow: {
    gap: spacing.md,
  },
  highlight: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.md,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    paddingTop:      spacing.md,
  },

  picksCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    marginBottom:    spacing.md,
  },

  posGradesRow: {
    flexDirection: 'row',
    gap:           spacing.md,
    flexWrap:      'wrap',
    marginBottom:  spacing.md,
  },
  posGradeCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    alignItems:      'center',
    gap:             4,
    minWidth:        80,
    overflow:        'hidden',
  },
  posGradeText: {
    ...typography.h2,
    fontSize: 28,
    lineHeight: 32,
  },

  shareCta: {
    gap:       spacing.md,
    marginTop: spacing['2xl'],
  },
  shareCtaBtn: {
    borderRadius: radius.lg,
    overflow:     'hidden',
  },
  shareCtaGrad: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    paddingVertical: spacing.base,
  },

  bottomSpacer: { height: spacing['2xl'] },
});

const sc = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth:  1,
    borderColor:  colors.border,
    padding:      spacing.xl,
    gap:          spacing.lg,
    overflow:     'hidden',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
  },
  brand: {
    ...typography.h2,
    fontSize:     20,
    color:        colors.textPrimary,
    letterSpacing: 3,
  },
  gradeBubble: {
    width:          56,
    height:         56,
    borderRadius:   28,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  gradeText: {
    ...typography.h2,
    fontSize:   24,
    lineHeight: 28,
  },
  leagueRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  leaguePill: {
    paddingHorizontal: 9,
    paddingVertical:   3,
    borderRadius:      radius.full,
    backgroundColor:   colors.surfaceElevated,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  picksSection: { gap: spacing.sm },
  picksLabel:   { letterSpacing: 1 },
  pickRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  posTag: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
    minWidth:          28,
    alignItems:        'center',
  },
  gradeTag: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    borderWidth:       1,
    minWidth:          28,
    alignItems:        'center',
  },
  posGrades: {
    flexDirection: 'row',
    gap:           spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop:    spacing.md,
  },
  posGradeItem: {
    alignItems: 'center',
    gap:        4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop:     spacing.md,
    alignItems:     'center',
  },
});

const pb = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      4,
    minWidth:          32,
    alignItems:        'center',
  },
});

const gc = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
});

const pr = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:              spacing.sm,
  },
  roundBadge: {
    width:          24,
    alignItems:     'center',
  },
  right: {
    alignItems: 'flex-end',
    gap:        4,
  },
});
