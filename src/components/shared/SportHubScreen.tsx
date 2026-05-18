import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { SPORTS, type SportId } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { espn, type EspnNewsItem, type EspnInjury, type EspnGame } from '@services/espn';

/**
 * One screen, used by all four sport tabs (nfl/nba/mlb/nhl).
 * - Sets `currentSport` on mount so other features (injuries, add-drop, trade) follow.
 * - Pulls news + scoreboard + injury count from ESPN for the sport.
 * - Sport-themed hero uses the sport's primaryColor.
 */
export function SportHubScreen({ sport }: { sport: SportId }) {
  const def = SPORTS[sport];
  const setCurrentSport = useUserStore((s) => s.setCurrentSport);

  // Keep global sport selection in sync with the active sport tab
  useEffect(() => {
    setCurrentSport(sport);
  }, [sport, setCurrentSport]);

  const [news,        setNews]        = useState<EspnNewsItem[]>([]);
  const [games,       setGames]       = useState<EspnGame[]>([]);
  const [injuryCount, setInjuryCount] = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);

  // Categorize games by their actual state so the section reflects reality.
  const now           = Date.now();
  const isToday       = (iso: string) => {
    const d = new Date(iso);
    const t = new Date();
    return d.getFullYear() === t.getFullYear()
      && d.getMonth() === t.getMonth()
      && d.getDate() === t.getDate();
  };
  const liveGames     = games.filter(g => g.status?.type?.state === 'in');
  const todayGames    = games.filter(g => g.status?.type?.state !== 'in' && isToday(g.date));
  const upcomingGames = games
    .filter(g => g.status?.type?.state === 'pre' && new Date(g.date).getTime() > now && !isToday(g.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentFinal   = games.filter(g => g.status?.type?.completed && !isToday(g.date)).slice(0, 3);

  // Decide what section to show — live > today > upcoming > recent
  const showLive     = liveGames.length > 0;
  const showToday    = !showLive && todayGames.length > 0;
  const showUpcoming = !showLive && !showToday && upcomingGames.length > 0;
  const showRecent   = !showLive && !showToday && !showUpcoming && recentFinal.length > 0;

  const displayGames =
    showLive     ? liveGames :
    showToday    ? todayGames :
    showUpcoming ? upcomingGames.slice(0, 4) :
    showRecent   ? recentFinal :
    [];

  const sectionLabel =
    showLive     ? 'LIVE NOW' :
    showToday    ? "TODAY'S GAMES" :
    showUpcoming ? 'UPCOMING' :
    showRecent   ? 'RECENT FINAL' :
    null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      espn.news(sport, 6),
      espn.scoreboard(sport),
      espn.injuries(sport),
    ]).then((results) => {
      if (cancelled) return;
      const [newsRes, gamesRes, injRes] = results;
      if (newsRes.status === 'fulfilled')  setNews(newsRes.value);
      if (gamesRes.status === 'fulfilled') setGames(gamesRes.value);
      if (injRes.status === 'fulfilled')   setInjuryCount(injRes.value.length);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sport]);

  const heroOp = useSharedValue(0);
  const heroTy = useSharedValue(12);
  useEffect(() => {
    heroOp.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    heroTy.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, [sport]);
  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOp.value,
    transform: [{ translateY: heroTy.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Sport-themed gradient backdrop at top */}
      <LinearGradient
        colors={[`${def.primaryColor}40`, 'transparent']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <Animated.View style={[styles.hero, heroStyle]}>
            <Text style={styles.emoji}>{def.emoji}</Text>
            <Text style={styles.title}>{def.shortLabel}</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              {def.label} · {def.season.label}
            </Text>
          </Animated.View>

          {/* Quick action row */}
          <View style={styles.quickRow}>
            <QuickAction
              emoji="🏥"
              label={`Injuries${injuryCount != null ? ` · ${injuryCount}` : ''}`}
              accent={colors.gold}
              onPress={() => router.push('/injuries')}
            />
            <QuickAction
              emoji="🔄"
              label="Add/Drop"
              accent={colors.coral}
              onPress={() => router.push('/add-drop')}
            />
            <QuickAction
              emoji="↔️"
              label="Trade"
              accent={colors.purple}
              onPress={() => router.push('/trade')}
            />
          </View>

          {/* Games — only render when we actually have something to say */}
          {sectionLabel && displayGames.length > 0 && (
            <>
              <SectionHeader label={sectionLabel} live={showLive} />
              <View style={styles.card}>
                {displayGames.map((g) => (
                  <GameRow key={g.id} game={g} />
                ))}
              </View>
            </>
          )}

          {/* Latest news */}
          <SectionHeader label="LATEST NEWS" />
          <View style={styles.card}>
            {loading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="small" color={def.primaryColor} />
                <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 8 }}>
                  Loading {def.shortLabel}…
                </Text>
              </View>
            ) : news.length === 0 ? (
              <Text variant="bodySmall" color={colors.textTertiary}>
                No news available right now.
              </Text>
            ) : (
              news.slice(0, 5).map((n) => (
                <View key={n.id} style={styles.newsRow}>
                  <Text style={styles.newsBullet}>{def.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={2}>
                      {n.headline}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
                      {new Date(n.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuickAction({
  emoji, label, accent, onPress,
}: { emoji: string; label: string; accent: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[qaStyles.btn, { borderColor: `${accent}40` }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={qaStyles.emoji}>{emoji}</Text>
      <Text variant="caption" color={colors.textSecondary} align="center">{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ label, live }: { label: string; live?: boolean }) {
  return (
    <View style={shStyles.row}>
      <Text variant="label" color={colors.textTertiary} style={{ letterSpacing: 1 }}>{label}</Text>
      {live && (
        <View style={shStyles.livePill}>
          <View style={shStyles.dot} />
          <Text variant="labelSmall" style={{ color: colors.green, fontSize: 9 }}>LIVE</Text>
        </View>
      )}
    </View>
  );
}

function GameRow({ game }: { game: EspnGame }) {
  const home  = game.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
  const away  = game.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
  const state = game.status?.type?.state ?? 'pre';
  const date  = new Date(game.date);
  const today = new Date();
  const sameDay = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();

  let timeText: string;
  if (state === 'in') {
    timeText = game.status?.displayClock ?? 'Live';
  } else if (state === 'post' || game.status?.type?.completed) {
    timeText = `Final · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  } else if (sameDay) {
    timeText = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } else {
    timeText = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      + ' · '
      + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  const showScore = state === 'in' || state === 'post' || !!game.status?.type?.completed;

  return (
    <View style={gameStyles.row}>
      <View style={{ flex: 1 }}>
        <Text variant="bodySmall" color={colors.textPrimary}>
          {away?.team?.abbreviation ?? '—'} @ {home?.team?.abbreviation ?? '—'}
        </Text>
        <Text variant="caption" color={colors.textTertiary}>{timeText}</Text>
      </View>
      {showScore && (
        <Text variant="bodySmallMedium" color={colors.textPrimary}>
          {away?.score ?? '0'} - {home?.score ?? '0'}
        </Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  gradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.lg,
    paddingBottom:     60,
  },
  hero: {
    alignItems:   'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize:   56,
    lineHeight: 70,
  },
  title: {
    ...typography.hero ?? typography.h1,
    fontSize:   56,
    fontWeight: '800',
    color:      colors.textPrimary,
    letterSpacing: -1,
    marginTop: spacing.xs,
  },
  subtitle: {
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  loading: {
    alignItems:    'center',
    paddingVertical: spacing.md,
  },
  newsRow: {
    flexDirection:    'row',
    alignItems:       'flex-start',
    gap:              spacing.sm,
    paddingVertical:  spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newsBullet: {
    fontSize:   18,
    lineHeight: 24,
    marginTop:  1,
  },
});

const qaStyles = StyleSheet.create({
  btn: {
    flex:             1,
    backgroundColor:  colors.surface,
    borderWidth:      1,
    borderRadius:     radius.lg,
    paddingVertical:  spacing.base,
    paddingHorizontal: spacing.sm,
    alignItems:       'center',
    gap:              6,
  },
  emoji: {
    fontSize:   22,
    lineHeight: 28,
  },
});

const shStyles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
    marginTop:      spacing.xs,
  },
  livePill: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius:    99,
    backgroundColor: `${colors.green}14`,
  },
  dot: {
    width: 5, height: 5, borderRadius: 5,
    backgroundColor: colors.green,
  },
});

const gameStyles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
