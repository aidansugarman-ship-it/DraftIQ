import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { useMyRoster } from '@hooks/useMyRoster';
import { gemini } from '@services/gemini';

interface Recap {
  result:    'win' | 'loss';
  headline:  string;
  reasons:   Array<{ rank: number; text: string }>;
  fix:       string;  // what to do next week
}

const cache: Record<string, Recap> = {};

export default function LossRecapScreen() {
  const sport     = useUserStore(s => s.currentSport);
  const sportDef  = SPORTS[sport];
  const active    = useYahooStore(s => s.active[sport]);
  const { roster } = useMyRoster(sport);

  const [recap, setRecap]     = useState<Recap | null>(null);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  const cacheKey = active?.teamKey ?? '';

  const build = useCallback(async () => {
    if (!active || !roster) return;
    setLoading(true);
    setErrored(false);
    try {
      const rosterStr = roster.players
        .map(p => `${p.name} (${p.position}, ${p.team}, ${p.isStarter ? 'STARTED' : 'BENCHED'}${p.injury ? `, ${p.injury.status}` : ''})`)
        .join(', ');

      const prompt = `${sportDef.shortLabel} fantasy week recap. The user finished their most recent matchup with this lineup:

ROSTER: ${rosterStr}

If you don't have the actual matchup score, give the most likely read on whether they would have won or lost this week given their roster + bench decisions + injuries. Pretend you have the gametime data.

Output EXACT JSON, nothing else:
{
  "result":   "win" | "loss",
  "headline": "ONE punchy sentence — the story of the week",
  "reasons":  [
    {"rank": 1, "text": "the biggest factor — 1 sentence, name a specific player"},
    {"rank": 2, "text": "the second factor"},
    {"rank": 3, "text": "the third factor"}
  ],
  "fix":      "ONE actionable thing for next week — TikTok creator voice"
}
Plain English. No fantasy jargon — assume the reader is casual. Be specific about which player on their team caused what.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      const r: Recap = {
        result:   parsed.result === 'win' ? 'win' : 'loss',
        headline: parsed.headline ?? '',
        reasons:  Array.isArray(parsed.reasons) ? parsed.reasons : [],
        fix:      parsed.fix ?? '',
      };
      cache[cacheKey] = r;
      setRecap(r);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [active, roster, sportDef.shortLabel, cacheKey]);

  useEffect(() => {
    if (cache[cacheKey]) { setRecap(cache[cacheKey]); return; }
    if (roster && active) build();
  }, [cacheKey, roster, active, build]);

  const tone = recap?.result === 'win' ? colors.green : colors.coral;

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Week Recap" />
        <ScrollView contentContainerStyle={styles.scroll}>
          {!active ? (
            <NoLeagueState sport={sport} feature="get a plain-English recap of your week" />
          ) : loading && !recap ? (
            <View style={{ paddingVertical: spacing['2xl'], alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                Reading the week back…
              </Text>
            </View>
          ) : errored || !recap ? (
            <EmptyState
              emoji="🤷"
              title="Couldn't pull the recap"
              body="Try again in a sec."
              ctaLabel="Try again"
              onCta={build}
            />
          ) : (
            <>
              <Text style={[styles.title, { color: tone }]}>
                {recap.result === 'win' ? 'YOU WON.' : 'WHY YOU LOST.'}
              </Text>
              <View style={[styles.headlineBox, { borderLeftColor: tone, backgroundColor: `${tone}0E` }]}>
                <Sticker variant={recap.result === 'win' ? 'rising' : 'falling'} label={recap.result === 'win' ? 'W' : 'L'} />
                <Text variant="bodyLarge" color={colors.textPrimary} style={{ fontWeight: '700', lineHeight: 24, marginTop: 6 }}>
                  "{recap.headline}"
                </Text>
              </View>

              <Text style={styles.sectionLabel}>{recap.result === 'win' ? 'WHY YOU WON' : 'WHAT KILLED YOU'}</Text>
              {recap.reasons.map((r, i) => (
                <View key={i} style={styles.reasonRow}>
                  <View style={[styles.reasonRank, { backgroundColor: `${tone}22`, borderColor: `${tone}77` }]}>
                    <Text style={[styles.reasonRankNum, { color: tone }]}>{r.rank ?? i + 1}</Text>
                  </View>
                  <Text variant="body" color={colors.textPrimary} style={{ flex: 1, lineHeight: 22 }}>
                    {r.text}
                  </Text>
                </View>
              ))}

              {!!recap.fix && (
                <View style={styles.fixBox}>
                  <Sticker variant="lockedIn" label="NEXT WEEK" />
                  <Text variant="body" color={colors.textPrimary} style={{ fontWeight: '600', lineHeight: 22, marginTop: 6 }}>
                    {recap.fix}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.rerun} onPress={build} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>Re-run</Text>
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
    fontSize:      40,
    fontWeight:    '900',
    letterSpacing: -1,
    marginTop:     spacing.md,
    marginBottom:  spacing.md,
  },
  headlineBox: {
    borderRadius:    radius.lg,
    borderLeftWidth: 3,
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
  reasonRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reasonRank: {
    width:           36,
    height:          36,
    borderRadius:    18,
    borderWidth:     1.5,
    alignItems:      'center',
    justifyContent:  'center',
  },
  reasonRankNum: {
    fontSize:   16,
    fontWeight: '900',
  },
  fixBox: {
    backgroundColor: `${colors.gold}0E`,
    borderRadius:    radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    padding:         spacing.base,
    marginTop:       spacing.lg,
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
