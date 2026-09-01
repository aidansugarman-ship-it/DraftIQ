import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
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
import { getDraftBoard, type BoardPlayer } from '@services/draftBoard';

type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

const POSITIONS: PositionFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

const STATUS_COLOR: Record<string, string> = {
  healthy:      colors.statusHealthy,
  questionable: colors.statusQuestionable,
  doubtful:     colors.statusDoubtful,
  out:          colors.statusOut,
  ir:           colors.statusIR,
  'day-to-day': colors.statusQuestionable,
};

// Elite / starter / depth tiers by overall consensus rank.
function rankColor(rank: number) {
  if (rank <= 24) return colors.green;
  if (rank <= 60) return colors.gold;
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
  item: BoardPlayer;
  index: number;
}) {
  const trendColor = item.trend === 'up' ? colors.green : item.trend === 'down' ? colors.coral : colors.textTertiary;
  const trendIcon  = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '—';
  const medal      = RANK_MEDAL[item.rank];

  return (
    <TouchableOpacity
      style={[rowStyles.row, medal && { backgroundColor: `${medal.color}06` }]}
      onPress={() => router.push(`/player?id=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}&team=${encodeURIComponent(item.team)}&pos=${encodeURIComponent(item.pos)}`)}
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
          {item.age != null && (
            <Text variant="caption" color={colors.textTertiary}>Age {item.age}</Text>
          )}
        </View>
      </View>

      <Text style={[rowStyles.trend, { color: trendColor }]}>{trendIcon}</Text>

      <Text style={[rowStyles.score, { color: rankColor(item.rank) }]}>
        {item.pos}{item.posRank}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoardScreen() {
  const [posFilter, setPosFilter] = useState<PositionFilter>('ALL');
  const [query,     setQuery]     = useState('');
  const [players,   setPlayers]   = useState<BoardPlayer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (force = false) => {
    const board = await getDraftBoard(force);
    setPlayers(board);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const filtered = players.filter((p) => {
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
            <Text variant="labelSmall" color={colors.textTertiary} style={styles.colScore}>POS</Text>
          </View>

          {/* ── Player list ─────────────────────────────────────────────── */}
          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.green} />
              <Text variant="body" color={colors.textTertiary} align="center" style={{ marginTop: spacing.md }}>
                Loading the board…
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(p) => p.id}
              renderItem={({ item, index }) => <PlayerRow item={item} index={index} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              initialNumToRender={20}
              windowSize={10}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.textTertiary}
                />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text variant="body" color={colors.textTertiary} align="center">
                    {players.length === 0
                      ? "Couldn't load the board. Pull down to try again."
                      : 'No players match your search.'}
                  </Text>
                </View>
              }
            />
          )}
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
