import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { usePowerRankings, type RankedTeam } from '@hooks/usePowerRankings';
import { SportTint } from '@components/shared/SportTint';
import { EmptyState } from '@components/shared/EmptyState';
import { SkeletonRow } from '@components/shared/Skeleton';

export default function PowerRankings() {
  const { rankings, loading, error, hasLeague } = usePowerRankings();

  return (
    <View style={styles.container}>
      <SportTint sport="nfl" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Power Rankings</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {!hasLeague ? (
            <EmptyState
              emoji="🏆"
              title="Power rankings need your league"
              body="Connect your Sleeper league so we can rank every team and tell you who to fear."
              ctaLabel="Connect Sleeper"
              onCta={() => router.push('/settings/connect-sleeper')}
            />
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

function TeamCard({ team }: { team: RankedTeam }) {
  const rankColor =
    team.rank === 1 ? colors.gold :
    team.rank === 2 ? '#C0C0C0' :
    team.rank === 3 ? '#CD7F32' :
    colors.textTertiary;

  const trendIcon = team.trend === 'up' ? '📈' : team.trend === 'down' ? '📉' : '➖';

  return (
    <View style={cardStyles.wrap}>
      <View style={[cardStyles.rankBubble, { borderColor: rankColor }]}>
        <Text style={[cardStyles.rankText, { color: rankColor }]}>#{team.rank}</Text>
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
      </View>
    </View>
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
});
