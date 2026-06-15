import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useMyRoster } from '@hooks/useMyRoster';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';
import { useAchievementsStore } from '@store/useAchievementsStore';
import { ShareableCard } from '@components/shared/ShareableCard';

type Status = 'good' | 'mid' | 'bad';
interface Result {
  status:   Status;
  headline: string;
  why:      string;
}

const TONES: Record<Status, { color: string; emoji: string; label: string }> = {
  good: { color: colors.green, emoji: '🟢', label: "YOU'RE GOOD" },
  mid:  { color: colors.gold,  emoji: '🟡', label: 'HEADS UP' },
  bad:  { color: colors.coral, emoji: '🔴', label: 'DO SOMETHING' },
};

export default function AmIGoodScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const { roster, hasLeague } = useMyRoster(sport);
  const [result, setResult]   = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const unlock = useAchievementsStore(s => s.unlock);

  const ask = useCallback(async () => {
    if (!roster) return;
    unlock('first_am_i_good');
    setLoading(true);
    setResult(null);
    try {
      const headlines = await espn.news(sport, 8).catch(() => []);
      const newsStr   = headlines.map(n => `- ${n.headline}`).join('\n');
      const starters  = roster.players.filter(p => p.isStarter)
        .map(p => `${p.name} (${p.position}, ${p.team}${p.injury ? `, ${p.injury.status}` : ''})`)
        .join(', ');
      const bench = roster.players.filter(p => !p.isStarter)
        .map(p => `${p.name} (${p.position}, ${p.team}${p.injury ? `, ${p.injury.status}` : ''})`)
        .join(', ');

      const prompt = `Quick gut check on this ${sportDef.shortLabel} fantasy team.

STARTERS: ${starters}
BENCH: ${bench}

Recent headlines: ${newsStr || '(nothing major)'}

Plain-English verdict for the owner. Output EXACT JSON, nothing else:
{
  "status":   "good" | "mid" | "bad",
  "headline": "ONE punchy sentence — what's the bottom line",
  "why":      "1-2 sentences — the specific thing that drives the verdict. Name names. No jargon."
}
Casual-friendly voice. The owner is checking if they need to do something or can chill.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      setResult({
        status:   ['good','mid','bad'].includes(parsed.status) ? parsed.status : 'mid',
        headline: parsed.headline ?? '',
        why:      parsed.why ?? '',
      });
    } catch {
      setResult({ status: 'mid', headline: "Couldn't read your team right now.", why: 'Try again in a sec.' });
    } finally {
      setLoading(false);
    }
  }, [roster, sport, sportDef.shortLabel, unlock]);

  const tone = result ? TONES[result.status] : null;

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Am I Good?" />
        <ScrollView contentContainerStyle={styles.scroll}>
          {!hasLeague ? (
            <NoLeagueState sport={sport} feature="get a one-tap team check-in" />
          ) : !result && !loading ? (
            <View style={styles.idleBox}>
              <Text style={styles.bigEmoji}>🤔</Text>
              <Text style={styles.title}>AM I{'\n'}GOOD?</Text>
              <Text variant="body" color={colors.textSecondary} style={{ textAlign: 'center', maxWidth: 280, marginBottom: spacing.xl }}>
                One tap. AI checks your lineup, your matchup, and the news — tells you if you can chill or need to do something.
              </Text>
              <TouchableOpacity style={styles.bigBtn} onPress={ask} activeOpacity={0.85}>
                <Ionicons name="flash" size={20} color="#000" />
                <Text style={styles.bigBtnText}>CHECK MY TEAM</Text>
              </TouchableOpacity>
            </View>
          ) : loading ? (
            <View style={styles.idleBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="body" color={colors.textTertiary} style={{ marginTop: spacing.lg }}>
                Reading the room…
              </Text>
            </View>
          ) : result && tone ? (
            <Animated.View entering={ZoomIn.springify().damping(11)} style={[styles.resultCard, { borderColor: `${tone.color}AA` }]}>
              <LinearGradient
                colors={[`${tone.color}33`, `${tone.color}08`, 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.lightEmoji}>{tone.emoji}</Text>
              <Sticker variant={result.status === 'good' ? 'rising' : result.status === 'bad' ? 'must' : 'lockedIn'} label={tone.label} />
              <Animated.View entering={FadeIn.delay(180)} style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
                <Text style={[styles.resultHeadline, { color: colors.textPrimary }]}>
                  {result.headline}
                </Text>
                <Text variant="body" color={colors.textSecondary} style={styles.resultWhy}>
                  {result.why}
                </Text>
                <View style={{ marginTop: spacing.md }}>
                  <ShareableCard headline={result.headline} detail={result.why} sport={sport} />
                </View>
              </Animated.View>

              <TouchableOpacity style={styles.recheck} onPress={() => { setResult(null); ask(); }} activeOpacity={0.8}>
                <Ionicons name="refresh" size={14} color={colors.textTertiary} />
                <Text variant="caption" color={colors.textTertiary}>Re-check</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : null}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base, paddingTop: spacing.xl },
  idleBox: {
    alignItems:    'center',
    paddingTop:    spacing['2xl'],
    gap:           spacing.md,
  },
  bigEmoji: { fontSize: 72, lineHeight: 80 },
  title: {
    fontSize:      56,
    fontWeight:    '900',
    color:         colors.textPrimary,
    letterSpacing: -2,
    textAlign:     'center',
    lineHeight:    60,
  },
  bigBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:    999,
    backgroundColor: colors.green,
  },
  bigBtnText: {
    color:         '#000',
    fontWeight:    '900',
    letterSpacing: 0.8,
    fontSize:      14,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     2,
    padding:         spacing.xl,
    alignItems:      'center',
    marginTop:       spacing.xl,
    overflow:        'hidden',
  },
  lightEmoji: { fontSize: 88, lineHeight: 96, marginBottom: spacing.sm },
  resultHeadline: {
    fontSize:      26,
    fontWeight:    '800',
    textAlign:     'center',
    lineHeight:    32,
    letterSpacing: -0.5,
  },
  resultWhy: {
    textAlign:  'center',
    lineHeight: 22,
  },
  recheck: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginTop:     spacing.xl,
    paddingVertical: spacing.sm,
  },
});
