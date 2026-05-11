import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
import { useUserStore } from '@store/useUserStore';

type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PLAYERS = [
  { id: '1',  rank: 1,  name: 'Christian McCaffrey', pos: 'RB',  team: 'SF',  score: 99, adp: 1.1,  trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '2',  rank: 2,  name: 'CeeDee Lamb',         pos: 'WR',  team: 'DAL', score: 97, adp: 2.3,  trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '3',  rank: 3,  name: 'Tyreek Hill',         pos: 'WR',  team: 'MIA', score: 96, adp: 3.1,  trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '4',  rank: 4,  name: 'Justin Jefferson',    pos: 'WR',  team: 'MIN', score: 95, adp: 4.0,  trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '5',  rank: 5,  name: 'Ja\'Marr Chase',      pos: 'WR',  team: 'CIN', score: 94, adp: 4.8,  trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '6',  rank: 6,  name: 'Breece Hall',         pos: 'RB',  team: 'NYJ', score: 93, adp: 5.5,  trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '7',  rank: 7,  name: 'Saquon Barkley',      pos: 'RB',  team: 'PHI', score: 92, adp: 6.2,  trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '8',  rank: 8,  name: 'Josh Allen',          pos: 'QB',  team: 'BUF', score: 91, adp: 7.0,  trend: 'stable' as const, injuryStatus: 'questionable' as const },
  { id: '9',  rank: 9,  name: 'Lamar Jackson',       pos: 'QB',  team: 'BAL', score: 90, adp: 7.5,  trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '10', rank: 10, name: 'Amon-Ra St. Brown',   pos: 'WR',  team: 'DET', score: 89, adp: 8.3,  trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '11', rank: 11, name: 'Travis Kelce',        pos: 'TE',  team: 'KC',  score: 88, adp: 9.0,  trend: 'down'   as const, injuryStatus: 'healthy' as const },
  { id: '12', rank: 12, name: 'Sam LaPorta',         pos: 'TE',  team: 'DET', score: 86, adp: 11.2, trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '13', rank: 13, name: 'De\'Von Achane',      pos: 'RB',  team: 'MIA', score: 85, adp: 10.1, trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '14', rank: 14, name: 'Puka Nacua',          pos: 'WR',  team: 'LAR', score: 84, adp: 12.5, trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '15', rank: 15, name: 'Davante Adams',       pos: 'WR',  team: 'LV',  score: 82, adp: 13.0, trend: 'down'   as const, injuryStatus: 'healthy' as const },
  { id: '16', rank: 16, name: 'CJ Stroud',           pos: 'QB',  team: 'HOU', score: 81, adp: 14.2, trend: 'up'     as const, injuryStatus: 'healthy' as const },
  { id: '17', rank: 17, name: 'Rashee Rice',         pos: 'WR',  team: 'KC',  score: 80, adp: 15.1, trend: 'up'     as const, injuryStatus: 'doubtful' as const },
  { id: '18', rank: 18, name: 'Tony Pollard',        pos: 'RB',  team: 'TEN', score: 78, adp: 16.5, trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '19', rank: 19, name: 'Stefon Diggs',        pos: 'WR',  team: 'HOU', score: 77, adp: 17.3, trend: 'stable' as const, injuryStatus: 'healthy' as const },
  { id: '20', rank: 20, name: 'Mark Andrews',        pos: 'TE',  team: 'BAL', score: 75, adp: 18.0, trend: 'down'   as const, injuryStatus: 'questionable' as const },
];

const POSITIONS: PositionFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const STATUS_COLOR: Record<string, string> = {
  healthy:      colors.statusHealthy,
  questionable: colors.statusQuestionable,
  doubtful:     colors.statusDoubtful,
  out:          colors.statusOut,
  ir:           colors.statusIR,
  'day-to-day': colors.statusQuestionable,
};

function scoreColor(n: number) {
  if (n >= 90) return colors.green;
  if (n >= 80) return colors.gold;
  return colors.textSecondary;
}

// ─── Player Row ───────────────────────────────────────────────────────────────

const RANK_MEDAL: Record<number, { color: string; symbol: string }> = {
  1: { color: '#FFD700', symbol: '🥇' },
  2: { color: '#C0C0C0', symbol: '🥈' },
  3: { color: '#CD7F32', symbol: '🥉' },
};

