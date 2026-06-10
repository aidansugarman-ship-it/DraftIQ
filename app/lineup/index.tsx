import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useMyRoster } from '@hooks/useMyRoster';
import { useUserStore } from '@store/useUserStore';
import { gemini } from '@services/gemini';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { SkeletonRow } from '@components/shared/Skeleton';
import { SportTint } from '@components/shared/SportTint';
import { LineupAlertsCard } from '@components/shared/LineupAlertsCard';
import { TabSwitcher } from '@components/shared/TabSwitcher';
import { ROSTER_TABS } from '@components/shared/hubTabs';
import { useAchievementsStore } from '@store/useAchievementsStore';
import { useLineupHistoryStore } from '@store/useLineupHistoryStore';

interface LineupCall {
  name:       string;
  slot:       'START' | 'BENCH';
  changed:    boolean;
  reason:     string;
  confidence: number;  // 1-5, AI's certainty in this call
}

interface Optimized {
  calls:   LineupCall[];
  summary: string;
}

export default function LineupOptimizerScreen() {
  const sport = useUserStore((s) => s.currentSport);
  const sportDef = SPORTS[sport];
  const { roster, loading: rosterLoading, hasLeague } = useMyRoster(sport);

  const [result, setResult]   = useState<Optimized | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const unlock          = useAchievementsStore(s => s.unlock);
  const recordHistory   = useLineupHistoryStore(s => s.record);

  const optimize = useCallback(async () => {
    if (!roster) return;
    unlock('first_optimize');
    setLoading(true);
    setError(null);
    try {
      const rosterStr = roster.players
        .map(p => `${p.name} — ${p.position}, ${p.team}, currently ${p.isStarter ? 'STARTING' : 'BENCHED'}${p.injury ? `, ${p.injury.status}` : ''}`)
        .join('\n');

      const prompt = `Here is my ${sportDef.shortLabel} fantasy roster. Set my OPTIMAL starting lineup for this week — bench anyone who shouldn't play, start the best options. Account for injuries.

ROSTER:
${rosterStr}

Output EXACT JSON, nothing else:
{
  "calls": [
    {
      "name": "exact player name",
      "slot": "START" | "BENCH",
      "changed": true | false,
      "reason": "one punchy sentence — why, especially if this is a change from their current slot",
      "confidence": 1-5 integer (5 = total lock, 3 = solid, 1 = total coin flip)
    }
  ],
  "summary": "2 sentences — the headline of what to change and why. TikTok creator voice: confident, sharp, no fluff."
}

Include EVERY player from the roster in "calls". "changed" is true if your call differs from their current slot. Be honest about confidence — boom-or-bust guys get lower numbers.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]);
      const calls = Array.isArray(parsed.calls) ? parsed.calls : [];
      setResult({ calls, summary: parsed.summary ?? '' });
      // Log this run so the AI can spot lineup-decision patterns later
      if (roster) {
        recordHistory({
          sport,
          leagueId: roster.leagueId,
          changedCount: calls.filter((c: any) => c.changed).length,
          decisions: calls.map((c: any) => ({ name: c.name, slot: c.slot, injury: undefined })),
        });
      }
    } catch {
      setError('Could not optimize right now. Try again in a sec.');
    } finally {
      setLoading(false);
    }
  }, [roster, sportDef.shortLabel, unlock, recordHistory, sport]);

  // Auto-run once the roster is ready.
  useEffect(() => {
    if (roster && !result && !loading) optimize();
  }, [roster]);

  const changes  = result?.calls.filter(c => c.changed) ?? [];
  const starters = result?.calls.filter(c => c.slot === 'START') ?? [];
  const bench    = result?.calls.filter(c => c.slot === 'BENCH') ?? [];

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Roster Tools" />
        <TabSwitcher tabs={ROSTER_TABS} activeKey="optimize" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!hasLeague ? (
            <NoLeagueState sport={sport} feature="set your optimal lineup" />
          ) : rosterLoading || (loading && !result) ? (
            <>
              <Text style={styles.title}>CRUNCHING YOUR{'\n'}LINEUP…</Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
              </View>
            </>
          ) : error || !result ? (
            <EmptyState
              emoji="😬"
              title="Couldn't optimize"
              body={error ?? 'Something went sideways.'}
              ctaLabel="Try again"
              onCta={optimize}
            />
          ) : (
            <>
              <Text style={styles.title}>YOUR OPTIMAL{'\n'}LINEUP.</Text>

              {/* Summary verdict */}
              <View style={styles.verdictCard}>
                <View style={styles.verdictHead}>
                  <Ionicons name="flash" size={16} color={colors.green} />
                  <Text variant="labelSmall" style={{ color: colors.green, letterSpacing: 0.8 }}>
                    THE CALL
                  </Text>
                </View>
                <Text variant="body" color={colors.textPrimary} style={{ lineHeight: 22 }}>
                  {result.summary}
                </Text>
              </View>

              {/* Moves to make — paired as swaps when possible */}
              {changes.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>SWAPS TO MAKE · {changes.length}</Text>
                  {pairSwaps(changes).map((swap, i) => (
                    <View key={`swap-${i}`} style={styles.swapCard}>
                      {swap.out && (
                        <View style={[styles.swapRow, { borderLeftColor: colors.coral }]}>
                          <View style={[styles.slotPill, { backgroundColor: `${colors.coral}1A` }]}>
                            <Ionicons name="arrow-down" size={11} color={colors.coral} />
                            <Text variant="labelSmall" style={{ color: colors.coral, fontSize: 10 }}>BENCH</Text>
                          </View>
                          <Text variant="bodyMedium" color={colors.textPrimary} style={{ flex: 1 }}>
                            {swap.out.name}
                          </Text>
                        </View>
                      )}
                      {swap.in && (
                        <View style={[styles.swapRow, { borderLeftColor: colors.green }]}>
                          <View style={[styles.slotPill, { backgroundColor: `${colors.green}1A` }]}>
                            <Ionicons name="arrow-up" size={11} color={colors.green} />
                            <Text variant="labelSmall" style={{ color: colors.green, fontSize: 10 }}>START</Text>
                          </View>
                          <Text variant="bodyMedium" color={colors.textPrimary} style={{ flex: 1 }}>
                            {swap.in.name}
                          </Text>
                        </View>
                      )}
                      <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 18, marginTop: 4 }}>
                        {swap.reason}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Full optimal lineup */}
              <Text style={styles.sectionLabel}>START · {starters.length}</Text>
              <View style={styles.card}>
                {starters.map((c, i) => (
                  <LineupRow key={`s-${c.name}-${i}`} call={c} last={i === starters.length - 1} />
                ))}
              </View>

              {bench.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>BENCH · {bench.length}</Text>
                  <View style={styles.card}>
                    {bench.map((c, i) => (
                      <LineupRow key={`b-${c.name}-${i}`} call={c} last={i === bench.length - 1} />
                    ))}
                  </View>
                </>
              )}

              {/* Lineup Lock Alerts — injured starters + daily reminder */}
              <LineupAlertsCard roster={roster} />

              <TouchableOpacity style={styles.rerun} onPress={optimize} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>Re-optimize</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * Pair up BENCH and START moves into single "swap" cards.
 * We greedily match the highest-confidence STARTs against any BENCH, then
 * spill anything unpaired into solo cards so nothing's lost.
 */
function pairSwaps(changes: LineupCall[]): Array<{ in?: LineupCall; out?: LineupCall; reason: string }> {
  const starts = changes.filter(c => c.slot === 'START').sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  const benches = changes.filter(c => c.slot === 'BENCH');
  const swaps: Array<{ in?: LineupCall; out?: LineupCall; reason: string }> = [];
  const usedBench = new Set<string>();
  for (const startCall of starts) {
    const benchPick = benches.find(b => !usedBench.has(b.name));
    if (benchPick) {
      usedBench.add(benchPick.name);
      swaps.push({ in: startCall, out: benchPick, reason: startCall.reason || benchPick.reason });
    } else {
      swaps.push({ in: startCall, reason: startCall.reason });
    }
  }
  // Any benches without a paired START
  for (const b of benches) {
    if (!usedBench.has(b.name)) swaps.push({ out: b, reason: b.reason });
  }
  return swaps;
}

function LineupRow({ call, last }: { call: LineupCall; last: boolean }) {
  const conf = Math.max(0, Math.min(5, call.confidence ?? 0));
  return (
    <View style={[rowStyles.row, !last && rowStyles.border]}>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>
          {call.name}
        </Text>
        {!!call.reason && (
          <Text variant="caption" color={colors.textTertiary} numberOfLines={2} style={{ marginTop: 2 }}>
            {call.reason}
          </Text>
        )}
      </View>
      <ConfidenceDial value={conf} />
      {call.changed && (
        <View style={rowStyles.changedDot} />
      )}
    </View>
  );
}

function ConfidenceDial({ value }: { value: number }) {
  // Color-coded confidence BAR (matches the Schedule Strength viz).
  // 1-2 = coral (coin flip), 3 = gold (solid), 4-5 = green (lock).
  const pct   = Math.max(0, Math.min(5, value)) / 5;
  const color = value >= 4 ? colors.green : value >= 3 ? colors.gold : colors.coral;
  const label = value >= 5 ? 'LOCK' : value >= 4 ? 'STRONG' : value >= 3 ? 'SOLID' : value >= 2 ? 'RISKY' : 'COIN FLIP';
  return (
    <View style={dialStyles.col}>
      <Text variant="caption" style={{ color, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 2 }}>
        {label}
      </Text>
      <View style={dialStyles.track}>
        <View style={[dialStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

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
    marginBottom:  spacing.lg,
  },
  verdictCard: {
    backgroundColor: `${colors.green}0E`,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     `${colors.green}33`,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  verdictHead: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.sm,
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
  moveCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
  },
  moveTop: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  swapCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
    gap:             spacing.sm,
  },
  swapRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingLeft:     spacing.sm,
    borderLeftWidth: 3,
  },
  slotPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      999,
  },
  rerun: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.md,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingVertical: 12,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  changedDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.gold,
  },
});

const dialStyles = StyleSheet.create({
  col: {
    width:      62,
    alignItems: 'flex-end',
  },
  track: {
    width:           60,
    height:          6,
    borderRadius:    3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow:        'hidden',
  },
  fill: {
    height:       '100%',
    borderRadius: 3,
  },
});
