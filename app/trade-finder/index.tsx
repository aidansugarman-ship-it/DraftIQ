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
import { useYahooStore } from '@store/useYahooStore';
import { yahooFantasy } from '@services/yahooFantasy';
import { gemini } from '@services/gemini';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { SkeletonRow } from '@components/shared/Skeleton';
import { SportTint } from '@components/shared/SportTint';

interface TradeIdea {
  withTeam: string;
  youGive:  string[];
  youGet:   string[];
  why:      string;
  pitch:    string;
}

// Cache proposals 30 min so re-entering isn't a fetch + AI storm.
const cache: Record<string, { ts: number; ideas: TradeIdea[] }> = {};
const CACHE_MS = 1000 * 60 * 30;

export default function TradeFinderScreen() {
  const sport    = useUserStore((s) => s.currentSport);
  const sportDef = SPORTS[sport];
  const active   = useYahooStore((s) => s.active[sport]);

  const [ideas, setIdeas]     = useState<TradeIdea[]>(active ? (cache[active.leagueKey]?.ideas ?? []) : []);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const find = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const teams = await yahooFantasy.leagueTeams(active.leagueKey);
      const rosters = await Promise.all(
        teams.map(t =>
          yahooFantasy.teamRoster(t.teamKey)
            .then(ps => ({ team: t, players: ps }))
            .catch(() => ({ team: t, players: [] })),
        ),
      );

      const mine   = rosters.find(r => r.team.teamKey === active.teamKey);
      const others = rosters.filter(r => r.team.teamKey !== active.teamKey && r.players.length > 0);
      if (!mine || mine.players.length === 0) throw new Error('no roster');

      const myStr = mine.players
        .map(p => `${p.name} (${p.position}, ${p.team})`)
        .join(', ');
      const othersStr = others
        .map(r => `${r.team.name}: ${r.players.map(p => `${p.name} (${p.position})`).join(', ')}`)
        .join('\n');

      const prompt = `${sportDef.shortLabel} fantasy. I want trade ideas that improve MY team.

MY ROSTER: ${myStr}

OTHER TEAMS IN MY LEAGUE:
${othersStr}

Propose 3 realistic trades. Each MUST be plausible — the other manager has to reasonably say yes (it should address one of their needs too, or be fair value). Output EXACT JSON, nothing else:
[
  {
    "withTeam": "exact team name from the data",
    "youGive": ["player name(s) I send"],
    "youGet": ["player name(s) I get back"],
    "why": "why this helps MY team — 1-2 sharp sentences",
    "pitch": "the actual message I'd send that manager to sell the deal — confident, friendly, 1-2 sentences"
  }
]
TikTok creator voice. No fluff. Real player names only.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]) as TradeIdea[];
      const clean = parsed.filter(t => t.withTeam && t.youGive?.length && t.youGet?.length);
      cache[active.leagueKey] = { ts: Date.now(), ideas: clean };
      setIdeas(clean);
    } catch {
      setError('Could not scan your league right now. Try again in a sec.');
    } finally {
      setLoading(false);
    }
  }, [active, sportDef.shortLabel]);

  useEffect(() => {
    if (!active) return;
    const cached = cache[active.leagueKey];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setIdeas(cached.ideas);
      return;
    }
    find();
  }, [active?.leagueKey]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Trade Finder" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!active ? (
            <NoLeagueState sport={sport} feature="scan your league for trades" />
          ) : loading && ideas.length === 0 ? (
            <>
              <Text style={styles.title}>SCANNING YOUR{'\n'}LEAGUE…</Text>
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
                Reading every roster, hunting for deals that move the needle.
              </Text>
              <View style={{ gap: spacing.sm }}>
                {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
              </View>
            </>
          ) : error || ideas.length === 0 ? (
            <EmptyState
              emoji="😬"
              title="No trades found"
              body={error ?? "Couldn't find a clear win right now — your roster might already be balanced."}
              ctaLabel="Scan again"
              onCta={find}
            />
          ) : (
            <>
              <Text style={styles.title}>TRADES THAT{'\n'}HELP YOU.</Text>
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
                AI scanned all {ideas.length > 0 ? 'rosters' : ''} in {active.leagueName}. Here's the play.
              </Text>

              {ideas.map((idea, i) => (
                <View key={i} style={styles.tradeCard}>
                  <View style={styles.cardHead}>
                    <Ionicons name="swap-horizontal" size={15} color={colors.purple} />
                    <Text variant="labelSmall" style={{ color: colors.purple, letterSpacing: 0.6, flex: 1 }}>
                      TRADE WITH {idea.withTeam.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.swapRow}>
                    <View style={styles.swapCol}>
                      <Text variant="caption" style={{ color: colors.coral, marginBottom: 4 }}>YOU GIVE</Text>
                      {idea.youGive.map((p, j) => (
                        <Text key={j} variant="bodySmallMedium" color={colors.textPrimary}>{p}</Text>
                      ))}
                    </View>
                    <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                    <View style={styles.swapCol}>
                      <Text variant="caption" style={{ color: colors.green, marginBottom: 4 }}>YOU GET</Text>
                      {idea.youGet.map((p, j) => (
                        <Text key={j} variant="bodySmallMedium" color={colors.textPrimary}>{p}</Text>
                      ))}
                    </View>
                  </View>

                  <Text variant="bodySmall" color={colors.textSecondary} style={styles.why}>
                    {idea.why}
                  </Text>

                  <View style={styles.pitchBox}>
                    <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 0.6, marginBottom: 4 }}>
                      💬 YOUR PITCH
                    </Text>
                    <Text variant="bodySmall" color={colors.textPrimary} style={{ fontStyle: 'italic', lineHeight: 19 }}>
                      "{idea.pitch}"
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.rerun} onPress={find} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>Scan again</Text>
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
    marginBottom:  spacing.sm,
  },
  tradeCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.md,
  },
  swapRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    marginBottom:   spacing.md,
  },
  swapCol: {
    flex:            1,
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.sm,
    gap:             2,
  },
  why: {
    lineHeight:   19,
    marginBottom: spacing.md,
  },
  pitchBox: {
    backgroundColor: `${colors.purple}10`,
    borderRadius:    radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.purple,
    padding:         spacing.sm,
  },
  rerun: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.md,
  },
});
