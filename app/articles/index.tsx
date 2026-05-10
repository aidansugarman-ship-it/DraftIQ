import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
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
  FadeIn,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';

// ─── Mock data ────────────────────────────────────────────────────────────────

type ArticleCategory = 'news' | 'analysis' | 'rankings' | 'strategy' | 'recap';
type ImpactLevel     = 'high' | 'medium' | 'low';

interface Article {
  id:         string;
  title:      string;
  summary:    string;
  category:   ArticleCategory;
  impact:     ImpactLevel;
  source:     string;
  readTime:   number;
  publishedAt: string;
  relatedPlayers: string[];
  aiTake?:    string;
  featured?:  boolean;
}

const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'Derrick Henry Placed on IR: Justice Hill, Gus Edwards Step Up',
    summary: 'The Ravens announced Henry will miss at least 3 weeks with a hamstring strain. OC Todd Monken confirmed a committee approach going forward, with Hill expected to handle third-down duties and Edwards taking early-down carries.',
    category: 'news',
    impact: 'high',
    source: 'DraftIQ News',
    readTime: 2,
    publishedAt: '1h ago',
    relatedPlayers: ['Derrick Henry', 'Justice Hill', 'Gus Edwards'],
    aiTake: 'Immediate add on Hill and Edwards. Henry loses 3+ weeks of value.',
    featured: true,
  },
  {
    id: '2',
    title: 'Christian Watson Season-Ending Hamstring: The Green Bay WR Fallout',
    summary: 'Watson\'s IR designation reshapes the Packers\' receiving corps heading into the final stretch. Romeo Doubs is the primary beneficiary, with Jayden Reed also seeing increased targets. Love\'s 280 passing yards per game make this an attractive target share.',
    category: 'analysis',
    impact: 'high',
    source: 'DraftIQ Analysis',
    readTime: 3,
    publishedAt: '3h ago',
    relatedPlayers: ['Christian Watson', 'Romeo Doubs', 'Jayden Reed'],
    aiTake: 'Doubs is a WR2 now. Add him if available — he\'s rostered in under 60% of leagues.',
    featured: true,
  },
  {
    id: '3',
    title: 'Week 12 Waiver Wire: Top 10 Must-Add Players',
    summary: 'We break down the most impactful waiver additions heading into Week 12 — from injured backfield handcuffs to emerging pass-game targets. Prioritized by league format.',
    category: 'strategy',
    impact: 'medium',
    source: 'DraftIQ Wire',
    readTime: 5,
    publishedAt: '5h ago',
    relatedPlayers: ['Tyjae Spears', 'Romeo Doubs', 'Jonnu Smith', 'Demario Douglas'],
  },
  {
    id: '4',
    title: 'Josh Allen\'s Rushing Attempts Drop: Scheme Change or Injury Caution?',
    summary: 'Allen averaged 8.2 rush attempts over the first 6 weeks but has dropped to 5.1 over the last 3. OC Joe Brady confirmed it\'s intentional — preserving Allen for the playoffs. His passing volume remains elite, keeping him a QB1.',
    category: 'analysis',
    impact: 'medium',
    source: 'DraftIQ Analysis',
    readTime: 4,
    publishedAt: '8h ago',
    relatedPlayers: ['Josh Allen'],
    aiTake: 'Rushing floor lowered but still QB1. Adjust expectations — he\'s passing his way to points now.',
  },
  {
    id: '5',
    title: 'Week 12 Rankings: Updated RB Tiers After Injury News',
    summary: 'With Henry, Watson, and J.K. Dobbins all questionable or out, the RB landscape shifts significantly. Our updated tiers reflect handcuff values and streaming options.',
    category: 'rankings',
    impact: 'high',
    source: 'DraftIQ Rankings',
    readTime: 3,
    publishedAt: '10h ago',
    relatedPlayers: ['Derrick Henry', 'J.K. Dobbins', 'Gus Edwards', 'Justice Hill'],
  },
  {
    id: '6',
    title: 'Zero RB in 2024: Why the Strategy Is Working Again',
    summary: 'After a down 2023 for Zero RB managers, the 2024 season\'s injury chaos has validated the approach. Teams that loaded up on WRs early are now winning the waiver wire.',
    category: 'strategy',
    impact: 'low',
    source: 'DraftIQ Strategy',
    readTime: 6,
    publishedAt: '1d ago',
    relatedPlayers: [],
  },
  {
    id: '7',
    title: 'Travis Kelce Targets Rebounding in Week 12 vs Soft Defense',
    summary: 'After a quiet two weeks (9 targets combined), Kelce faces a Raiders defense allowing 82 yards/game to opposing TEs. Mahomes has also targeted Kelce on 28% of routes when single-covered over the last 10 games.',
    category: 'analysis',
    impact: 'medium',
    source: 'DraftIQ Analysis',
    readTime: 3,
    publishedAt: '1d ago',
    relatedPlayers: ['Travis Kelce', 'Patrick Mahomes'],
    aiTake: 'Start Kelce with confidence. This matchup screams bounce-back week.',
  },
  {
    id: '8',
    title: 'Dynasty Outlook: Top Breakout Candidates for 2025',
    summary: 'We identify 10 players who could leap into elite dynasty value next season based on contract situations, age curves, and offensive scheme trends.',
    category: 'strategy',
    impact: 'low',
    source: 'DraftIQ Dynasty',
    readTime: 8,
    publishedAt: '2d ago',
    relatedPlayers: ['Bijan Robinson', 'Puka Nacua', 'Tank Dell', 'Rashee Rice'],
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

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
  const accentColor = CATEGORY_COLORS[article.category];

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
          <View style={[feat.impactDot, { backgroundColor: IMPACT_COLORS[article.impact] }]} />
        </View>

        <Text variant="bodyMedium" color={colors.textPrimary} style={feat.title}>
          {article.title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={feat.summary} numberOfLines={3}>
          {article.summary}
        </Text>

        {article.aiTake && (
          <View style={feat.aiTake}>
            <Text variant="labelSmall" color={colors.green} style={{ letterSpacing: 0.8 }}>AI TAKE</Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 3 }}>
              {article.aiTake}
            </Text>
          </View>
        )}

        <View style={feat.footer}>
          <Text variant="caption" color={colors.textTertiary}>{article.source}</Text>
          <View style={feat.footerRight}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary}>{article.readTime} min</Text>
            <Text variant="caption" color={colors.textTertiary}>· {article.publishedAt}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ArticleRow({ article, index }: { article: Article; index: number }) {
  const accentColor = CATEGORY_COLORS[article.category];

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
          </View>
          <Text variant="bodyMedium" color={colors.textPrimary} style={{ lineHeight: 20 }}>
            {article.title}
          </Text>
          {article.aiTake && (
            <Text variant="bodySmall" color={colors.textTertiary} numberOfLines={2} style={{ lineHeight: 18 }}>
              {article.aiTake}
            </Text>
          )}
          <View style={arow.footer}>
            <Text variant="caption" color={colors.textTertiary}>{article.source}</Text>
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
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const op = useSharedValue(0);
  const ty = useSharedValue(16);
  useEffect(() => {
    op.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: ty.value }] }));

  const featured   = MOCK_ARTICLES.filter(a => a.featured);
  const nonFeatured = MOCK_ARTICLES.filter(a => !a.featured);

  const filteredNon = nonFeatured.filter(a => {
    if (filter === 'ALL') return true;
    return a.category === filter;
  });

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
            <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
              Breaking news, AI analysis, rankings updates — everything that moves your roster.
            </Text>
          </Animated.View>

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
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

          <View style={styles.articleList}>
            {filteredNon.map((a, i) => (
              <ArticleRow key={a.id} article={a} index={i} />
            ))}
          </View>

          {filteredNon.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📰</Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                No articles in this category yet.
              </Text>
            </View>
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
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width:          36,
    height:         36,
    borderRadius:   radius.sm,
    backgroundColor: colors.surface,
    borderWidth:    1,
    borderColor:    colors.border,
    alignItems:     'center',
    justifyContent: 'center',
  },

  title: {
    ...typography.h1,
    fontSize:     44,
    lineHeight:   46,
    color:        colors.textPrimary,
    marginTop:    spacing.xl,
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight:   22,
    marginBottom: spacing.xl,
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
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical:   7,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
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
  emptyEmoji: { fontSize: 36 },
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
    gap:           spacing.sm,
  },
  impactDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  title: {
    lineHeight: 22,
  },
  summary: {
    lineHeight: 20,
  },
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
  footerRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
});

const arow = StyleSheet.create({
  wrap: {
    flexDirection:    'row',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:              spacing.md,
  },
  accent: {
    width:        3,
    borderRadius: 2,
    marginTop:    2,
  },
  top: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  impactBadge: {
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    backgroundColor:   `${colors.coral}15`,
  },
  footer: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
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
