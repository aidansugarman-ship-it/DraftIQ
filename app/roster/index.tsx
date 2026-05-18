import { useCallback, useState } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useMyRoster, type RosterPlayer } from '@hooks/useMyRoster';
import { gemini } from '@services/gemini';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { SkeletonRow } from '@components/shared/Skeleton';
import { SportTint } from '@components/shared/SportTint';
import { TeamLogo } from '@components/shared/TeamLogo';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';
import { useUserStore } from '@store/useUserStore';

type Filter = 'all' | 'starters' | 'bench' | 'injured';

export default function RosterScreen() {
  const sport = useUserStore((s) => s.currentSport);
  const { roster, loading, error, hasLeague } = useMyRoster();
  const [filter, setFilter] = useState<Filter>('all');

  const heroOp = useSharedValue(0);
  const heroTy = useSharedValue(12);
  useState(() => {
    heroOp.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    heroTy.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  });
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOp.value,
    transform: [{ translateY: heroTy.value }],
  }));

  const visiblePlayers = (roster?.players ?? []).filter(p => {
    if (filter === 'starters') return p.isStarter;
    if (filter === 'bench')    return !p.isStarter;
    if (filter === 'injured')  return !!p.injury;
    return true;
  });

  const starters  = roster?.players.filter(p => p.isStarter).length ?? 0;
  const bench     = roster?.players.filter(p => !p.isStarter).length ?? 0;
  const injured   = roster?.players.filter(p => !!p.injury).length ?? 0;

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="My Roster" />

        <ScrollView contentContainerStyle={styles.scroll}>
          {!hasLeague ? (
            <EmptyState
              emoji="🏟️"
              title="No league connected"
              body="Connect your Sleeper league to see your real roster with start/sit AI takes."
              ctaLabel="Connect Sleeper"
              onCta={() => router.push('/settings/connect-sleeper')}
            />
          ) : loading ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {[0,1,2,3,4].map((i) => <SkeletonRow key={i} />)}
            </View>
          ) : error || !roster ? (
            <EmptyState
              emoji="😬"
              title="Couldn't load roster"
              body={error ?? 'Something went sideways. Try again in a sec.'}
            />
          ) : (
            <>
              <Animated.View style={heroStyle}>
                <Text style={styles.title}>{roster.teamName.toUpperCase()}</Text>
                <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                  {roster.leagueName} · {roster.record.wins}-{roster.record.losses}
                  {roster.record.ties ? `-${roster.record.ties}` : ''}
                </Text>
              </Animated.View>

              {/* Summary pills */}
              <View style={styles.summaryRow}>
                <SummaryPill label="STARTERS" count={starters} color={colors.green} />
                <SummaryPill label="BENCH"    count={bench}    color={colors.textSecondary} />
                <SummaryPill label="INJURED"  count={injured}  color={colors.coral} />
              </View>

              {/* Filter tabs */}
              <View style={styles.filterRow}>
                {(['all', 'starters', 'bench', 'injured'] as Filter[]).map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    activeOpacity={0.7}
                    style={[styles.filterTab, filter === f && styles.filterTabActive]}
                  >
                    <Text
                      variant="labelSmall"
                      style={{ color: filter === f ? colors.textPrimary : colors.textTertiary, letterSpacing: 0.6 }}
                    >
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Players */}
              <View style={{ gap: spacing.sm }}>
                {visiblePlayers.map((p, i) => (
                  <PlayerRow key={p.id} player={p} index={i} />
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

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.summaryPill, { borderColor: `${color}40`, backgroundColor: `${color}10` }]}>
      <Text variant="h3" style={{ color }}>{count}</Text>
      <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
}

function PlayerRow({ player, index }: { player: RosterPlayer; index: number }) {
  const sport = useUserStore((s) => s.currentSport);
  const [expanded, setExpanded] = useState(false);
  const [aiTake, setAiTake]     = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskAI = useCallback(() => {
    if (aiTake) { setExpanded((v) => !v); return; }
    setExpanded(true);
    setAiLoading(true);
    const verb = player.isStarter ? 'START' : 'SIT/PICKUP';
    const prompt = `${player.name} (${player.position}, ${player.team})${player.injury ? ` — currently ${player.injury.status}` : ''}. Should I ${verb} him this week? Quick verdict + one-line reasoning.`;
    gemini.playerAnalysis(player.name, player.position, player.team, 'NFL')
      .then(setAiTake)
      .catch(() => setAiTake('AI take unavailable.'))
      .finally(() => setAiLoading(false));
  }, [aiTake, player]);

  return (
    <View style={[playerStyles.card, player.injury && playerStyles.cardInjured]}>
      <TouchableOpacity onPress={handleAskAI} activeOpacity={0.85} style={playerStyles.row}>
        <PlayerAvatar sport={sport} id={player.id} name={player.name} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="labelSmall" color={colors.textTertiary}>{player.position}</Text>
            <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={{ flex: 1 }}>{player.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <TeamLogo sport={sport} team={player.team} size={14} />
            <Text variant="caption" color={colors.textTertiary}>
              {player.team}
              {player.isStarter ? ' · Starter' : ' · Bench'}
              {player.injury ? ` · ${player.injury.status}` : ''}
            </Text>
          </View>
        </View>
        {player.injury && <View style={[playerStyles.dot, { backgroundColor: colors.coral }]} />}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={playerStyles.aiBox}>
          {aiLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={colors.green} />
              <Text variant="bodySmall" color={colors.textTertiary}>Thinking…</Text>
            </View>
          ) : (
            <Text variant="bodySmall" color={colors.textSecondary}>{aiTake}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
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
  scroll: {
    padding: spacing.base,
  },
  title: {
    fontSize:       36,
    fontWeight:     '800',
    color:          colors.textPrimary,
    letterSpacing:  -0.5,
    lineHeight:     40,
    marginTop:      spacing.md,
    marginBottom:   spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.lg,
    lineHeight:   22,
  },
  emptyState: {
    paddingTop: spacing['3xl'],
  },
  loadingBox: {
    paddingTop:  spacing['3xl'],
    alignItems:  'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  summaryPill: {
    flex:             1,
    alignItems:       'center',
    paddingVertical:  spacing.sm,
    borderRadius:     radius.lg,
    borderWidth:      1,
  },
  filterRow: {
    flexDirection: 'row',
    gap:           spacing.xs,
    marginBottom:  spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  filterTabActive: {
    backgroundColor: `${colors.green}18`,
    borderColor:     `${colors.green}60`,
  },
});

const playerStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    overflow:        'hidden',
  },
  cardInjured: {
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
  },
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    padding:          spacing.base,
  },
  posTag: {
    width:           36,
    paddingVertical: 4,
    borderRadius:    radius.sm,
    backgroundColor: colors.background,
    alignItems:      'center',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },
  aiBox: {
    paddingHorizontal: spacing.base,
    paddingBottom:     spacing.base,
    paddingTop:        spacing.xs,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
  },
});
