import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { SportTint } from '@components/shared/SportTint';
import { TabSwitcher } from '@components/shared/TabSwitcher';
import { ROSTER_TABS } from '@components/shared/hubTabs';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useMyRoster } from '@hooks/useMyRoster';
import { gemini } from '@services/gemini';

interface Comparison {
  verdict:   string;  // headline
  scoreBefore: number; // 0-100
  scoreAfter:  number;
  wins:      string[];
  losses:    string[];
  recommend: 'YES' | 'NO' | 'MAYBE';
}

export default function WhatIfScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const { roster, hasLeague } = useMyRoster(sport);

  const [mode, setMode]         = useState<'external' | 'internal'>('external');
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [addName, setAddName]   = useState('');
  const [addId, setAddId]       = useState<string | null>(null);
  const [result, setResult]     = useState<Comparison | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const removedPlayer = roster?.players.find(p => p.id === removeId);
  const addedPlayer   = roster?.players.find(p => p.id === addId);

  async function run() {
    if (!roster || !removedPlayer) return;
    const replacementDesc = mode === 'external'
      ? addName.trim()
      : addedPlayer?.name;
    if (!replacementDesc) return;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      const rosterStr = roster.players
        .map(p => `${p.name} (${p.position}, ${p.team})${p.isStarter ? ' [STARTER]' : ' [BENCH]'}${p.injury ? `, ${p.injury.status}` : ''}`)
        .join(', ');

      const swapDescription = mode === 'external'
        ? `swap OUT ${removedPlayer.name} (${removedPlayer.position}) for ${replacementDesc} (a player NOT currently on my roster)`
        : `swap the lineup slot — START ${replacementDesc} instead of ${removedPlayer.name} (${removedPlayer.position})`;

      const prompt = `${sportDef.shortLabel} fantasy what-if simulation.

CURRENT ROSTER: ${rosterStr}

WHAT IF I ${swapDescription}?

Output EXACT JSON, nothing else:
{
  "verdict":     "ONE punchy headline — does this swap help me? TikTok creator voice",
  "scoreBefore": 0-100 rating of my roster as-is,
  "scoreAfter":  0-100 rating of my roster AFTER the swap,
  "wins":        ["what the swap GAINS — be specific, 1 line each"],
  "losses":      ["what the swap COSTS — be specific, 1 line each"],
  "recommend":   "YES" | "NO" | "MAYBE"
}
Real player names. Be honest about both sides.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      setResult({
        verdict:     parsed.verdict ?? '',
        scoreBefore: Math.max(0, Math.min(100, Number(parsed.scoreBefore) || 0)),
        scoreAfter:  Math.max(0, Math.min(100, Number(parsed.scoreAfter)  || 0)),
        wins:        Array.isArray(parsed.wins)   ? parsed.wins   : [],
        losses:      Array.isArray(parsed.losses) ? parsed.losses : [],
        recommend:   ['YES', 'NO', 'MAYBE'].includes(parsed.recommend) ? parsed.recommend : 'MAYBE',
      });
    } catch {
      setError("Couldn't run that what-if. Try a more specific player name.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Roster Tools" />
        <TabSwitcher tabs={ROSTER_TABS} activeKey="simulate" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!hasLeague ? (
            <NoLeagueState sport={sport} feature="run what-if simulations on your roster" />
          ) : !roster ? (
            <EmptyState emoji="🧪" title="Roster loading…" />
          ) : (
            <>
              <Text style={styles.title}>WHAT IF…</Text>
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
                Swap any one of your players — AI shows you exactly what you gain & lose.
              </Text>

              {/* Mode toggle */}
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'external' && styles.modeBtnOn]}
                  onPress={() => setMode('external')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="search" size={14} color={mode === 'external' ? colors.textPrimary : colors.textTertiary} />
                  <Text variant="caption" style={{
                    color: mode === 'external' ? colors.textPrimary : colors.textTertiary,
                    fontWeight: mode === 'external' ? '700' : '500',
                  }}>
                    SWAP WITH ANYONE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'internal' && styles.modeBtnOn]}
                  onPress={() => setMode('internal')}
                  activeOpacity={0.75}
                >
                  <Ionicons name="people" size={14} color={mode === 'internal' ? colors.textPrimary : colors.textTertiary} />
                  <Text variant="caption" style={{
                    color: mode === 'internal' ? colors.textPrimary : colors.textTertiary,
                    fontWeight: mode === 'internal' ? '700' : '500',
                  }}>
                    SWAP WITHIN MY TEAM
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Step 1 — pick player to remove */}
              <Text style={styles.stepLabel}>
                1 · TAP A {mode === 'internal' ? 'STARTER' : 'PLAYER'} TO {mode === 'internal' ? 'BENCH' : 'REMOVE'}
              </Text>
              <View style={styles.chipWrap}>
                {roster.players
                  .filter(p => mode === 'internal' ? p.isStarter : true)
                  .map(p => {
                    const on = removeId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.chip, on && styles.chipOn]}
                        onPress={() => setRemoveId(on ? null : p.id)}
                        activeOpacity={0.75}
                      >
                        <Text variant="caption" style={{
                          color: on ? colors.coral : colors.textSecondary,
                          fontWeight: on ? '700' : '500',
                        }}>
                          {on ? '✗ ' : ''}{p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Step 2 — pick replacement */}
              <Text style={[styles.stepLabel, { marginTop: spacing.lg }]}>
                2 · {mode === 'internal' ? 'TAP A BENCH PLAYER TO START INSTEAD' : 'TYPE A REPLACEMENT'}
              </Text>
              {mode === 'internal' ? (
                <View style={styles.chipWrap}>
                  {roster.players
                    .filter(p => !p.isStarter && p.id !== removeId)
                    .map(p => {
                      const on = addId === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.chip, on && styles.chipOnGreen]}
                          onPress={() => setAddId(on ? null : p.id)}
                          activeOpacity={0.75}
                        >
                          <Text variant="caption" style={{
                            color: on ? colors.green : colors.textSecondary,
                            fontWeight: on ? '700' : '500',
                          }}>
                            {on ? '✓ ' : ''}{p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ) : (
                <View style={styles.inputWrap}>
                  <Ionicons name="search" size={14} color={colors.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder={`Any ${sportDef.shortLabel} player`}
                    placeholderTextColor={colors.textTertiary}
                    value={addName}
                    onChangeText={setAddName}
                  />
                </View>
              )}

              {/* Step 3 — run */}
              <TouchableOpacity
                style={[
                  styles.runBtn,
                  (!removeId || (mode === 'external' ? !addName.trim() : !addId) || loading) && styles.runBtnDisabled,
                ]}
                onPress={run}
                disabled={!removeId || (mode === 'external' ? !addName.trim() : !addId) || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="flash" size={16} color="#000" />
                    <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800', letterSpacing: 0.5 }}>
                      RUN THE WHAT-IF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {!!error && (
                <Text variant="caption" style={{ color: colors.coral, marginTop: spacing.md, textAlign: 'center' }}>
                  {error}
                </Text>
              )}

              {/* Result */}
              {result && (
                <View style={styles.resultBox}>
                  <View style={styles.resultHead}>
                    <Sticker
                      variant={result.recommend === 'YES' ? 'must' : result.recommend === 'NO' ? 'dagger' : 'lockedIn'}
                      label={result.recommend === 'YES' ? 'DO IT' : result.recommend === 'NO' ? 'PASS' : 'IT DEPENDS'}
                    />
                    <View style={styles.scoreSwap}>
                      <Text variant="caption" color={colors.textTertiary}>BEFORE</Text>
                      <Text style={[styles.scoreNum, { color: colors.textPrimary }]}>{result.scoreBefore}</Text>
                      <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                      <Text style={[styles.scoreNum, {
                        color: result.scoreAfter > result.scoreBefore ? colors.green :
                               result.scoreAfter < result.scoreBefore ? colors.coral : colors.textPrimary,
                      }]}>
                        {result.scoreAfter}
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>AFTER</Text>
                    </View>
                  </View>

                  <Text variant="bodyLarge" color={colors.textPrimary} style={styles.verdict}>
                    "{result.verdict}"
                  </Text>

                  <View style={styles.splitRow}>
                    <View style={styles.splitCol}>
                      <Sticker variant="rising" label="YOU GAIN" />
                      {result.wins.map((w, i) => (
                        <Text key={`w-${i}`} variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
                          • {w}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.splitCol}>
                      <Sticker variant="falling" label="YOU LOSE" />
                      {result.losses.map((l, i) => (
                        <Text key={`l-${i}`} variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
                          • {l}
                        </Text>
                      ))}
                    </View>
                  </View>
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
    fontSize:      40,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -1,
    marginTop:     spacing.md,
    marginBottom:  spacing.sm,
  },
  stepLabel: {
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
  chipOnGreen: {
    backgroundColor: `${colors.green}1A`,
    borderColor:     `${colors.green}55`,
  },
  modeRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  spacing.lg,
  },
  modeBtn: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.md,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  modeBtnOn: {
    backgroundColor: `${colors.green}1A`,
    borderColor:     `${colors.green}55`,
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
    color:   colors.textPrimary,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  runBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: colors.green,
    borderRadius:    radius.lg,
    paddingVertical: spacing.md,
    marginTop:       spacing.lg,
  },
  runBtnDisabled: {
    opacity: 0.5,
  },
  resultBox: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginTop:       spacing.lg,
    gap:             spacing.md,
  },
  resultHead: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
  },
  scoreSwap: {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'flex-end',
    gap:            6,
  },
  scoreNum: {
    fontSize:   22,
    fontWeight: '800',
  },
  verdict: {
    fontSize:    18,
    fontWeight:  '700',
    lineHeight:  24,
  },
  splitRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  splitCol: {
    flex:            1,
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.sm,
    gap:             4,
  },
});
