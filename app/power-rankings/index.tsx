import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { usePowerRankings, computeMovers, type RankedTeam } from '@hooks/usePowerRankings';
import { Sticker } from '@components/shared/Sticker';
import { SportTint } from '@components/shared/SportTint';
import { NoLeagueState } from '@components/shared/NoLeagueState';
import { EmptyState } from '@components/shared/EmptyState';
import { SkeletonRow } from '@components/shared/Skeleton';
import { useUserStore } from '@store/useUserStore';
import { SPORTS } from '@constants/sports';

export default function PowerRankings() {
  const sport = useUserStore((s) => s.currentSport);
  const sportDef = SPORTS[sport];
  const { rankings, loading, error, hasLeague } = usePowerRankings(sport);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>{sportDef.shortLabel} Power Rankings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {!hasLeague ? (
            <NoLeagueState sport={sport} feature="rank every team in your league" />
          ) : loading ? (
            <>
              <Text style={styles.title}>POWER{'\n'}RANKINGS.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Reading every team in your league…
              </Text>
              {[0,1,2,3,4,5].map(i => <SkeletonRow key={i} height={80} />)}
            </>
          ) : error ? (
            <EmptyState emoji="😬" title="Couldn't build rankings" body={error} />
          ) : (
            <>
              <Text style={styles.title}>POWER{'\n'}RANKINGS.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Where every team stands this week. Built from records, points & roster strength.
              </Text>

              {/* Why-it-changed: biggest movers since the last snapshot */}
              <MoversBlock rankings={rankings} />

              <View style={{ gap: spacing.sm }}>
                {rankings.map((t, i) => (
                  <Animated.View key={t.ownerId} entering={FadeInDown.delay(i * 60).duration(400)}>
                    <TeamCard team={t} />
                  </Animated.View>
                ))}
              </View>
            </>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MoversBlock({ rankings }: { rankings: RankedTeam[] }) {
  const { up, down } = computeMovers(rankings);
  if (up.length === 0 && down.length === 0) return null;
  return (
    <View style={moverStyles.wrap}>
      <View style={moverStyles.header}>
        <Sticker variant="rising" label="MOVEMENT" />
        <Text variant="caption" color={colors.textTertiary}>since last snapshot</Text>
      </View>
      {up.map((m, i) => (
        <View key={`u-${i}`} style={[moverStyles.row, { borderLeftColor: colors.green }]}>
          <View style={[moverStyles.deltaBox, { backgroundColor: `${colors.green}1A`, borderColor: `${colors.green}55` }]}>
            <Text style={[moverStyles.deltaText, { color: colors.green }]}>↑{Math.abs(m.delta)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmallMedium" color={colors.textPrimary}>
              {m.team.teamName} → #{m.team.rank}
            </Text>
            {m.team.whyChanged ? (
              <Text variant="caption" color={colors.textTertiary} numberOfLines={2} style={{ marginTop: 2, lineHeight: 16 }}>
                {m.team.whyChanged}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      {down.map((m, i) => (
        <View key={`d-${i}`} style={[moverStyles.row, { borderLeftColor: colors.coral }]}>
          <View style={[moverStyles.deltaBox, { backgroundColor: `${colors.coral}1A`, borderColor: `${colors.coral}55` }]}>
            <Text style={[moverStyles.deltaText, { color: colors.coral }]}>↓{Math.abs(m.delta)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodySmallMedium" color={colors.textPrimary}>
              {m.team.teamName} → #{m.team.rank}
            </Text>
            {m.team.whyChanged ? (
              <Text variant="caption" color={colors.textTertiary} numberOfLines={2} style={{ marginTop: 2, lineHeight: 16 }}>
                {m.team.whyChanged}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const moverStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
    gap:             spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  spacing.xs,
  },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft:     spacing.sm,
    borderLeftWidth: 2,
  },
  deltaBox: {
    minWidth:        38,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius:    radius.sm,
    borderWidth:     1,
    alignItems:      'center',
  },
  deltaText: {
    fontSize:   13,
    fontWeight: '800',
  },
});

function TeamCard({ team }: { team: RankedTeam }) {
  const [open, setOpen] = useState(false);
  const rankColor =
    team.rank === 1 ? colors.gold :
    team.rank === 2 ? '#C0C0C0' :
    team.rank === 3 ? '#CD7F32' :
    colors.textTertiary;

  const trendIcon = team.trend === 'up' ? '📈' : team.trend === 'down' ? '📉' : '➖';

  return (
    <TouchableOpacity style={cardStyles.wrap} onPress={() => setOpen(o => !o)} activeOpacity={0.75}>
      <View style={[cardStyles.rankBubble, { borderColor: rankColor }]}>
        <Text style={[cardStyles.rankText, { color: rankColor }]}>#{team.rank}</Text>
        {team.delta != null && team.delta !== 0 && (
          <Text style={[
            cardStyles.deltaPill,
            { color: team.delta < 0 ? colors.green : colors.coral },
          ]}>
            {team.delta < 0 ? `↑${Math.abs(team.delta)}` : `↓${team.delta}`}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>
            {team.teamName}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>{team.record}</Text>
          <Text style={{ fontSize: 14 }}>{trendIcon}</Text>
        </View>
        <Text variant="caption" color={colors.textTertiary} numberOfLines={1} style={{ marginBottom: 4 }}>
          Top: {team.topPlayers.slice(0, 3).join(' · ') || '—'}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ lineHeight: 18 }}>
          {team.reasoning}
        </Text>
        {team.whyChanged && (
          <View style={cardStyles.whyBox}>
            <Ionicons name="flash" size={11} color={colors.gold} />
            <Text variant="caption" color={colors.textSecondary} style={{ flex: 1, lineHeight: 16, fontStyle: 'italic' }}>
              {team.whyChanged}
            </Text>
          </View>
        )}
        {open && (
          <View style={cardStyles.expanded}>
            {team.topPlayers.length > 0 && (
              <>
                <Text style={cardStyles.expandedLabel}>STAR ROSTER</Text>
                <View style={cardStyles.rosterRow}>
                  {team.topPlayers.map((p, i) => (
                    <View key={i} style={cardStyles.starPill}>
                      <Text variant="caption" color={colors.textPrimary}>{p}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </View>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} style={{ marginLeft: 4, alignSelf: 'flex-start', marginTop: 6 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
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
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: spacing.base },
  title: {
    fontSize: 40, fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 44,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  subtitle: { marginBottom: spacing.lg, lineHeight: 22 },
});

const cardStyles = StyleSheet.create({
  wrap: {
    flexDirection:   'row',
    gap:             spacing.sm,
    padding:         spacing.base,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  rankBubble: {
    width:           44,
    height:          44,
    borderRadius:    22,
    borderWidth:     2,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.background,
  },
  rankText: {
    fontSize:     14,
    fontWeight:   '800',
    letterSpacing: -0.5,
  },
  deltaPill: {
    fontSize:      9,
    fontWeight:    '800',
    marginTop:     2,
    letterSpacing: 0.4,
  },
  whyBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             6,
    marginTop:       6,
    paddingTop:      6,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
  },
  expanded: {
    marginTop:      spacing.sm,
    paddingTop:     spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedLabel: {
    fontSize:      10,
    fontWeight:    '800',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginBottom:  6,
  },
  rosterRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },
  starPill: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      999,
    backgroundColor:   colors.background,
    borderWidth:       1,
    borderColor:       colors.border,
  },
});
