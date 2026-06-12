import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';
import { useOnboardingStore } from '@store/useOnboardingStore';

interface Taste {
  headline: string;
  hot:      { name: string; note: string };
  cold:     { name: string; note: string };
}

const SPORT_ORDER: SportId[] = ['nfl', 'nba', 'mlb', 'nhl'];

/**
 * Conversion-first first screen. Before ANY signup, the user picks a sport
 * and gets a real AI hot take of the day — instant proof the app delivers.
 * Then we ask for the account. Front-load the magic.
 */
export default function QuickStartScreen() {
  const [picked, setPicked]   = useState<SportId | null>(null);
  const [taste, setTaste]     = useState<Taste | null>(null);
  const [loading, setLoading] = useState(false);
  const setPreferredSports    = useOnboardingStore(s => s.setPreferredSports);

  const tasteSport = useCallback(async (sport: SportId) => {
    setPicked(sport);
    setTaste(null);
    setLoading(true);
    // Remember the pick so onboarding can pre-fill it after signup.
    setPreferredSports([sport]);
    try {
      const news    = await espn.news(sport, 6).catch(() => []);
      const newsStr = news.map(n => `- ${n.headline}`).join('\n');
      const prompt  = `You're a TikTok-creator ${SPORTS[sport].shortLabel} fantasy analyst. Give me your single hottest take of the day plus one hot player and one cold player, grounded in these headlines:
${newsStr}

Output EXACT JSON, nothing else:
{
  "headline": "ONE bold take — confident, punchy, makes me want more",
  "hot":  {"name": "real player", "note": "why he's hot — 4-7 words"},
  "cold": {"name": "real player", "note": "why he's cold — 4-7 words"}
}
Real current players. No fluff.`;
      const raw = await gemini.chat(prompt, SPORTS[sport].shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      setTaste({
        headline: parsed.headline ?? '',
        hot:      parsed.hot ?? { name: '', note: '' },
        cold:     parsed.cold ?? { name: '', note: '' },
      });
    } catch {
      setTaste({
        headline: "DraftIQ's takes are loading — sign up and we'll have the league figured out for you.",
        hot:  { name: '', note: '' },
        cold: { name: '', note: '' },
      });
    } finally {
      setLoading(false);
    }
  }, [setPreferredSports]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={picked ? [`${SPORTS[picked].primaryColor}40`, 'transparent'] : [`${colors.green}22`, 'transparent']}
        style={styles.bgGlow}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Skip to signup */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
              <Text variant="bodySmall" color={colors.textTertiary}>Skip →</Text>
            </TouchableOpacity>
          </View>

          {!picked ? (
            <Animated.View entering={FadeIn.duration(400)}>
              <Text style={styles.bigTitle}>PICK A SPORT.{'\n'}GET A TAKE.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                No signup yet. Just tap a sport and see what DraftIQ's AI is calling today.
              </Text>

              <View style={styles.sportGrid}>
                {SPORT_ORDER.map((s, i) => {
                  const def = SPORTS[s];
                  return (
                    <Animated.View key={s} entering={FadeInDown.delay(i * 80).duration(400)} style={{ width: '47%' }}>
                      <TouchableOpacity
                        style={[styles.sportCard, { borderColor: `${def.primaryColor}66` }]}
                        onPress={() => tasteSport(s)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient colors={[`${def.primaryColor}22`, 'transparent']} style={StyleSheet.absoluteFill} />
                        <Text style={styles.sportEmoji}>{def.emoji}</Text>
                        <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>
                          {def.shortLabel}
                        </Text>
                        <Text variant="caption" color={colors.textTertiary}>{def.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          ) : (
            <View>
              {/* Sport chip + change */}
              <View style={styles.pickedRow}>
                <View style={[styles.pickedChip, { borderColor: `${SPORTS[picked].primaryColor}66` }]}>
                  <Text style={{ fontSize: 16 }}>{SPORTS[picked].emoji}</Text>
                  <Text variant="bodySmallMedium" color={colors.textPrimary}>{SPORTS[picked].shortLabel}</Text>
                </View>
                <TouchableOpacity onPress={() => { setPicked(null); setTaste(null); }} hitSlop={8}>
                  <Text variant="caption" color={colors.textTertiary}>Change</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color={SPORTS[picked].primaryColor} />
                  <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                    Cooking your first take…
                  </Text>
                </View>
              ) : taste ? (
                <Animated.View entering={ZoomIn.springify().damping(13)}>
                  {/* The hot take — the hook */}
                  <View style={styles.takeCard}>
                    <Sticker variant="fire" label="TODAY'S TAKE" />
                    <Text style={styles.takeText}>"{taste.headline}"</Text>
                  </View>

                  {/* Hot / cold */}
                  {(taste.hot.name || taste.cold.name) && (
                    <View style={styles.splitRow}>
                      {taste.hot.name ? (
                        <View style={styles.splitCol}>
                          <Sticker variant="hot" />
                          <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700', marginTop: 6 }}>{taste.hot.name}</Text>
                          <Text variant="caption" color={colors.textTertiary}>{taste.hot.note}</Text>
                        </View>
                      ) : null}
                      {taste.cold.name ? (
                        <View style={styles.splitCol}>
                          <Sticker variant="cold" />
                          <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700', marginTop: 6 }}>{taste.cold.name}</Text>
                          <Text variant="caption" color={colors.textTertiary}>{taste.cold.note}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* The conversion pitch */}
                  <Animated.View entering={FadeInDown.delay(300)} style={styles.pitchBox}>
                    <Text style={styles.pitchTitle}>That's just the warm-up. 🔥</Text>
                    <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22, textAlign: 'center' }}>
                      Connect your league and DraftIQ does this for YOUR exact roster — lineup calls, trade finds, waiver gold, every day.
                    </Text>
                  </Animated.View>
                </Animated.View>
              ) : null}
            </View>
          )}

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* Sticky CTA once they've seen a take */}
        {taste && !loading && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.ctaBar}>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(auth)/signup')} activeOpacity={0.85}>
              <Text style={styles.ctaText}>BUILD MY TEAM'S EDGE</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <Text variant="bodySmall" color={colors.textTertiary}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  bgGlow:    { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  scroll:    { padding: spacing.base },
  topBar:    { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  bigTitle: {
    fontSize:      44,
    fontWeight:    '900',
    color:         colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight:    48,
    marginTop:     spacing.xl,
  },
  subtitle: {
    marginTop:    spacing.sm,
    marginBottom: spacing.xl,
    lineHeight:   22,
  },
  sportGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    gap:            spacing.md,
  },
  sportCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1.5,
    padding:         spacing.lg,
    alignItems:      'center',
    gap:             4,
    overflow:        'hidden',
  },
  sportEmoji: { fontSize: 44, lineHeight: 52, marginBottom: 4 },
  pickedRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      spacing.lg,
    marginBottom:   spacing.lg,
  },
  pickedChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:    999,
    backgroundColor: colors.surface,
    borderWidth:     1,
  },
  loadingBox: { alignItems: 'center', paddingVertical: spacing['2xl'] },
  takeCard: {
    backgroundColor: `${colors.coral}10`,
    borderRadius:    radius.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.coral,
    padding:         spacing.lg,
    marginBottom:    spacing.lg,
    gap:             spacing.sm,
  },
  takeText: {
    fontSize:      26,
    fontWeight:    '800',
    color:         colors.textPrimary,
    lineHeight:    32,
    letterSpacing: -0.5,
  },
  splitRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  splitCol: {
    flex:            1,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  pitchBox: {
    alignItems:   'center',
    gap:          spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pitchTitle: {
    fontSize:   20,
    fontWeight: '800',
    color:      colors.textPrimary,
  },
  ctaBar: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    padding:         spacing.base,
    paddingBottom:   spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  ctaBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: colors.green,
    borderRadius:    999,
    paddingVertical: spacing.md,
  },
  ctaText: {
    color:         '#000',
    fontWeight:    '900',
    letterSpacing: 0.6,
    fontSize:      15,
  },
});
