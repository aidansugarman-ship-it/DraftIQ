import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { JargonText } from '@components/shared/JargonText';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';
import { TeamLogo } from '@components/shared/TeamLogo';
import { FavoriteButton } from '@components/shared/FavoriteButton';
import { PageHeader } from '@components/shared/PageHeader';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useTakesLog } from '@store/useTakesLog';
import { espn } from '@services/espn';
import { gemini } from '@services/gemini';

interface ScoutReport {
  bio:        string;
  stats:      string;
  take:       string;
  vibe:       'hot' | 'cold' | 'sleeper' | 'must' | 'dagger' | 'lockedIn';
  comparable: string[];
}

const cache: Record<string, { ts: number; report: ScoutReport }> = {};
const CACHE_MS = 1000 * 60 * 30;

/**
 * Modern player profile.
 *   URL params: id, name, team, pos
 *   Hero: avatar + team logo + sticker vibe
 *   AI scout report (bio + stats + take + comparable players)
 *   Recent news (filtered for mentions of the player)
 */
export default function PlayerScreen() {
  const { id, name, team, pos } = useLocalSearchParams<{
    id?: string; name?: string; team?: string; pos?: string;
  }>();

  const storeSport = useUserStore(s => s.currentSport);
  const sport: SportId = storeSport;
  const sportDef = SPORTS[sport];

  const playerName = name?.trim() || 'Player';
  const playerTeam = team?.trim() || '';
  const playerPos  = pos?.trim() || '';
  const cacheKey   = `${sport}:${playerName.toLowerCase()}`;

  const [report, setReport]   = useState<ScoutReport | null>(cache[cacheKey]?.report ?? null);
  const [loading, setLoading] = useState(false);

  const [news, setNews]               = useState<Awaited<ReturnType<typeof espn.news>>>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  const runScout = useCallback(async () => {
    setLoading(true);
    try {
      const prompt = `${sportDef.shortLabel} fantasy scout report on ${playerName}${playerPos ? ` (${playerPos}` : ''}${playerTeam ? `${playerPos ? ', ' : ' ('}${playerTeam})` : playerPos ? ')' : ''}.

Output EXACT JSON, nothing else:
{
  "bio":        "2-3 sentences — who they are, current role, current narrative",
  "stats":      "ONE line of their key season/recent stats — '24 HR / .298 / .945 OPS' style. Real numbers if you know them",
  "take":       "2-3 sentences — sharp TikTok-creator take on their fantasy outlook RIGHT NOW",
  "vibe":       "hot" | "cold" | "sleeper" | "must" | "dagger" | "lockedIn",
  "comparable": ["3 comparable players to consider — by name only"]
}
TikTok creator voice. Real, current context. No fluff.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      const r: ScoutReport = {
        bio:        parsed.bio   ?? '',
        stats:      parsed.stats ?? '',
        take:       parsed.take  ?? '',
        vibe:       ['hot','cold','sleeper','must','dagger','lockedIn'].includes(parsed.vibe) ? parsed.vibe : 'lockedIn',
        comparable: Array.isArray(parsed.comparable) ? parsed.comparable.slice(0, 3) : [],
      };
      cache[cacheKey] = { ts: Date.now(), report: r };
      useTakesLog.getState().log({ sport, kind: 'pulse', player: playerName, take: r.take.slice(0, 80) });
      setReport(r);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [cacheKey, playerName, playerPos, playerTeam, sport, sportDef.shortLabel]);

  useEffect(() => {
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setReport(cached.report);
      return;
    }
    runScout();
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;
    setNewsLoading(true);
    espn.news(sport, 25)
      .then(items => {
        if (cancelled) return;
        const parts = playerName.toLowerCase().split(/\s+/).filter(p => p.length >= 3);
        const matches = items.filter(n => {
          const lc = (n.headline || '').toLowerCase();
          return parts.length > 0 && parts.every(p => lc.includes(p));
        });
        setNews(matches.slice(0, 6));
      })
      .catch(() => { if (!cancelled) setNews([]); })
      .finally(() => { if (!cancelled) setNewsLoading(false); });
    return () => { cancelled = true; };
  }, [playerName, sport]);

  async function share() {
    if (!report) return;
    await Share.share({
      message: `${playerName} — ${playerPos || ''} ${playerTeam ? `· ${playerTeam}` : ''}\n\n${report.stats}\n\n"${report.take}"\n\n— via DraftIQ`,
    }).catch(() => {});
  }

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader
          title=""
          right={
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <FavoriteButton player={{ id: id || playerName, name: playerName, team: playerTeam, pos: playerPos, sport }} size={20} />
              {report && (
                <TouchableOpacity onPress={share} hitSlop={8}>
                  <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
          }
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.hero}>
            <LinearGradient
              colors={[`${sportDef.primaryColor}30`, 'transparent']}
              style={styles.heroGlow}
              pointerEvents="none"
            />
            <PlayerAvatar sport={sport} id={id} name={playerName} size={88} />
            <Text style={styles.playerName} numberOfLines={2}>{playerName}</Text>
            <View style={styles.heroMeta}>
              {!!playerTeam && <TeamLogo sport={sport} team={playerTeam} size={18} />}
              <Text variant="bodySmall" color={colors.textSecondary}>
                {playerPos}{playerTeam ? ` · ${playerTeam}` : ''}
              </Text>
            </View>
            {report && <View style={{ marginTop: spacing.sm }}><Sticker variant={report.vibe} /></View>}
          </Animated.View>

          {/* Scout report */}
          {loading && !report ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: spacing.xl }]}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.sm }}>
                Cooking the scout report…
              </Text>
            </View>
          ) : report ? (
            <Animated.View entering={FadeInDown.duration(400)}>
              {!!report.bio && (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>WHO HE IS</Text>
                  <JargonText variant="body" color={colors.textPrimary} style={{ lineHeight: 22 }}>
                    {report.bio}
                  </JargonText>
                </View>
              )}

              {!!report.stats && (
                <View style={[styles.card, styles.statsCard]}>
                  <Text style={styles.sectionLabel}>KEY STATS</Text>
                  <Text style={styles.bigStats}>{report.stats}</Text>
                </View>
              )}

              {!!report.take && (
                <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.green }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm }}>
                    <Ionicons name="flash" size={14} color={colors.green} />
                    <Text style={[styles.sectionLabel, { color: colors.green, marginBottom: 0 }]}>THE TAKE</Text>
                  </View>
                  <JargonText variant="bodyLarge" color={colors.textPrimary} style={{ lineHeight: 24, fontWeight: '600' }}>
                    {report.take}
                  </JargonText>
                </View>
              )}

              {report.comparable.length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>COMPARABLE PLAYERS</Text>
                  <View style={styles.compRow}>
                    {report.comparable.map(c => (
                      <View key={c} style={styles.compPill}>
                        <Text variant="bodySmallMedium" color={colors.textPrimary}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          ) : null}

          {/* News */}
          <Text style={[styles.sectionLabel, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
            RECENT NEWS · {playerName.toUpperCase()}
          </Text>
          {newsLoading ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: spacing.lg }]}>
              <ActivityIndicator size="small" color={colors.green} />
            </View>
          ) : news.length === 0 ? (
            <View style={styles.card}>
              <Text variant="bodySmall" color={colors.textTertiary}>
                No recent {sportDef.shortLabel} headlines mention {playerName}.
              </Text>
            </View>
          ) : (
            news.map((n, i) => (
              <View key={n.id ?? i} style={styles.newsCard}>
                <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={2} style={{ lineHeight: 19 }}>
                  {n.headline}
                </Text>
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>
                  {new Date(n.published).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.rerun} onPress={runScout} activeOpacity={0.8}>
            <Ionicons name="refresh" size={14} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary}>Refresh scout report</Text>
          </TouchableOpacity>

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base, paddingTop: 0 },
  hero: {
    alignItems:    'center',
    paddingTop:    spacing.md,
    paddingBottom: spacing.lg,
    gap:           spacing.sm,
    position:      'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 200,
  },
  playerName: {
    fontSize:      30,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    textAlign:     'center',
    marginTop:     spacing.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  statsCard: {
    backgroundColor: `${colors.green}08`,
    borderColor:     `${colors.green}30`,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom:  spacing.sm,
  },
  bigStats: {
    fontSize:      22,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.3,
  },
  compRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  compPill: {
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      999,
    backgroundColor:   colors.background,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  newsCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.sm,
    marginBottom:    spacing.sm,
  },
  rerun: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.md,
    marginTop:       spacing.xs,
  },
});
