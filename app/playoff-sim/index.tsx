import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { EmptyState } from '@components/shared/EmptyState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useYahooStore } from '@store/useYahooStore';
import { yahooFantasy } from '@services/yahooFantasy';
import { gemini } from '@services/gemini';

interface SimResult {
  playoffOdds:   number;  // 0-100
  titleOdds:     number;  // 0-100
  projectedSeed: string;  // e.g. "3rd"
  path:          string[]; // what needs to happen
  verdict:       string;
}

const cache: Record<string, SimResult> = {};

export default function PlayoffSimScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const active   = useYahooStore(s => s.active[sport]);

  const [result, setResult]   = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  const cacheKey = active?.teamKey ?? '';

  const run = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setErrored(false);
    try {
      const teams = await yahooFantasy.leagueTeams(active.leagueKey);
      const standings = teams
        .map(t => `${t.name}: ${t.wins ?? 0}-${t.losses ?? 0}${t.ties ? `-${t.ties}` : ''}${t.teamKey === active.teamKey ? ' [MY TEAM]' : ''}`)
        .join('\n');

      const prompt = `${sportDef.shortLabel} fantasy league standings. Run a season projection for MY team.

STANDINGS:
${standings}

Based on records + roster strength, simulate the rest of the season (think monte-carlo style — what's the realistic distribution of outcomes). Output EXACT JSON, nothing else:
{
  "playoffOdds":   0-100 integer — my % chance to make playoffs,
  "titleOdds":     0-100 integer — my % chance to win it all,
  "projectedSeed": "where I'm likely to finish — e.g. '3rd of 12'",
  "path":          ["2-4 specific things that need to happen for me to make a deep run"],
  "verdict":       "ONE punchy sentence — am I a contender, a bubble team, or cooked? TikTok creator voice"
}
Be realistic but specific.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      const r: SimResult = {
        playoffOdds:   Math.max(0, Math.min(100, Number(parsed.playoffOdds) || 0)),
        titleOdds:     Math.max(0, Math.min(100, Number(parsed.titleOdds) || 0)),
        projectedSeed: parsed.projectedSeed ?? '—',
        path:          Array.isArray(parsed.path) ? parsed.path : [],
        verdict:       parsed.verdict ?? '',
      };
      cache[cacheKey] = r;
      setResult(r);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [active, sportDef.shortLabel, cacheKey]);

  useEffect(() => {
    if (cache[cacheKey]) { setResult(cache[cacheKey]); return; }
    if (active) run();
  }, [cacheKey, active, run]);

  const oddsColor = (n: number) => n >= 70 ? colors.green : n >= 40 ? colors.gold : colors.coral;

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Playoff Odds" />
        <ScrollView contentContainerStyle={styles.scroll}>
          {!active ? (
            <NoLeagueState sport={sport} feature="simulate your playoff odds" />
          ) : loading && !result ? (
            <View style={{ paddingVertical: spacing['2xl'], alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                Running the season 10,000 times…
              </Text>
            </View>
          ) : errored || !result ? (
            <EmptyState emoji="🎲" title="Couldn't run the sim" body="Try again in a sec." ctaLabel="Retry" onCta={run} />
          ) : (
            <>
              <Text style={styles.title}>YOUR PLAYOFF{'\n'}PICTURE.</Text>

              <View style={styles.oddsRow}>
                <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.oddsCard, { borderColor: `${oddsColor(result.playoffOdds)}88` }]}>
                  <LinearGradient colors={[`${oddsColor(result.playoffOdds)}22`, 'transparent']} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.oddsNum, { color: oddsColor(result.playoffOdds) }]}>{result.playoffOdds}%</Text>
                  <Text style={styles.oddsLabel}>MAKE PLAYOFFS</Text>
                </Animated.View>
                <Animated.View entering={ZoomIn.delay(100).springify().damping(12)} style={[styles.oddsCard, { borderColor: `${oddsColor(result.titleOdds)}88` }]}>
                  <LinearGradient colors={[`${oddsColor(result.titleOdds)}22`, 'transparent']} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.oddsNum, { color: oddsColor(result.titleOdds) }]}>{result.titleOdds}%</Text>
                  <Text style={styles.oddsLabel}>WIN IT ALL</Text>
                </Animated.View>
              </View>

              <View style={styles.seedBox}>
                <Sticker variant="lockedIn" label="PROJECTED FINISH" />
                <Text variant="bodyLarge" color={colors.textPrimary} style={{ fontWeight: '800', marginTop: 6 }}>
                  {result.projectedSeed}
                </Text>
              </View>

              {!!result.verdict && (
                <View style={styles.verdictBox}>
                  <Text variant="bodyLarge" color={colors.textPrimary} style={{ fontWeight: '700', lineHeight: 24 }}>
                    "{result.verdict}"
                  </Text>
                </View>
              )}

              {result.path.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>YOUR PATH</Text>
                  {result.path.map((p, i) => (
                    <View key={i} style={styles.pathRow}>
                      <Ionicons name="arrow-forward-circle" size={16} color={colors.green} />
                      <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 19 }}>
                        {p}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={styles.rerun} onPress={run} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>Re-run sim</Text>
              </TouchableOpacity>
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
    fontSize:      34,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight:    38,
    marginTop:     spacing.md,
    marginBottom:  spacing.lg,
  },
  oddsRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  oddsCard: {
    flex:            1,
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     2,
    padding:         spacing.lg,
    alignItems:      'center',
    overflow:        'hidden',
  },
  oddsNum: {
    fontSize:      48,
    fontWeight:    '900',
    letterSpacing: -2,
  },
  oddsLabel: {
    fontSize:      10,
    fontWeight:    '800',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginTop:     4,
  },
  seedBox: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  verdictBox: {
    backgroundColor: `${colors.coral}0E`,
    borderRadius:    radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom:  spacing.sm,
  },
  pathRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rerun: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.md,
    marginTop:       spacing.lg,
  },
});
