import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useUserStore } from '@store/useUserStore';
import { SPORTS } from '@constants/sports';
import { gemini } from '@services/gemini';
import { SportTint } from '@components/shared/SportTint';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';

type Mode = 'overview' | 'startsit' | 'trade' | 'matchup';

const MODES: Array<{ id: Mode; label: string; emoji: string; prompt: (name: string, sport: string) => string }> = [
  {
    id: 'overview',
    label: 'Overview',
    emoji: '👁️',
    prompt: (n, s) => `Give me a sharp ${s} fantasy overview of ${n}. Role, role security, key stats, fantasy ceiling, biggest risk. 4 short paragraphs.`,
  },
  {
    id: 'startsit',
    label: 'Start/Sit',
    emoji: '🎯',
    prompt: (n, s) => `${s} fantasy: should I start ${n} this week? Give a clear START or SIT verdict + matchup reasoning + projected stat line.`,
  },
  {
    id: 'trade',
    label: 'Trade value',
    emoji: '↔️',
    prompt: (n, s) => `${s} fantasy trade value for ${n}: is he a SELL HIGH, BUY LOW, or HOLD right now? What's his realistic trade range (which other players is he worth)?`,
  },
  {
    id: 'matchup',
    label: 'Matchup',
    emoji: '📅',
    prompt: (n, s) => `${s} fantasy: what's ${n}'s next matchup? Difficulty, key opposing players to watch, and projected fantasy ceiling vs floor.`,
  },
];

export default function LookupScreen() {
  const sport      = useUserStore((s) => s.currentSport);
  const sportLabel = SPORTS[sport].shortLabel;
  const [name, setName]   = useState('');
  const [mode, setMode]   = useState<Mode>('overview');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = useCallback(async (modeId: Mode = mode) => {
    if (!name.trim()) return;
    setLoading(true);
    setAnswer('');
    setMode(modeId);
    try {
      const m = MODES.find(x => x.id === modeId)!;
      const result = await gemini.chat(m.prompt(name.trim(), sportLabel), sportLabel);
      setAnswer(result);
    } catch {
      setAnswer('AI take unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, [name, sportLabel, mode]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text variant="bodyMedium" color={colors.textPrimary}>Player Lookup</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.title}>TELL ME ABOUT{'\n'}ANY {sportLabel} PLAYER.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Type the name. Pick what you want to know. AI delivers.
              </Text>
            </Animated.View>

            {/* Search input */}
            <View style={styles.inputWrap}>
              <PlayerAvatar sport={sport} name={name || '?'} size={44} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Justin Jefferson"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => ask()}
              />
              {name.length > 0 && (
                <TouchableOpacity onPress={() => { setName(''); setAnswer(''); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Mode chips */}
            <View style={styles.modeRow}>
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => name.trim() && ask(m.id)}
                    disabled={!name.trim()}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.modeEmoji}>{m.emoji}</Text>
                    <Text variant="labelSmall" style={{
                      color: active ? colors.textPrimary : colors.textSecondary,
                      letterSpacing: 0.3,
                    }}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Result */}
            {(loading || answer) && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Ionicons name="flash" size={14} color={colors.green} />
                  <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 1 }}>
                    {(MODES.find(m => m.id === mode)?.label || '').toUpperCase()}
                  </Text>
                </View>
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.green} />
                    <Text variant="bodySmall" color={colors.textTertiary}>Thinking…</Text>
                  </View>
                ) : (
                  <Text variant="body" color={colors.textPrimary} style={styles.resultBody}>
                    {answer}
                  </Text>
                )}
              </Animated.View>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: spacing.base },
  title: {
    fontSize:      30,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight:    34,
    marginTop:     spacing.md,
    marginBottom:  spacing.sm,
  },
  subtitle: { marginBottom: spacing.lg, lineHeight: 22 },
  inputWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    padding:         spacing.base,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1.5,
    borderColor:     colors.border,
    marginBottom:    spacing.md,
  },
  input: {
    flex:            1,
    fontSize:        17,
    color:           colors.textPrimary,
    paddingVertical: 4,
    minHeight:       32,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  modeChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  modeChipActive: {
    backgroundColor: `${colors.green}18`,
    borderColor:     `${colors.green}60`,
  },
  modeEmoji: { fontSize: 14 },
  resultCard: {
    padding:         spacing.base,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     `${colors.green}40`,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    minHeight:       80,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.sm,
  },
  resultBody: { lineHeight: 22 },
});