function PlayerRow({
  item,
  index,
}: {
  item: typeof MOCK_PLAYERS[number];
  index: number;
}) {
  const trendColor = item.trend === 'up' ? colors.green : item.trend === 'down' ? colors.coral : colors.textTertiary;
  const trendIcon  = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '—';
  const medal      = RANK_MEDAL[item.rank];

  return (
    <TouchableOpacity
      style={[rowStyles.row, medal && { backgroundColor: `${medal.color}06` }]}
      onPress={() => router.push(`/player?id=${item.id}`)}
      activeOpacity={0.75}
    >
      <Text style={[rowStyles.rank, medal && { color: medal.color }]} numberOfLines={1}>
        {medal ? medal.symbol : item.rank}
      </Text>

      <View style={rowStyles.playerInfo}>
        <View style={rowStyles.nameRow}>
          <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
            {item.name}
          </Text>
          {item.injuryStatus !== 'healthy' && (
            <View style={[rowStyles.injuryDot, { backgroundColor: STATUS_COLOR[item.injuryStatus] }]} />
          )}
        </View>
        <View style={rowStyles.metaRow}>
          <View style={rowStyles.posTag}>
            <Text variant="labelSmall" color={colors.textTertiary}>{item.pos}</Text>
          </View>
          <Text variant="caption" color={colors.textTertiary}>{item.team}</Text>
          <Text variant="caption" color={colors.textTertiary}>ADP {item.adp}</Text>
        </View>
      </View>

      <Text style={[rowStyles.trend, { color: trendColor }]}>{trendIcon}</Text>

      <Text style={[rowStyles.score, { color: scoreColor(item.score) }]}>{item.score}</Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoardScreen() {
  const [posFilter, setPosFilter] = useState<PositionFilter>('ALL');
  const [query,     setQuery]     = useState('');

  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const filtered = MOCK_PLAYERS.filter((p) => {
    const matchPos   = posFilter === 'ALL' || p.pos === posFilter;
    const matchQuery = query.trim() === '' || p.name.toLowerCase().includes(query.toLowerCase());
    return matchPos && matchQuery;
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View style={[styles.inner, fadeStyle]}>
          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>DRAFT BOARD</Text>
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Search ──────────────────────────────────────────────────── */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search players…"
              placeholderTextColor={colors.textTertiary}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Position filter ─────────────────────────────────────────── */}
          <FlatList
            horizontal
            data={POSITIONS}
            keyExtractor={(p) => p}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.posRow}
            renderItem={({ item }) => {
              const active = posFilter === item;
              return (
                <TouchableOpacity
                  onPress={() => setPosFilter(item)}
                  activeOpacity={0.8}
                  style={[styles.posPill, active && styles.posPillActive]}
                >
                  <Text
                    variant="labelSmall"
                    color={active ? colors.background : colors.textSecondary}
                    style={styles.posLabel}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />

          {/* ── Column headers ──────────────────────────────────────────── */}
          <View style={styles.colHeaders}>
            <Text variant="labelSmall" color={colors.textTertiary} style={styles.colRank}>#</Text>
            <Text variant="labelSmall" color={colors.textTertiary} style={{ flex: 1 }}>PLAYER</Text>
            <Text variant="labelSmall" color={colors.textTertiary} style={styles.colTrend}>TRD</Text>
            <Text variant="labelSmall" color={colors.textTertiary} style={styles.colScore}>SCR</Text>
          </View>

          {/* ── Player list ─────────────────────────────────────────────── */}
          <FlatList
            data={filtered}
            keyExtractor={(p) => p.id}
            renderItem={({ item, index }) => <PlayerRow item={item} index={index} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text variant="body" color={colors.textTertiary} align="center">
                  No players match your search.
                </Text>
              </View>
            }
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  inner:     { flex: 1 },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: spacing.base,
    paddingTop:     spacing.base,
    paddingBottom:  spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  filterBtn: {
    width:           38,
    height:          38,
    borderRadius:    radius.md,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  searchWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    marginHorizontal: spacing.base,
    paddingHorizontal: spacing.md,
    height:          44,
    gap:             spacing.sm,
    marginBottom:    spacing.md,
  },
  searchIcon:  {},
  searchInput: {
    flex:      1,
    color:     colors.textPrimary,
    ...typography.body,
    paddingVertical: 0,
  },

  posRow: {
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.md,
    gap:               spacing.xs,
  },
  posPill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   6,
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  posPillActive: {
    backgroundColor: colors.green,
    borderColor:     colors.green,
  },
  posLabel: { letterSpacing: 0.5 },

  colHeaders: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap:              spacing.md,
  },
  colRank:  { width: 28, textAlign: 'center' },
  colTrend: { width: 28, textAlign: 'center' },
  colScore: { width: 44, textAlign: 'right' },

  listContent: { paddingBottom: 100 },

  empty: {
    paddingTop:  spacing['3xl'],
    alignItems:  'center',
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:              spacing.md,
  },
  rank: {
    ...typography.statSmall,
    width:     28,
    textAlign: 'center',
    color:     colors.textTertiary,
  },
  playerInfo: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  injuryDot: {
    width:        7,
    height:       7,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  posTag: {
    paddingHorizontal: 6,
    paddingVertical:   1,
    borderRadius:      radius.xs,
    backgroundColor:   colors.surfaceElevated,
  },
  trend: {
    ...typography.h4,
    fontSize: 18,
    width:    28,
    textAlign: 'center',
  },
  score: {
    ...typography.stat,
    fontSize:  22,
    width:     44,
    textAlign: 'right',
  },
});
