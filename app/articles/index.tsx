import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { sleeper, SleeperPlayer } from '@services/sleeper';
import { gemini } from '@services/gemini';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';

// ─── Types ────────────────────────────────────────────────────────────────────

type ArticleCategory = 'news' | 'analysis' | 'rankings' | 'strategy' | 'recap';
type ImpactLevel     = 'high' | 'medium' | 'low';

interface Article {
  id:              string;
  title:           string;
  summary:         string;
  category:        ArticleCategory;
  impact:          ImpactLevel;
  source:          string;
  readTime:        number;
  publishedAt:     string;
  relatedPlayers:  string[];
  aiTake?:         string;
  featured?:       boolean;
  trendCount?:     number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FANTASY_POS = new Set(['QB', 'RB', 'WR', 'TE', 'K']);

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  news:     colors.coral,
  analysis: colors.blue,
  rankings: colors.gold,
  strategy: colors.purple,
  recap:    colors.green,
};

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  news:     'NEWS',
  analysis: 'ANALYSIS',
  rankings: 'RANKINGS',
  strategy: 'STRATEGY',
  recap:    'RECAP',
};

const IMPACT_COLORS: Record<ImpactLevel, string> = {
  high:   colors.coral,
  medium: colors.gold,
  low:    colors.textTertiary,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildArticlesFromTrending(
  adds: { player_id: string; count: number }[],
  drops: { player_id: string; count: number }[],
  players: Record<string, SleeperPlayer>,
): Article[] {
  const addArticles: Article[] = adds
    .filter(t => players[t.player_id] && FANTASY_POS.has(players[t.player_id].position))
    .slice(0, 12)
    .map((t, i): Article => {
      const p    = players[t.player_id];
      const name = p.full_name || `${p.first_name} ${p.last_name}`;
      const hasInj = !!p.injury_status;
      const trendLabel = t.count.toLocaleString();

      const title = hasInj
        ? `${name} (${p.injury_status}) driving ${trendLabel} adds in 24h`
        : `${name} is the hottest waiver add — ${trendLabel} pickups today`;

      const summary = [
        `${name} (${p.position}, ${p.team || 'FA'}) is surging on waivers with ${trendLabel} adds in the last 24 hours.`,
        hasInj ? `Current injury status: ${p.injury_status}.` : '',
        p.injury_notes ? p.injury_notes : '',
        !hasInj ? `A significant opportunity has likely opened up — check practice reports and beat reporters for context.` : '',
      ].filter(Boolean).join(' ');

      return {
        id:             `add-${t.player_id}`,
        title,
        summary,
        category:       hasInj ? 'news' : 'analysis',
        impact:         t.count > 3000 ? 'high' : t.count > 1000 ? 'medium' : 'low',
        source:         'Sleeper Live',
        readTime:       1,
        publishedAt:    'Live',
        relatedPlayers: [name],
        featured:       i < 2,
        trendCount:     t.count,
      };
    });

  const dropArticles: Article[] = drops
    .filter(t => players[t.player_id] && FANTASY_POS.has(players[t.player_id].position))
    .slice(0, 4)
    .map((t): Article => {
      const p    = players[t.player_id];
      const name = p.full_name || `${p.first_name} ${p.last_name}`;
      const hasInj = !!p.injury_status;

      return {
        id:             `drop-${t.player_id}`,
        title:          `Managers dropping ${name} — ${t.count.toLocaleString()} drops today`,
        summary:        `${name} (${p.position}, ${p.team || 'FA'}) is being cut in ${t.count.toLocaleString()} leagues in the last 24 hours. ${hasInj ? `Injury status: ${p.injury_status}.` : 'Value has likely dropped — check for a role change or matchup concerns.'}`,
        category:       'news',
        impact:         t.count > 2000 ? 'high' : 'medium',
        source:         'Sleeper Live',
        readTime:       1,
        publishedAt:    'Live',
        relatedPlayers: [name],
        trendCount:     -t.count,
      };
    });

  return [...addArticles, ...dropArticles];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type FilterTab = 'ALL' | ArticleCategory;

function CategoryBadge({ category }: { category: ArticleCategory }) {
  const color = CATEGORY_COLORS[category];
  return (
    <View style={[cat.badge, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <Text variant="labelSmall" style={{ color }}>{CATEGORY_LABELS[category]}</Text>
    </View>
  );
}

function FeaturedCard({ article }: { article: Article }) {
  const accentColor               = CATEGORY_COLORS[article.category];
  const [aiTake, setAiTake]       = useState(article.aiTake ?? '');
  const [aiLoading, setAiLoading] = useState(!article.aiTake);

  useEffect(() => {
    if (article.aiTake) { setAiLoading(false); return; }
    setAiLoading(true);
    gemini.articleTake(article.title, 'NFL')
      .then(setAiTake)
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [article.id]);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500 });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  return (
    <Animated.View style={anim}>
      <TouchableOpacity style={[feat.wrap, { borderColor: `${accentColor}35` }]} activeOpacity={0.85}>
        <LinearGradient
          colors={[`${accentColor}10`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={feat.top}>
          <CategoryBadge category={article.category} />
          <View style={feat.topRight}>
            {article.trendCount && article.trendCount > 0 && (
              <View style={feat.trendPill}>
                <Ionicons name="trending-up" size={11} color={colors.green} />
                <Text variant="caption" style={{ color: colors.green }}>
                  +{article.trendCount.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={[feat.impactDot, { backgroundColor: IMPACT_COLORS[article.impact] }]} />
          </View>
        </View>

        <Text variant="bodyMedium" color={colors.textPrimary} style={feat.title}>
          {article.title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={feat.summary} numberOfLines={3}>
          {article.summary}
        </Text>

        {/* AI Take */}
        <View style={feat.aiTake}>
          <Text variant="labelSmall" color={colors.green} style={{ letterSpacing: 0.8 }}>AI TAKE</Text>
          {aiLoading
            ? <ActivityIndicator size="small" color={colors.green} style={{ marginTop: 6 }} />
            : aiTake
              ? <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 3 }}>{aiTake}</Text>
              : null
          }
        </View>

        <View style={feat.footer}>
          <View style={feat.sourceRow}>
            <View style={feat.liveDot} />
            <Text variant="caption" color={colors.textTertiary}>{article.source}</Text>
          </View>
          <View style={feat.footerRight}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary}>{article.readTime} min · {article.publishedAt}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ArticleRow({ article, index }: { article: Article; index: number }) {
  const accentColor               = CATEGORY_COLORS[article.category];
  const [aiTake, setAiTake]       = useState(article.aiTake ?? '');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (article.aiTake) return;
    // lazy-load AI takes only for visible rows
    const timer = setTimeout(() => {
      setAiLoading(true);
      gemini.articleTake(article.title, 'NFL')
        .then(setAiTake)
        .catch(() => {})
        .finally(() => setAiLoading(false));
    }, index * 300);
    return () => clearTimeout(timer);
  }, [article.id]);

  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(index * 50, withTiming(1, { duration: 300 }));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View style={anim}>
      <TouchableOpacity style={arow.wrap} activeOpacity={0.75}>
        <View style={[arow.accent, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <View style={arow.top}>
            <CategoryBadge category={article.category} />
            {article.impact === 'high' && (
              <View style={arow.impactBadge}>
                <Text variant="caption" style={{ color: colors.coral }}>⚡ HIGH IMPACT</Text>
              </View>
            )}
            {article.trendCount && article.trendCount > 0 && (
              <View style={arow.trendBadge}>
                <Ionicons name="trending-up" size={10} color={colors.green} />
                <Text variant="caption" style={{ color: colors.green }}>+{article.trendCount.toLocaleString()}</Text>
              </View>
            )}
            {article.trendCount && article.trendCount < 0 && (
              <View style={arow.trendDropBadge}>
                <Ionicons name="trending-down" size={10} color={colors.coral} />
                <Text variant="caption" style={{ color: colors.coral }}>{article.trendCount.toLocaleString()}</Text>
              </View>
            )}
          </View>
          <Text variant="bodyMedium" color={colors.textPrimary} style={{ lineHeight: 20 }}>
            {article.title}
          </Text>
          {aiLoading
            ? <ActivityIndicator size="small" color={colors.textTertiary} />
            : aiTake
              ? <Text variant="bodySmall" color={colors.textTertiary} numberOfLines={2} style={{ lineHeight: 18 }}>{aiTake}</Text>
              : null
          }
          <View style={arow.footer}>
            <View style={arow.sourceRow}>
              <View style={arow.liveDot} />
              <Text variant="caption" color={colors.textTertiary}>{article.source}</Text>
            </View>
            <View style={arow.footerRight}>
              <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
              <Text variant="caption" color={colors.textTertiary}>{article.readTime} min · {article.publishedAt}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ArticlesScreen() {
  const [filter, setFilter]           = useState<FilterTab>('ALL');
  const [articles, setArticles]       = useState<Article[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setDataLoading(true);
    try {
      const [adds, drops, players] = await Promise.all([
        sleeper.getTrendingAdds(15),
        sleeper.getTrendingDrops(5),
        sleeper.getAllPlayers(),
      ]);
      const built = buildArticlesFromTrending(adds, drops, players);
      setArticles(built);
    } catch {
      // keep empty
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const featured    = articles.filter(a => a.featured);
  const nonFeatured = articles.filter(a => !a.featured);
  const filteredNon = nonFeatured.filter(a => filter === 'ALL' || a.category === filter);

  const filterTabs: FilterTab[] = ['ALL', 'news', 'analysis', 'rankings', 'strategy'];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>News & Analysis</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <Animated.View style={heroStyle}>
            <Text style={styles.title}>THE{'\n'}FEED.</Text>
            <View style={styles.subtitleRow}>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Live trending players from Sleeper — who's being added, dropped, and why.
              </Text>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text variant="caption" style={{ color: colors.green }}>LIVE</Text>
              </View>
            </View>
          </Animated.View>

          {dataLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
                Fetching live Sleeper trends…
              </Text>
            </View>
          ) : (
            <>
              {/* Featured */}
              {filter === 'ALL' && featured.length > 0 && (
                <>
                  <Text variant="label" color={colors.textTertiary} style={styles.sectionLabel}>
                    BREAKING
                  </Text>
                  <View style={styles.featuredList}>
                    {featured.map(a => <FeaturedCard key={a.id} article={a} />)}
                  </View>
                </>
              )}

              {/* Filter tabs */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContent}
              >
                {filterTabs.map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterTab, filter === tab && styles.filterTabActive]}
                    onPress={() => setFilter(tab)}
                    activeOpacity={0.7}
                  >
                    {tab !== 'ALL' && (
                      <View style={[styles.filterDot, { backgroundColor: CATEGORY_COLORS[tab as ArticleCategory] }]} />
                    )}
                    <Text
                      variant="labelSmall"
                      style={{ color: filter === tab ? colors.textPrimary : colors.textTertiary, letterSpacing: 0.5 }}
                    >
                      {tab === 'ALL' ? 'ALL' : CATEGORY_LABELS[tab as ArticleCategory]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Article list */}
              <Text variant="label" color={colors.textTertiary} style={styles.sectionLabel}>
                {filter === 'ALL' ? 'LATEST' : CATEGORY_LABELS[filter as ArticleCategory]}
              </Text>

              {filteredNon.length > 0 ? (
                <View style={styles.articleList}>
                  {filteredNon.map((a, i) => (
                    <ArticleRow key={a.id} article={a} index={i} />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📰</Text>
                  <Text variant="body" color={colors.textSecondary} align="center">
                    No articles in this category yet.
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     100,
  },

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
    width:           36,
    height:          36,
    borderRadius:    radius.sm,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  title: {
    ...typography.h1,
    fontSize:     44,
    lineHeight:   46,
    color:        colors.textPrimary,
    marginTop:    spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
    marginBottom:  spacing.xl,
  },
  subtitle: {
    flex:       1,
    lineHeight: 22,
  },
  livePill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      radius.full,
    backgroundColor:   `${colors.green}12`,
    borderWidth:       1,
    borderColor:       `${colors.green}30`,
    marginTop:         2,
  },
  liveDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: colors.green,
  },

  loadingBox: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },

  sectionLabel: {
    letterSpacing: 1,
    marginBottom:  spacing.md,
    marginTop:     spacing.sm,
  },
  featuredList: { gap: spacing.md, marginBottom: spacing.xl },

  filterScroll:  { marginBottom: spacing.xl },
  filterContent: { paddingRight: spacing.base, gap: spacing.sm, flexDirection: 'row' },
  filterTab: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical:   7,
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.surfaceElevated,
    borderColor:     colors.textTertiary,
  },
  filterDot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },

  articleList: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    overflow:        'hidden',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    gap:        spacing.md,
  },
  emptyEmoji:   { fontSize: 36 },
  bottomSpacer: { height: spacing.xl },
});

const feat = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.md,
    overflow:        'hidden',
  },
  top: {
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent: 'space-between',
  },
  topRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  trendPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.full,
    backgroundColor:   `${colors.green}15`,
  },
  impactDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  title:   { lineHeight: 22 },
  summary: { lineHeight: 20 },
  aiTake: {
    backgroundColor: `${colors.green}0A`,
    borderWidth:     1,
    borderColor:     `${colors.green}22`,
    borderRadius:    radius.md,
    padding:         spacing.md,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  liveDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.green,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
});

const arow = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:               spacing.md,
  },
  accent: {
    width:        3,
    borderRadius: 2,
    marginTop:    2,
  },
  top: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    gap:           spacing.sm,
  },
  impactBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    backgroundColor:   `${colors.coral}15`,
  },
  trendBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    backgroundColor:   `${colors.green}15`,
  },
  trendDropBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    backgroundColor:   `${colors.coral}15`,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           5,
  },
  liveDot: {
    width:           5,
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.green,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
});

const cat = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      radius.full,
    borderWidth:       1,
  },
});
