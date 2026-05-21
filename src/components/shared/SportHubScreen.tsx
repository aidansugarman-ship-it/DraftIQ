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
import { useMyRoster } from '@hooks/useMyRoster';
import { espn, type EspnNewsItem, type EspnGame } from '@services/espn';

/**
 * One screen, used by all four sport tabs (nfl/nba/mlb/nhl).
 * This is the app's main surface — there is no separate home screen.
 * Everything here is scoped to ONE sport: roster, modes, games, news.
 */
export function SportHubScreen({ sport }: { sport: SportId }) {
  const def = SPORTS[sport];
  const setCurrentSport = useUserStore((s) => s.setCurrentSport);

  // Keep global sport selection in sync with the active tab.
  useEffect(() => {
    setCurrentSport(sport);
  }, [sport, setCurrentSport]);

  // Roster is locked to THIS sport regardless of global state.
  const { roster, loading: rosterLoading, hasLeague } = useMyRoster(sport);

  const [news,        setNews]        = useState<EspnNewsItem[]>([]);
  const [games,       setGames]       = useState<EspnGame[]>([]);
  const [injuryCount, setInjuryCount] = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);

  // ── Game bucketing ──────────────────────────────────────────────────────────
  const now     = Date.now();
  const isToday = (iso: string) => {
    const d = new Date(iso), t = new Date();
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

  const showLive     = liveGames.length > 0;
  const showToday    = !showLive && todayGames.length > 0;
  const showUpcoming = !showLive && !showToday && upcomingGames.length > 0;
  const showRecent   = !showLive && !showToday && !showUpcoming && recentFinal.length > 0;

  const displayGames =
    showLive     ? liveGames :
    showToday    ? todayGames :
    showUpcoming ? upcomingGames.slice(0, 4) :
    showRecent   ? recentFinal : [];

  const sectionLabel =
    showLive     ? 'LIVE NOW' :
    showToday    ? "TODAY'S GAMES" :
    showUpcoming ? 'UPCOMING' :
    showRecent   ? 'RECENT FINAL' : null;

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
    heroOp.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) });
    heroTy.value = withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) });
  }, [sport]);
  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOp.value,
    transform: [{ translateY: heroTy.value }],
  }));

  const starters = roster?.players.filter(p => p.isStarter) ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${def.primaryColor}55`, `${def.primaryColor}11`, 'transparent']}
        style={styles.gradient}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Top bar — profile + settings (no home screen anymore) */}
          <View style={styles.topBar}>
            <View style={styles.topBarSpacer} />
            <View style={styles.topBarBtns}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => router.push('/settings')}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero */}
          <Animated.View style={[styles.hero, heroStyle]}>
            <Text style={styles.emoji}>{def.emoji}</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{def.shortLabel}</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              {def.label} · {def.season.label}
            </Text>
          </Animated.View>

          {/* MY TEAM — Yahoo/Sleeper powered, or a connect prompt */}
          {!hasLeague ? (
            <TouchableOpacity
              style={[styles.connectCard, { borderColor: `${def.primaryColor}55` }]}
              onPress={() => router.push('/settings/connect-yahoo')}
              activeOpacity={0.85}
            >
              <View style={[styles.connectBubble, { backgroundColor: `${def.primaryColor}22` }]}>
                <Ionicons name="link" size={20} color={def.primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>
                  Connect your {def.shortLabel} league
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Link Yahoo to unlock your real roster, power rankings & personalized takes.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : rosterLoading ? (
            <View style={styles.card}>
              <ActivityIndicator size="small" color={def.primaryColor} />
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 8, textAlign: 'center' }}>
                Loading your team…
              </Text>
            </View>
          ) : roster ? (
            <>
              <SectionHeader label={`MY TEAM · ${roster.teamName.toUpperCase()}`} />
              <View style={styles.card}>
                <View style={styles.teamHeader}>
                  <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                    {roster.leagueName}
                  </Text>
                  {(roster.record.wins + roster.record.losses + roster.record.ties) > 0 && (
                    <Text variant="caption" color={colors.textTertiary}>
                      {roster.record.wins}-{roster.record.losses}
                      {roster.record.ties ? `-${roster.record.ties}` : ''}
                    </Text>
                  )}
                </View>
                {starters.slice(0, 6).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.playerRow}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/player?id=${encodeURIComponent(p.id)}&name=${encodeURIComponent(p.name)}&team=${encodeURIComponent(p.team)}&pos=${encodeURIComponent(p.position)}`)}
                  >
                    <View style={[styles.posTag, { backgroundColor: `${def.primaryColor}1A` }]}>
                      <Text variant="labelSmall" style={{ color: def.primaryColor, fontSize: 10 }}>
                        {p.position}
                      </Text>
                    </View>
                    <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
                      {p.name}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {p.team}{p.injury ? ` · ${p.injury.status}` : ''}
                    </Text>
                    {p.injury && <View style={styles.injuryDot} />}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.fullTeamBtn}
                  onPress={() => router.push('/roster')}
                  activeOpacity={0.7}
                >
                  <Text variant="bodySmallMedium" style={{ color: def.primaryColor }}>
                    Full roster & start/sit takes →
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {/* Lineup Optimizer — one-tap AI lineup */}
          {hasLeague && (
            <TouchableOpacity
              style={[styles.pwrCta, { borderColor: `${def.primaryColor}40` }]}
              onPress={() => router.push('/lineup')}
              activeOpacity={0.85}
            >
              <View style={[styles.connectBubble, { backgroundColor: `${def.primaryColor}1A` }]}>
                <Ionicons name="flash" size={18} color={def.primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>Optimize My Lineup</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  One tap — AI sets your best starters & explains every call.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Modes */}
          <SectionHeader label="MODES" />
          <View style={styles.modeRow}>
            <ModeButton emoji="⚡️" label="Mock Draft" accent={colors.gold}   onPress={() => router.push('/draft')} />
            <ModeButton emoji="🔄"  label="Add / Drop" accent={colors.coral}  onPress={() => router.push('/add-drop')} />
            <ModeButton
              emoji="🏥"
              label={injuryCount != null ? `Injuries · ${injuryCount}` : 'Injuries'}
              accent={colors.gold}
              onPress={() => router.push('/injuries')}
            />
            <ModeButton emoji="↔️"  label="Trade"      accent={colors.purple} onPress={() => router.push('/trade')} />
          </View>

          {/* Team Report — GM Score + roster holes */}
          {hasLeague && (
            <TouchableOpacity
              style={[styles.pwrCta, { borderColor: `${colors.blue}40` }]}
              onPress={() => router.push('/team-report')}
              activeOpacity={0.85}
            >
              <View style={[styles.connectBubble, { backgroundColor: `${colors.blue}1A` }]}>
                <Ionicons name="clipboard" size={18} color={colors.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>Team Report Card</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Your GM Score, position grades & the holes to fix.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Trade Finder — AI proposes trades that help you */}
          {hasLeague && (
            <TouchableOpacity
              style={[styles.pwrCta, { borderColor: `${colors.purple}40` }]}
              onPress={() => router.push('/trade-finder')}
              activeOpacity={0.85}
            >
              <View style={[styles.connectBubble, { backgroundColor: `${colors.purple}1A` }]}>
                <Ionicons name="search" size={18} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>Find Me a Trade</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  AI scans every roster & proposes deals — with the pitch.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Power Rankings — only meaningful with a connected league */}
          {hasLeague && (
            <TouchableOpacity
              style={[styles.pwrCta, { borderColor: `${colors.gold}40` }]}
              onPress={() => router.push('/power-rankings')}
              activeOpacity={0.85}
            >
              <View style={[styles.connectBubble, { backgroundColor: `${colors.gold}1A` }]}>
                <Ionicons name="trophy" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>
                  {def.shortLabel} Power Rankings
                </Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Where every team in your league stands — AI ranked.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* Games */}
          {sectionLabel && displayGames.length > 0 && (
            <>
              <SectionHeader label={sectionLabel} live={showLive} />
              <View style={styles.card}>
                {displayGames.map((g) => <GameRow key={g.id} game={g} />)}
              </View>
            </>
          )}

          {/* News */}
          <SectionHeader label={`${def.shortLabel} NEWS`} />
          <View style={styles.card}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={def.primaryColor} />
                <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 8 }}>
                  Loading {def.shortLabel}…
                </Text>
              </View>
            ) : news.length === 0 ? (
              <Text variant="bodySmall" color={colors.textTertiary}>No news right now.</Text>
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

function ModeButton({
  emoji, label, accent, onPress,
}: { emoji: string; label: string; accent: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[modeStyles.btn, { borderColor: `${accent}40` }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={modeStyles.emoji}>{emoji}</Text>
      <Text variant="caption" color={colors.textSecondary} align="center" numberOfLines={1}>
        {label}
      </Text>
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
      + ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
    height: 340,
  },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.xs,
    paddingBottom:     60,
  },
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  topBarSpacer: { flex: 1 },
  topBarBtns:   { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: `${colors.green}14`,
    borderWidth: 1, borderColor: `${colors.green}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: {
    alignItems:   'center',
    marginBottom: spacing.lg,
    marginTop:    spacing.xs,
  },
  emoji:    { fontSize: 56, lineHeight: 70 },
  title: {
    ...(typography.hero ?? typography.h1),
    fontSize:      56,
    fontWeight:    '800',
    letterSpacing: -1,
    marginTop:     spacing.xs,
  },
  subtitle: { marginTop: 4 },
  connectCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    padding:         spacing.base,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1.5,
    marginBottom:    spacing.lg,
  },
  connectBubble: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  teamHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
  },
  playerRow: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    paddingVertical:  spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  posTag: {
    minWidth: 36,
    paddingVertical:   3,
    paddingHorizontal: 6,
    borderRadius:      radius.sm,
    alignItems:        'center',
  },
  injuryDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.coral,
  },
  fullTeamBtn: {
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  pwrCta: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    padding:         spacing.base,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    marginBottom:    spacing.lg,
  },
  loadingBox: {
    alignItems:      'center',
    paddingVertical: spacing.md,
  },
  newsRow: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    gap:               spacing.sm,
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newsBullet: { fontSize: 18, lineHeight: 24, marginTop: 1 },
});

const modeStyles = StyleSheet.create({
  btn: {
    flex:              1,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderRadius:      radius.lg,
    paddingVertical:   spacing.md,
    paddingHorizontal: 4,
    alignItems:        'center',
    gap:               4,
  },
  emoji: { fontSize: 20, lineHeight: 26 },
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
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      99,
    backgroundColor:   `${colors.green}14`,
  },
  dot: {
    width: 5, height: 5, borderRadius: 5,
    backgroundColor: colors.green,
  },
});

const gameStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
