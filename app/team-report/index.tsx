import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useMyRoster } from '@hooks/useMyRoster';
import { useGmHistoryStore } from '@store/useGmHistoryStore';
import { gemini } from '@services/gemini';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { SkeletonRow } from '@components/shared/Skeleton';
import { SportTint } from '@components/shared/SportTint';
import { TabSwitcher } from '@components/shared/TabSwitcher';
import { ROSTER_TABS } from '@components/shared/hubTabs';

interface PosGrade { pos: string; grade: string; note: string }
interface Report {
  gmScore:   number;
  grade:     string;
  headline:  string;
  positions: PosGrade[];
  holes:     string[];
  strengths: string[];
}

const cache: Record<string, { ts: number; report: Report }> = {};
const CACHE_MS = 1000 * 60 * 60 * 3;

function scoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.gold;
  return colors.coral;
}

export default function TeamReportScreen() {
  const sport    = useUserStore((s) => s.currentSport);
  const sportDef = SPORTS[sport];
  const { roster, loading: rosterLoading, hasLeague } = useMyRoster(sport);

  const [report, setReport]   = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!roster) return;
    setLoading(true);
    setError(null);
    try {
      const rosterStr = roster.players
        .map(p => `${p.name} (${p.position}, ${p.team}${p.injury ? `, ${p.injury.status}` : ''})`)
        .join(', ');
      const recordStr = `${roster.record.wins}-${roster.record.losses}${roster.record.ties ? `-${roster.record.ties}` : ''}`;

      const prompt = `Grade my ${sportDef.shortLabel} fantasy team. Record: ${recordStr}.
ROSTER: ${rosterStr}

Output EXACT JSON, nothing else:
{
  "gmScore": 0-100 overall team rating,
  "grade": "letter grade like A+, B-, D",
  "headline": "one punchy sentence verdict — TikTok creator voice",
  "positions": [{"pos": "position group", "grade": "letter grade", "note": "one short line"}],
  "holes": ["specific weakness — what to fix", "..."],
  "strengths": ["specific strength", "..."]
}
Be honest and specific. Real evaluations, not flattery.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]);
      const rep: Report = {
        gmScore:   Math.max(0, Math.min(100, Number(parsed.gmScore) || 0)),
        grade:     parsed.grade ?? '—',
        headline:  parsed.headline ?? '',
        positions: Array.isArray(parsed.positions) ? parsed.positions : [],
        holes:     Array.isArray(parsed.holes) ? parsed.holes : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      };
      if (roster) {
        cache[roster.leagueId] = { ts: Date.now(), report: rep };
        // Log a daily snapshot so the user can see their GM Score over time.
        useGmHistoryStore.getState().record({
          sport,
          leagueId: roster.leagueId,
          score:    rep.gmScore,
          grade:    rep.grade,
        });
      }
      setReport(rep);
    } catch {
      setError('Could not grade your team right now. Try again in a sec.');
    } finally {
      setLoading(false);
    }
  }, [roster, sportDef.shortLabel]);

  useEffect(() => {
    if (!roster) return;
    const cached = cache[roster.leagueId];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setReport(cached.report);
      return;
    }
    run();
  }, [roster?.leagueId]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Roster Tools" />
        <TabSwitcher tabs={ROSTER_TABS} activeKey="grade" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!hasLeague ? (
            <NoLeagueState sport={sport} feature="grade your team" />
          ) : rosterLoading || (loading && !report) ? (
            <>
              <Text style={styles.title}>GRADING YOUR{'\n'}TEAM…</Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {[0, 1, 2, 3].map(i => <SkeletonRow key={i} />)}
              </View>
            </>
          ) : error || !report ? (
            <EmptyState
              emoji="😬"
              title="Couldn't grade"
              body={error ?? 'Something went sideways.'}
              ctaLabel="Try again"
              onCta={run}
            />
          ) : (
            <>
              {/* GM Score */}
              <View style={styles.scoreCard}>
                <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1 }}>
                  GM SCORE
                </Text>
                <View style={styles.scoreRow}>
                  <Text style={[styles.scoreNum, { color: scoreColor(report.gmScore) }]}>
                    {report.gmScore}
                  </Text>
                  <View style={[styles.gradePill, { backgroundColor: `${scoreColor(report.gmScore)}1A` }]}>
                    <Text style={[styles.gradeText, { color: scoreColor(report.gmScore) }]}>
                      {report.grade}
                    </Text>
                  </View>
                </View>
                <Text variant="body" color={colors.textPrimary} style={{ lineHeight: 22 }}>
                  {report.headline}
                </Text>
              </View>

              {/* GM Score history — the trend over time */}
              <GmHistoryStrip leagueId={roster?.leagueId ?? ''} />

              {/* Position grades */}
              {report.positions.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>BY POSITION</Text>
                  <View style={styles.card}>
                    {report.positions.map((p, i) => (
                      <View key={`${p.pos}-${i}`} style={[styles.posRow, i < report.positions.length - 1 && styles.border]}>
                        <Text variant="bodySmallMedium" color={colors.textPrimary} style={{ width: 60 }}>
                          {p.pos}
                        </Text>
                        <View style={styles.posGradePill}>
                          <Text variant="labelSmall" color={colors.textPrimary}>{p.grade}</Text>
                        </View>
                        <Text variant="caption" color={colors.textTertiary} style={{ flex: 1 }}>
                          {p.note}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Holes */}
              {report.holes.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>ROSTER HOLES · FIX THESE</Text>
                  {report.holes.map((h, i) => (
                    <View key={i} style={[styles.bulletCard, { borderLeftColor: colors.coral }]}>
                      <Ionicons name="alert-circle" size={15} color={colors.coral} />
                      <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
                        {h}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Strengths */}
              {report.strengths.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>YOUR STRENGTHS</Text>
                  {report.strengths.map((s, i) => (
                    <View key={i} style={[styles.bulletCard, { borderLeftColor: colors.green }]}>
                      <Ionicons name="checkmark-circle" size={15} color={colors.green} />
                      <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 18 }}>
                        {s}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={styles.rerun} onPress={run} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>Re-grade</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── GM Score history strip ───────────────────────────────────────────────────

function GmHistoryStrip({ leagueId }: { leagueId: string }) {
  const snapshots = useGmHistoryStore(s => s.snapshots);
  const list = snapshots
    .filter(snap => snap.leagueId === leagueId)
    .sort((a, b) => a.ts - b.ts)
    .slice(-14);

  if (list.length < 2) return null;

  const max = Math.max(...list.map(s => s.score), 100);
  const min = Math.min(...list.map(s => s.score), 0);
  const range = Math.max(max - min, 20);

  return (
    <View style={historyStyles.wrap}>
      <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1, marginBottom: spacing.sm }}>
        GM SCORE HISTORY · LAST {list.length}
      </Text>
      <View style={historyStyles.chart}>
        {list.map((s, i) => {
          const height = ((s.score - min) / range) * 60 + 8;
          const color = scoreColor(s.score);
          const date  = new Date(s.ts);
          return (
            <View key={`${s.ts}-${i}`} style={historyStyles.col}>
              <Text variant="caption" style={{ color, fontSize: 9, fontWeight: '700' }}>
                {s.score}
              </Text>
              <View style={[historyStyles.bar, { height, backgroundColor: `${color}80`, borderColor: color }]} />
              <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 9 }}>
                {date.getMonth() + 1}/{date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const historyStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           4,
    height:        90,
  },
  col: {
    flex:        1,
    alignItems:  'center',
    gap:         3,
    justifyContent: 'flex-end',
  },
  bar: {
    width:        '70%',
    minWidth:     8,
    borderRadius: 3,
    borderWidth:  1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  title: {
    fontSize:      34,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight:    38,
    marginTop:     spacing.md,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginTop:       spacing.md,
    marginBottom:    spacing.lg,
    gap:             spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  scoreNum: {
    fontSize:      64,
    fontWeight:    '800',
    letterSpacing: -2,
  },
  gradePill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   6,
    borderRadius:      radius.md,
  },
  gradeText: {
    fontSize:   24,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginBottom:  spacing.sm,
    marginTop:     spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingHorizontal: spacing.base,
    marginBottom:    spacing.lg,
  },
  posRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingVertical: 12,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  posGradePill: {
    minWidth:          34,
    alignItems:        'center',
    paddingVertical:   3,
    paddingHorizontal: 6,
    borderRadius:      radius.sm,
    backgroundColor:   colors.background,
  },
  bulletCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
  },
  rerun: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.md,
    marginTop:       spacing.xs,
  },
});
