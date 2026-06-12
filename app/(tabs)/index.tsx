import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { ShareTakeButton } from '@components/shared/ShareTakeButton';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useYahooStore } from '@store/useYahooStore';
import { useDailyStreakStore } from '@store/useDailyStreakStore';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';

const SPORT_ORDER: SportId[] = ['nfl', 'nba', 'mlb', 'nhl'];

interface CrossTake { sport: SportId; headline: string }
const takeCache: { ts: number; takes: CrossTake[] } = { ts: 0, takes: [] };
const CACHE_MS = 1000 * 60 * 30;

/**
 * Global HOME tab — the cross-sport landing. About the app, your streak,
 * a take-of-the-day from each sport, and fast launchers into every sport hub.
 */
export default function HomeScreen() {
  const user        = useUserStore(s => s.user);
  const setSport    = useUserStore(s => s.setCurrentSport);
  const yahooActive = useYahooStore(s => s.active);
  const streak      = useDailyStreakStore(s => s.current);
  const best        = useDailyStreakStore(s => s.best);

  const firstName = user?.displayName?.split(' ')[0] ?? 'GM';
  const primary   = user?.primarySport ?? 'nfl';

  const [takes, setTakes]   = useState<CrossTake[]>(takeCache.takes);
  const [loading, setLoading] = useState(false);

  const loadTakes = useCallback(async () => {
    if (Date.now() - takeCache.ts < CACHE_MS && takeCache.takes.length) {
      setTakes(takeCache.takes);
      return;
    }
    setLoading(true);
    // Only generate takes for sports the user actually follows (connected or primary)
    const followed = SPORT_ORDER.filter(s => yahooActive[s]) ;
    const target = followed.length ? followed : [primary];
    try {
      const results = await Promise.all(target.slice(0, 4).map(async (sport) => {
        try {
          const news = await espn.news(sport, 4).catch(() => []);
          const newsStr = news.map(n => `- ${n.headline}`).join('\n');
          const raw = await gemini.chat(
            `Give me ONE bold ${SPORTS[sport].shortLabel} fantasy take of the day in a single punchy sentence, grounded in: ${newsStr}. Just the sentence, no JSON, no quotes.`,
            SPORTS[sport].shortLabel,
          );
          return { sport, headline: raw.trim().replace(/^["']|["']$/g, '').slice(0, 180) };
        } catch {
          return { sport, headline: '' };
        }
      }));
      const clean = results.filter(r => r.headline);
      takeCache.ts = Date.now();
      takeCache.takes = clean;
      setTakes(clean);
    } finally {
      setLoading(false);
    }
  }, [yahooActive, primary]);

  useEffect(() => { loadTakes(); }, [loadTakes]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[`${colors.green}22`, 'transparent']} style={styles.bgGlow} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 1 }}>
                {greeting()}
              </Text>
              <Text style={styles.name}>{firstName.toUpperCase()}</Text>
            </View>
            <View style={styles.headerBtns}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
                <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Streak strip */}
          {streak >= 1 && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.streakStrip}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>
                  {streak}-day streak
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {best > streak ? `Best: ${best} days — go catch it.` : "You're on your best run. Keep it alive."}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/achievements' as any)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Pick your sport — fast launchers */}
          <Text style={styles.sectionLabel}>YOUR SPORTS</Text>
          <View style={styles.sportGrid}>
            {SPORT_ORDER.map((s, i) => {
              const def = SPORTS[s];
              const connected = !!yahooActive[s];
              return (
                <Animated.View key={s} entering={FadeInDown.delay(i * 60).duration(350)} style={{ width: '47%' }}>
                  <TouchableOpacity
                    style={[styles.sportCard, { borderColor: connected ? `${def.primaryColor}88` : colors.border }]}
                    onPress={() => { setSport(s); router.push(`/(tabs)/${s}`); }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[`${def.primaryColor}22`, 'transparent']} style={StyleSheet.absoluteFill} />
                    <Text style={styles.sportEmoji}>{def.emoji}</Text>
                    <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>{def.shortLabel}</Text>
                    {connected ? (
                      <View style={styles.connectedDot}>
                        <View style={[styles.dot, { backgroundColor: colors.green }]} />
                        <Text variant="caption" style={{ color: colors.green }}>Connected</Text>
                      </View>
                    ) : (
                      <Text variant="caption" color={colors.textTertiary}>Tap to explore</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Take of the day — cross sport */}
          <View style={styles.takesHead}>
            <Text style={styles.sectionLabel}>TODAY'S TAKES</Text>
            <TouchableOpacity onPress={loadTakes} hitSlop={8}>
              <Ionicons name="refresh" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          {loading && takes.length === 0 ? (
            <View style={styles.takeLoading}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 8 }}>Cooking today's takes…</Text>
            </View>
          ) : takes.length === 0 ? (
            <View style={styles.card}>
              <Text variant="bodySmall" color={colors.textTertiary}>
                Connect a league and your daily takes show up here.
              </Text>
            </View>
          ) : (
            takes.map((t, i) => {
              const def = SPORTS[t.sport];
              return (
                <Animated.View key={t.sport} entering={FadeInDown.delay(i * 80).duration(350)}>
                  <TouchableOpacity
                    style={[styles.takeCard, { borderLeftColor: def.primaryColor }]}
                    onPress={() => { setSport(t.sport); router.push(`/(tabs)/${t.sport}`); }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.takeTop}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>{def.emoji}</Text>
                        <Text variant="labelSmall" style={{ color: def.primaryColor, letterSpacing: 0.8 }}>
                          {def.shortLabel} TAKE
                        </Text>
                      </View>
                      <ShareTakeButton headline={t.headline} sport={def.shortLabel} compact />
                    </View>
                    <Text variant="bodyLarge" color={colors.textPrimary} style={styles.takeText}>
                      "{t.headline}"
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}

          {/* About / what is DraftIQ */}
          <Text style={styles.sectionLabel}>WHAT IS DRAFTIQ?</Text>
          <View style={styles.aboutCard}>
            <Sticker variant="fire" label="YOUR EDGE" />
            <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22, marginTop: spacing.sm }}>
              DraftIQ isn't another place to play fantasy — it's the AI co-pilot that
              sits on top of your Yahoo league and tells you exactly what to do. Sharp
              takes, real roster moves, every day. Pick a sport above to dive in.
            </Text>
            <TouchableOpacity style={styles.aboutBtn} onPress={() => router.push('/fantasy-101' as any)} activeOpacity={0.8}>
              <Ionicons name="school" size={15} color={colors.green} />
              <Text variant="bodySmall" style={{ color: colors.green }}>New to fantasy? Start with Fantasy 101 →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING,';
  if (h < 18) return 'GOOD AFTERNOON,';
  return 'GOOD EVENING,';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  bgGlow:    { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  scroll:    { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    marginBottom:  spacing.lg,
    marginTop:     spacing.sm,
  },
  name: {
    fontSize:      44,
    fontWeight:    '900',
    color:         colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight:    48,
  },
  headerBtns: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  iconBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: `${colors.green}14`,
    borderWidth: 1, borderColor: `${colors.green}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  streakStrip: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    backgroundColor: `${colors.coral}12`,
    borderRadius:  radius.lg,
    borderWidth:   1,
    borderColor:   `${colors.coral}40`,
    padding:       spacing.base,
    marginBottom:  spacing.lg,
  },
  sectionLabel: {
    fontSize:      12,
    fontWeight:    '900',
    color:         colors.textTertiary,
    letterSpacing: 1.4,
    marginBottom:  spacing.sm,
    marginTop:     spacing.xs,
  },
  sportGrid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    gap:            spacing.md,
    marginBottom:   spacing.lg,
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
  sportEmoji: { fontSize: 40, lineHeight: 48, marginBottom: 2 },
  connectedDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  takesHead: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  takeLoading: { paddingVertical: spacing.xl, alignItems: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  takeCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
  },
  takeTop: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
  },
  takeText: { fontSize: 19, fontWeight: '700', lineHeight: 25, letterSpacing: -0.3 },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginTop:       spacing.xs,
  },
  aboutBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginTop:     spacing.md,
    paddingVertical: spacing.sm,
  },
});
