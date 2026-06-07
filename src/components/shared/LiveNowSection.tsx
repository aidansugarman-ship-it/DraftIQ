import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { espn, type EspnGame } from '@services/espn';
import { useRefreshSignal } from '@store/useRefreshSignal';

/**
 * LIVE NOW — sport hub breathes when games are actually being played.
 * Only renders when at least one game is in state "in". Polls every 60s
 * while mounted so scores update.
 */
export function LiveNowSection({ sport }: { sport: SportId }) {
  const sportDef = SPORTS[sport];
  const [games, setGames] = useState<EspnGame[]>([]);
  const refreshTick = useRefreshSignal(s => s.tick);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const all = await espn.scoreboard(sport);
        if (cancelled) return;
        setGames(all.filter(g => g.status?.type?.state === 'in'));
      } catch { /* no-op */ }
    }
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [sport, refreshTick]);

  // Pulsing red dot animation
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false,
    );
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  if (games.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.wrap}>
      <View style={styles.headRow}>
        <Animated.View style={[styles.liveDot, dotStyle]} />
        <Text style={styles.headLabel}>LIVE NOW</Text>
        <Text variant="caption" color={colors.textTertiary}>
          {games.length} {sportDef.shortLabel} game{games.length === 1 ? '' : 's'} in progress
        </Text>
      </View>
      {games.slice(0, 4).map(g => {
        const home = g.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
        const away = g.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
        return (
          <View key={g.id} style={styles.gameRow}>
            <Text variant="bodySmallMedium" color={colors.textPrimary} style={{ flex: 1 }} numberOfLines={1}>
              {away?.team?.abbreviation ?? '—'} @ {home?.team?.abbreviation ?? '—'}
            </Text>
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '800' }}>
              {away?.score ?? '0'} - {home?.score ?? '0'}
            </Text>
            <Text variant="caption" color={colors.coral} style={{ minWidth: 50, textAlign: 'right' }}>
              {g.status?.displayClock ?? 'LIVE'}
            </Text>
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: `${colors.coral}10`,
    borderRadius:    radius.lg,
    borderWidth:     1.5,
    borderColor:     `${colors.coral}66`,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.sm,
  },
  liveDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: colors.coral,
  },
  headLabel: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.coral,
    letterSpacing: 1.4,
  },
  gameRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.coral}22`,
  },
});
