import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useYahooStore } from '@store/useYahooStore';
import { useMyRoster } from '@hooks/useMyRoster';
import { gemini } from '@services/gemini';

interface BidAdvice {
  recommendedBid: number;  // % of remaining budget
  dollarRange:    string;  // e.g. "$18-24 of $100"
  verdict:        string;
  reasoning:      string;
}

export default function FaabHelperScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const active   = useYahooStore(s => s.active[sport]);
  const { roster } = useMyRoster(sport);

  const [player, setPlayer]     = useState('');
  const [budget, setBudget]     = useState('100');
  const [remaining, setRemaining] = useState('100');
  const [advice, setAdvice]     = useState<BidAdvice | null>(null);
  const [loading, setLoading]   = useState(false);

  const run = useCallback(async () => {
    if (!player.trim()) return;
    setLoading(true);
    setAdvice(null);
    try {
      const rosterStr = roster
        ? roster.players.map(p => `${p.name} (${p.position})`).join(', ')
        : '(roster unknown)';
      const prompt = `${sportDef.shortLabel} fantasy FAAB (free agent budget) bid advice.

I want to bid on: ${player.trim()}
My total FAAB budget: $${budget}
My REMAINING budget: $${remaining}
My current roster: ${rosterStr}

How much should I bid? Factor in the player's value, how much he helps MY roster specifically, and bankroll management (don't blow my whole budget unless he's a league-winner). Output EXACT JSON, nothing else:
{
  "recommendedBid": integer — % of my REMAINING budget to bid,
  "dollarRange":    "the actual dollar range — e.g. '$18-24 of your $${remaining}'",
  "verdict":        "ONE punchy line — SMASH BID / MODERATE / LOWBALL / DON'T BOTHER",
  "reasoning":      "2-3 sentences why, specific to my roster + budget situation"
}
TikTok creator voice. Real bankroll wisdom.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      setAdvice({
        recommendedBid: Math.max(0, Math.min(100, Number(parsed.recommendedBid) || 0)),
        dollarRange:    parsed.dollarRange ?? '',
        verdict:        parsed.verdict ?? '',
        reasoning:      parsed.reasoning ?? '',
      });
    } catch {
      setAdvice({ recommendedBid: 0, dollarRange: '', verdict: "Couldn't calculate", reasoning: 'Try again in a sec.' });
    } finally {
      setLoading(false);
    }
  }, [player, budget, remaining, roster, sportDef.shortLabel]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="FAAB Bid Helper" />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!active ? (
            <NoLeagueState sport={sport} feature="get smart FAAB bid amounts" />
          ) : (
            <>
              <Text style={styles.title}>HOW MUCH{'\n'}TO BID?</Text>
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
                For budget-waiver leagues. AI factors the player's value, your roster needs, AND your remaining budget so you don't overpay.
              </Text>

              <Text style={styles.label}>PLAYER YOU WANT</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={14} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder={`Any ${sportDef.shortLabel} free agent`}
                  placeholderTextColor={colors.textTertiary}
                  value={player}
                  onChangeText={setPlayer}
                />
              </View>

              <View style={styles.budgetRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>TOTAL BUDGET</Text>
                  <View style={styles.inputWrap}>
                    <Text variant="bodyMedium" color={colors.textTertiary}>$</Text>
                    <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="number-pad" maxLength={4} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>REMAINING</Text>
                  <View style={styles.inputWrap}>
                    <Text variant="bodyMedium" color={colors.textTertiary}>$</Text>
                    <TextInput style={styles.input} value={remaining} onChangeText={setRemaining} keyboardType="number-pad" maxLength={4} />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.runBtn, (!player.trim() || loading) && { opacity: 0.5 }]}
                onPress={run}
                disabled={!player.trim() || loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator size="small" color="#000" /> : (
                  <>
                    <Ionicons name="calculator" size={16} color="#000" />
                    <Text style={styles.runBtnText}>CALCULATE MY BID</Text>
                  </>
                )}
              </TouchableOpacity>

              {advice && (
                <View style={styles.resultCard}>
                  <Sticker variant="fire" label={advice.verdict} />
                  <Text style={styles.bidBig}>{advice.recommendedBid}%</Text>
                  <Text variant="bodyMedium" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                    {advice.dollarRange}
                  </Text>
                  <Text variant="body" color={colors.textPrimary} style={{ lineHeight: 22, marginTop: spacing.md, textAlign: 'center' }}>
                    {advice.reasoning}
                  </Text>
                </View>
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
  },
  label: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginBottom:  6,
    marginTop:     spacing.md,
  },
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
    fontWeight: '600',
  },
  budgetRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  runBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: spacing.md,
    borderRadius:    999,
    backgroundColor: colors.green,
    marginTop:       spacing.lg,
  },
  runBtnText: {
    color:         '#000',
    fontWeight:    '900',
    letterSpacing: 0.6,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1.5,
    borderColor:     `${colors.green}66`,
    padding:         spacing.xl,
    alignItems:      'center',
    marginTop:       spacing.lg,
  },
  bidBig: {
    fontSize:      64,
    fontWeight:    '900',
    color:         colors.green,
    letterSpacing: -3,
    marginVertical: spacing.sm,
  },
});
