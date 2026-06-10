import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { EmptyState } from '@components/shared/EmptyState';
import { SkeletonRow } from '@components/shared/Skeleton';
import { SportTint } from '@components/shared/SportTint';
import { TabSwitcher } from '@components/shared/TabSwitcher';
import { TRADE_TABS } from '@components/shared/hubTabs';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useYahooStore } from '@store/useYahooStore';
import { useMyRoster } from '@hooks/useMyRoster';
import { useTradeBlockStore } from '@store/useTradeBlockStore';
import { yahooFantasy } from '@services/yahooFantasy';
import { gemini } from '@services/gemini';

interface Pitch {
  manager: string;
  pitch:   string;
}

export default function TradeBlockScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const active   = useYahooStore(s => s.active[sport]);
  const { roster } = useMyRoster(sport);
  const block    = useTradeBlockStore(s => s.list).filter(p => p.sport === sport);
  const rawToggle = useTradeBlockStore(s => s.toggle);
  const toggle   = (player: Parameters<typeof rawToggle>[0]) => {
    try { require('@store/useAchievementsStore').useAchievementsStore.getState().unlock('first_block'); } catch {}
    rawToggle(player);
  };
  const hydrated = useTradeBlockStore(s => s.hydrated);

  const [pitches, setPitches] = useState<Record<string, Pitch[]>>({});
  const [genId, setGenId]     = useState<string | null>(null);
  const [error, setError]     = useState('');

  const generatePitches = useCallback(async (playerId: string, playerName: string) => {
    if (!active) return;
    setGenId(playerId);
    setError('');
    try {
      const teams = await yahooFantasy.leagueTeams(active.leagueKey);
      const others = teams.filter(t => t.teamKey && t.teamKey !== active.teamKey).slice(0, 8);
      const rosters = await Promise.all(
        others.map(t => yahooFantasy.teamRoster(t.teamKey)
          .then(ps => ({ team: t, players: ps }))
          .catch(() => ({ team: t, players: [] }))),
      );
      const teamSummaries = rosters
        .filter(r => r.players.length > 0)
        .map(r => `${r.team.name}: ${r.players.filter(p => p.selectedPos !== 'BN').map(p => `${p.name} (${p.position})`).join(', ')}`)
        .join('\n');

      const prompt = `${sportDef.shortLabel} fantasy. I'm shopping ${playerName} from my roster.

OTHER MANAGERS IN MY LEAGUE:
${teamSummaries}

For each manager, look at their roster and write a SHORT (1-2 sentence) trade pitch tailored to THEIR specific needs — what gap on their team does ${playerName} fill? Output EXACT JSON, nothing else:
[
  {"manager": "exact team name", "pitch": "the actual message I'd send — friendly, specific to their roster"}
]
Skip managers where ${playerName} is a clear mismatch. Real player names. TikTok creator voice but professional enough to actually send.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]) as Pitch[];
      const clean = parsed.filter(p => p.manager && p.pitch).slice(0, 8);
      setPitches(prev => ({ ...prev, [playerId]: clean }));
    } catch {
      setError(`Couldn't generate pitches for ${playerName} right now.`);
    } finally {
      setGenId(null);
    }
  }, [active, sportDef.shortLabel]);

  // Auto-generate pitches for any new block additions
  useEffect(() => {
    if (!active) return;
    for (const p of block) {
      if (!pitches[p.id] && genId !== p.id) {
        generatePitches(p.id, p.name);
        break; // one at a time
      }
    }
  }, [block.length, active?.leagueKey]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Trade Center" />
        <TabSwitcher tabs={TRADE_TABS} activeKey="block" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!active ? (
            <NoLeagueState sport={sport} feature="shop your players to your league" />
          ) : !hydrated ? (
            <SkeletonRow />
          ) : (
            <>
              <Text style={styles.title}>WHO'S ON THE{'\n'}BLOCK?</Text>
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
                Tap any starter on your roster to put them on the block — AI writes a different pitch tailored to each league-mate's needs.
              </Text>

              {/* Add to block — your starters */}
              {roster && (
                <View style={styles.section}>
                  <Text style={styles.sectionHead}>YOUR STARTERS · TAP TO BLOCK</Text>
                  <View style={styles.chipWrap}>
                    {roster.players.filter(p => p.isStarter).map(p => {
                      const on = block.find(b => b.id === p.id);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.chip, on && styles.chipOn]}
                          activeOpacity={0.75}
                          onPress={() => toggle({
                            id: p.id, name: p.name, team: p.team, pos: p.position, sport,
                          })}
                        >
                          <Text variant="caption" style={{
                            color: on ? colors.coral : colors.textSecondary,
                            fontWeight: on ? '700' : '500',
                          }}>
                            {on ? '✓ ' : ''}{p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {block.length === 0 ? (
                <EmptyState
                  emoji="🤝"
                  title="Block is empty"
                  body="Tap any starter above to put them on the block. We'll write you tailored trade pitches for every league-mate."
                />
              ) : (
                block.map(p => (
                  <View key={p.id} style={styles.blockCard}>
                    <View style={styles.blockHead}>
                      <View style={{ flex: 1 }}>
                        <Sticker variant="dagger" label="ON THE BLOCK" />
                        <Text variant="bodyLarge" color={colors.textPrimary} style={{ marginTop: 4, fontWeight: '800' }}>
                          {p.name}
                        </Text>
                        <Text variant="caption" color={colors.textTertiary}>{p.pos} · {p.team}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggle({ id: p.id, name: p.name, team: p.team, pos: p.pos, sport })}
                        hitSlop={8}
                      >
                        <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
                      </TouchableOpacity>
                    </View>

                    {genId === p.id ? (
                      <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.green} />
                        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 6 }}>
                          Writing pitches for every manager…
                        </Text>
                      </View>
                    ) : (pitches[p.id] ?? []).length === 0 ? (
                      <TouchableOpacity onPress={() => generatePitches(p.id, p.name)} style={styles.regen} activeOpacity={0.8}>
                        <Ionicons name="sparkles" size={14} color={colors.green} />
                        <Text variant="bodySmall" style={{ color: colors.green }}>Generate pitches</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                        {(pitches[p.id] ?? []).map((pt, i) => (
                          <View key={i} style={styles.pitchCard}>
                            <View style={styles.pitchHead}>
                              <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 0.6, flex: 1 }}>
                                TO {pt.manager.toUpperCase()}
                              </Text>
                              <TouchableOpacity onPress={() => Share.share({ message: pt.pitch }).catch(() => {})} hitSlop={6}>
                                <Ionicons name="share-outline" size={14} color={colors.textTertiary} />
                              </TouchableOpacity>
                            </View>
                            <Text variant="bodySmall" color={colors.textPrimary} style={{ fontStyle: 'italic', lineHeight: 19, marginTop: 4 }}>
                              "{pt.pitch}"
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}

              {!!error && (
                <Text variant="caption" style={{ color: colors.coral, marginTop: spacing.md }}>{error}</Text>
              )}
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
  section: { marginBottom: spacing.lg },
  sectionHead: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginBottom:  spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      999,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  chipOn: {
    backgroundColor: `${colors.coral}1A`,
    borderColor:     `${colors.coral}55`,
  },
  blockCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
    marginBottom:  spacing.sm,
  },
  regen: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.green}10`,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     `${colors.green}30`,
    marginTop:       spacing.sm,
  },
  pitchCard: {
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.purple,
  },
  pitchHead: {
    flexDirection: 'row',
    alignItems:    'center',
  },
});
