import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRefreshSignal } from '@store/useRefreshSignal';
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
import { TeamLogo } from '@components/shared/TeamLogo';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { PulseSection } from '@components/shared/PulseSection';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';
import { NewsTicker } from '@components/shared/NewsTicker';
import { WeeklyMatchupSection } from '@components/shared/WeeklyMatchupSection';
import { ScheduleStrength } from '@components/shared/ScheduleStrength';
import { DailySnapshotCard } from '@components/shared/DailySnapshotCard';
import { DraftIQScoreCard } from '@components/shared/DraftIQScoreCard';
import { LiveNowSection } from '@components/shared/LiveNowSection';
import { SectionGroup } from '@components/shared/SectionGroup';
import { HubTutorialOverlay } from '@components/shared/HubTutorialOverlay';
import { ExplainThisFAB } from '@components/shared/ExplainThisFAB';
import { useFirstRunStore } from '@store/useFirstRunStore';
import { useDailyStreakStore } from '@store/useDailyStreakStore';

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
  const [refreshing,  setRefreshing]  = useState(false);
  const bumpRefresh = useRefreshSignal((s) => s.bump);

  const onPullRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    bumpRefresh();
    // Brief delay so users see the spinner ack their gesture
    setTimeout(() => setRefreshing(false), 600);
  };

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
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={def.primaryColor}
              colors={[def.primaryColor]}
            />
          }
        >

          {/* Top bar — profile + settings (no home screen anymore) */}
          <SettingsTopBar />


          {/* Hero */}
          <Animated.View style={[styles.hero, heroStyle]}>
            <Text style={styles.emoji}>{def.emoji}</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{def.shortLabel}</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              {def.label} · {def.season.label}
            </Text>
            <StreakBadge />
          </Animated.View>

          {/* Stock ticker — scrolling marquee of live headlines */}
          <NewsTicker sport={sport} />

          {/* LIVE NOW — only renders when games are actually in progress */}
          <LiveNowSection sport={sport} />

          {/* ─── TODAY ─── what changed + what's hot */}
          <SectionGroup label="TODAY" emoji="⚡" accent={colors.gold} subtitle="What changed + what's hot right now">
            <DailySnapshotCard sport={sport} />
            <PulseSection sport={sport} />
            <WeeklyMatchupSection sport={sport} />
          </SectionGroup>

          {/* ─── YOUR TEAM ─── flex stat + roster + tools */}
          <SectionGroup label="YOUR TEAM" emoji="🏆" accent={colors.green} subtitle="Your flex stat, roster & tools">

          <DraftIQScoreCard />

          {/* MY TEAM — Yahoo/Sleeper powered, or smart no-league message */}
          {!hasLeague ? (
            <View style={{ marginBottom: spacing.lg }}>
              <NoLeagueState sport={sport} feature={`power your ${def.shortLabel} hub`} />
            </View>
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
                    <PlayerAvatar sport={sport} id={p.id} name={p.name} size={28} />
                    <TeamLogo sport={sport} team={p.team} size={18} />
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
                  onPress={() => router.push(`/roster?sport=${sport}` as any)}
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

            {/* Team Report — GM Score + roster holes — moved into YOUR TEAM */}
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
                  GM Score, position grades & the holes to fix.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Schedule strength */}
            <ScheduleStrength sport={sport} />
          </SectionGroup>

          {/* ─── YOUR LEAGUE ─── league-wide tools */}
          <SectionGroup label="YOUR LEAGUE" emoji="🏟" accent={colors.purple} subtitle="Power rankings, trades, your other teams">
            {/* Power Rankings */}
            <TouchableOpacity
              style={[styles.pwrCta, { borderColor: `${colors.gold}40` }]}
              onPress={() => router.push('/power-rankings')}
              activeOpacity={0.85}
            >
              <View style={[styles.connectBubble, { backgroundColor: `${colors.gold}1A` }]}>
                <Ionicons name="trophy" size={18} color={colors.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>{def.shortLabel} Power Rankings</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Where every team in your league stands — AI ranked.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Trade Block */}
            {hasLeague && (
              <TouchableOpacity
                style={[styles.pwrCta, { borderColor: `${colors.coral}40` }]}
                onPress={() => router.push('/trade-block' as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.connectBubble, { backgroundColor: `${colors.coral}1A` }]}>
                  <Ionicons name="megaphone" size={18} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color={colors.textPrimary}>Put a Player on the Block</Text>
                  <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    AI writes a different pitch for every league-mate.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}

            {/* Trade Finder */}
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

            {/* GM Wallet + Weekly Wrap — cross-sport links */}
            <View style={styles.dualCtaRow}>
              <TouchableOpacity
                style={[styles.dualCta, { borderColor: `${colors.green}40` }]}
                onPress={() => router.push('/gm-wallet' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="briefcase" size={18} color={colors.green} />
                <Text variant="bodySmallMedium" color={colors.textPrimary}>GM Wallet</Text>
                <Text variant="caption" color={colors.textTertiary} align="center">All teams, one view</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dualCta, { borderColor: `${colors.purple}40` }]}
                onPress={() => router.push('/weekly-wrap' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="ribbon" size={18} color={colors.purple} />
                <Text variant="bodySmallMedium" color={colors.textPrimary}>Weekly Wrap</Text>
                <Text variant="caption" color={colors.textTertiary} align="center">Your week, shareable</Text>
              </TouchableOpacity>
            </View>
          </SectionGroup>

          {/* ─── DISCOVER ─── exploratory tools, collapsed by default */}
          <SectionGroup label="DISCOVER" emoji="🔭" accent={colors.blue} defaultOpen={false} subtitle="Spotlight, simulators & extras">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillScroll}
            style={{ marginBottom: spacing.lg }}
          >
            <ChipPill icon="help-circle"    label="Am I Good?"  subtitle="Quick check"     accent={colors.green}  onPress={() => router.push('/am-i-good' as any)} />
            <ChipPill icon="school"         label="Fantasy 101" subtitle="5-card course"   accent={colors.blue}   onPress={() => router.push('/fantasy-101' as any)} />
            <ChipPill icon="trophy"         label="Badges"      subtitle="Your wins"       accent={colors.gold}   onPress={() => router.push('/achievements' as any)} />
            <ChipPill icon="document-text"  label="Cheat Sheet" subtitle="Draft bible"     accent={colors.purple} onPress={() => router.push('/cheat-sheet' as any)} />
            <ChipPill icon="reload-circle"  label="Week Recap"  subtitle="Win or loss"     accent={colors.coral}  onPress={() => router.push('/loss-recap' as any)} />
            <ChipPill icon="podium"         label="Playoff Odds" subtitle="Season sim"     accent={colors.green}  onPress={() => router.push('/playoff-sim' as any)} />
            <ChipPill icon="cash"           label="FAAB Bid"    subtitle="How much?"       accent={colors.gold}   onPress={() => router.push('/faab-helper' as any)} />
            <ChipPill icon="play-circle"    label="Spotlight"  subtitle="TikTok feed"     accent={colors.green}  onPress={() => router.push('/spotlight' as any)} />
            <ChipPill icon="flask"          label="What If"    subtitle="Swap sim"        accent={colors.blue}   onPress={() => router.push('/what-if' as any)} />
            <ChipPill icon="archive"        label="Vault"      subtitle="Saved mocks"     accent={colors.purple} onPress={() => router.push('/draft-vault' as any)} />
            <ChipPill icon="notifications"  label="Alerts"     subtitle="Custom pings"    accent={colors.gold}   onPress={() => router.push('/alerts' as any)} />
            <ChipPill icon="flash"          label="Mock Draft" subtitle="Pre-draft prep"  accent={colors.textTertiary} onPress={() => router.push('/draft')} />
            <ChipPill icon="swap-vertical"  label="Add / Drop" subtitle="Waiver wire"     accent={colors.coral}  onPress={() => router.push('/add-drop')} />
            <ChipPill
              icon="medkit"
              label={injuryCount != null ? `Injuries · ${injuryCount}` : 'Injuries'}
              subtitle="Hurt list"
              accent={colors.coral}
              onPress={() => router.push('/injuries')}
            />
            <ChipPill icon="git-compare" label="Trade" subtitle="Builder" accent={colors.purple} onPress={() => router.push('/trade')} />
          </ScrollView>
          </SectionGroup>

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

      {/* First-launch onboarding for new users */}
      <HubTutorialOverlay />

      {/* Tap-to-translate — explains the whole hub in plain English */}
      <ExplainThisFAB
        screenName={`${def.shortLabel} Hub`}
        context={`The main screen for ${def.label} fantasy. It's split into collapsible sections: TODAY (what changed + hot takes + your matchup), YOUR TEAM (your DraftIQ Score, roster, lineup optimizer, team report, schedule), YOUR LEAGUE (power rankings, trades, your other teams), and DISCOVER (extra tools like Am I Good, Fantasy 101, playoff odds). There are quick-tap chips for jumping to features.`}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function StreakBadge() {
  const current = useDailyStreakStore(s => s.current);
  const best    = useDailyStreakStore(s => s.best);
  if (current < 1) return null;
  return (
    <TouchableOpacity
      style={streakStyles.wrap}
      onPress={() => router.push('/achievements' as any)}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize: 14 }}>🔥</Text>
      <Text style={streakStyles.count}>{current}</Text>
      <Text style={streakStyles.label}>DAY{current === 1 ? '' : 'S'}</Text>
      {best > current && (
        <Text style={streakStyles.best}>· best {best}</Text>
      )}
    </TouchableOpacity>
  );
}

function SettingsTopBar() {
  const settingsOpened     = useFirstRunStore(s => s.settingsOpened);
  const markSettingsOpened = useFirstRunStore(s => s.markSettingsOpened);
  return (
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
          onPress={() => { markSettingsOpened(); router.push('/settings'); }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          {!settingsOpened && <View style={styles.hintDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ChipPill({
  icon, label, subtitle, accent, onPress,
}: { icon: IoniconName; label: string; subtitle?: string; accent: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[pillStyles.tile, { borderColor: `${accent}55`, backgroundColor: `${accent}10` }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[pillStyles.tileIconBubble, { backgroundColor: `${accent}25` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text variant="bodySmallMedium" style={{ color: colors.textPrimary }} numberOfLines={1}>
        {label}
      </Text>
      {!!subtitle && (
        <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ fontSize: 10 }}>
          {subtitle}
        </Text>
      )}
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
  hintDot: {
    position:        'absolute',
    top:             4,
    right:           4,
    width:           9,
    height:          9,
    borderRadius:    5,
    backgroundColor: colors.coral,
    borderWidth:     1.5,
    borderColor:     colors.background,
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
  pillScroll: {
    gap:               spacing.sm,
    paddingHorizontal: 2,
  },
  dualCtaRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  dualCta: {
    flex:            1,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    padding:         spacing.base,
    alignItems:      'center',
    gap:             4,
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

const streakStyles = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: spacing.md,
    paddingVertical:   6,
    borderRadius:      999,
    backgroundColor:   `${colors.coral}18`,
    borderWidth:       1,
    borderColor:       `${colors.coral}55`,
    marginTop:         spacing.sm,
  },
  count: { fontSize: 15, fontWeight: '900', color: colors.coral, letterSpacing: -0.3 },
  label: { fontSize: 10, fontWeight: '800', color: colors.coral, letterSpacing: 0.8 },
  best:  { fontSize: 10, fontWeight: '600', color: colors.textTertiary, marginLeft: 2 },
});

const pillStyles = StyleSheet.create({
  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      999,
    borderWidth:       1,
  },
  tile: {
    width:           104,
    paddingHorizontal: 10,
    paddingVertical:   spacing.sm,
    borderRadius:    radius.lg,
    borderWidth:     1,
    alignItems:      'center',
    gap:             4,
  },
  tileIconBubble: {
    width:           34,
    height:          34,
    borderRadius:    17,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    2,
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
