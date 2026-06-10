import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { gemini } from '@services/gemini';

interface Tier {
  label:  string;
  notes:  string;
  players: string[];
}
interface CheatSheet {
  generatedAt: number;
  bigBoard:    Tier[];   // Tier 1 / 2 / 3 ordered
  picks:       string[]; // by your draft slot, in order
  philosophy:  string;   // one-line overall strategy
}

const cache: Record<string, CheatSheet> = {};

export default function CheatSheetScreen() {
  const sport     = useUserStore(s => s.currentSport);
  const sportDef  = SPORTS[sport];
  const user      = useUserStore(s => s.user);
  const teamStyle = user?.teamStyle;
  const league    = user?.leagueSettings;

  const [pickSlot, setPickSlot] = useState('6');
  const [sheet, setSheet]       = useState<CheatSheet | null>(null);
  const [loading, setLoading]   = useState(false);

  const cacheKey = `${sport}:${pickSlot}:${teamStyle ?? ''}:${league?.scoringType ?? ''}`;

  const build = useCallback(async () => {
    setLoading(true);
    try {
      const settingsLine = `${league?.scoringType?.toUpperCase() ?? 'STANDARD'} scoring, ${league?.numTeams ?? 12}-team league, drafting at slot #${pickSlot}, team style: ${teamStyle ?? 'balanced'}`;
      const prompt = `Build a ${sportDef.shortLabel} fantasy draft cheat sheet customized to: ${settingsLine}.

Output EXACT JSON, nothing else:
{
  "philosophy": "ONE punchy sentence — overall draft strategy for THIS specific slot + style",
  "bigBoard": [
    {"label": "TIER 1 — ELITE", "notes": "what makes them tier 1", "players": ["6-8 real player names in order"]},
    {"label": "TIER 2 — STARTERS", "notes": "...", "players": ["8-12 player names"]},
    {"label": "TIER 3 — UPSIDE", "notes": "...", "players": ["8-12 names"]},
    {"label": "SLEEPERS", "notes": "late-round dart throws", "players": ["6-8 names"]}
  ],
  "picks": ["round-by-round ideal picks for THIS draft slot — 8 round suggestions, e.g. 'R1: Christian McCaffrey', 'R2: ...', 'R3: ...'"]
}
TikTok creator voice. Real current players only. Adapt to scoring + style.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      const s: CheatSheet = {
        generatedAt: Date.now(),
        philosophy:  parsed.philosophy ?? '',
        bigBoard:    Array.isArray(parsed.bigBoard) ? parsed.bigBoard : [],
        picks:       Array.isArray(parsed.picks) ? parsed.picks : [],
      };
      cache[cacheKey] = s;
      setSheet(s);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [cacheKey, league, pickSlot, sportDef.shortLabel, teamStyle]);

  useEffect(() => {
    if (cache[cacheKey]) { setSheet(cache[cacheKey]); return; }
    setSheet(null);
  }, [cacheKey]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Cheat Sheet" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>YOUR PERSONAL{'\n'}DRAFT BIBLE.</Text>
          <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
            AI builds a tier list + round-by-round plan tuned to your scoring, draft slot, and team style.
          </Text>

          {/* Draft slot input */}
          <View style={styles.controls}>
            <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 1, marginBottom: 6 }}>
              YOUR DRAFT SLOT
            </Text>
            <View style={styles.inputWrap}>
              <Ionicons name="ribbon" size={14} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={pickSlot}
                onChangeText={setPickSlot}
                placeholder="6"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text variant="caption" color={colors.textTertiary}>of {league?.numTeams ?? 12}</Text>
            </View>
          </View>

          {!sheet && !loading ? (
            <TouchableOpacity style={styles.bigBtn} onPress={build} activeOpacity={0.85}>
              <Ionicons name="flash" size={18} color="#000" />
              <Text style={styles.bigBtnText}>BUILD MY CHEAT SHEET</Text>
            </TouchableOpacity>
          ) : loading ? (
            <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                Cooking your board…
              </Text>
            </View>
          ) : sheet ? (
            <>
              <View style={styles.philosophyBox}>
                <Sticker variant="fire" label="STRATEGY" />
                <Text variant="bodyLarge" color={colors.textPrimary} style={{ fontWeight: '700', lineHeight: 24, marginTop: 6 }}>
                  "{sheet.philosophy}"
                </Text>
              </View>

              {sheet.picks.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>YOUR ROUND-BY-ROUND PLAN</Text>
                  <View style={styles.picksCard}>
                    {sheet.picks.map((p, i) => (
                      <View key={i} style={styles.pickRow}>
                        <View style={styles.pickRound}>
                          <Text style={styles.pickRoundText}>R{i + 1}</Text>
                        </View>
                        <Text variant="bodySmallMedium" color={colors.textPrimary} style={{ flex: 1 }}>
                          {p.replace(/^R\d+:\s*/i, '')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {sheet.bigBoard.map((tier, i) => (
                <View key={i} style={styles.tier}>
                  <Text style={styles.tierLabel}>{tier.label}</Text>
                  {!!tier.notes && (
                    <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing.sm, fontStyle: 'italic' }}>
                      {tier.notes}
                    </Text>
                  )}
                  <View style={styles.playerWrap}>
                    {tier.players.map((p, j) => (
                      <View key={j} style={styles.playerPill}>
                        <Text variant="caption" color={colors.textPrimary}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.rerun} onPress={build} activeOpacity={0.8}>
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
                <Text variant="bodySmall" color={colors.textSecondary}>Rebuild</Text>
              </TouchableOpacity>
            </>
          ) : null}

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
  },
  controls: { marginBottom: spacing.lg },
  inputWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  input: {
    flex:    1,
    paddingVertical: spacing.md,
    color:   colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  bigBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    paddingVertical: spacing.md,
    borderRadius:    999,
    backgroundColor: colors.green,
  },
  bigBtnText: {
    color:         '#000',
    fontWeight:    '900',
    letterSpacing: 0.6,
  },
  philosophyBox: {
    backgroundColor: `${colors.coral}0E`,
    borderRadius:    radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
    gap:             6,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom:  spacing.sm,
    marginTop:     spacing.xs,
  },
  picksCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
    gap:             6,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    paddingVertical: 4,
  },
  pickRound: {
    width:           36,
    height:          26,
    borderRadius:    radius.sm,
    backgroundColor: `${colors.gold}1A`,
    borderWidth:     1,
    borderColor:     `${colors.gold}55`,
    alignItems:      'center',
    justifyContent:  'center',
  },
  pickRoundText: {
    color:      colors.gold,
    fontSize:   11,
    fontWeight: '800',
  },
  tier: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  tierLabel: {
    fontSize:      12,
    fontWeight:    '900',
    color:         colors.textPrimary,
    letterSpacing: 1.2,
    marginBottom:  4,
  },
  playerWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  playerPill: {
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    backgroundColor:   colors.background,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  rerun: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.md,
  },
});
