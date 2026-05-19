import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing } from '@constants/spacing';
import { espn } from '@services/espn';
import type { SportId } from '@constants/sports';

/**
 * Stock-ticker-style scrolling headlines from ESPN, per sport.
 * Sits at the top of the home screen, runs silently.
 */
export function NewsTicker({ sport }: { sport: SportId }) {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const translateX = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    espn.news(sport, 8)
      .then(items => {
        if (cancelled) return;
        const lines = items.map(i => i.headline).filter(Boolean).slice(0, 8);
        setHeadlines(lines);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [sport]);

  // Marquee scroll animation
  useEffect(() => {
    if (headlines.length === 0) return;
    cancelAnimation(translateX);
    translateX.value = 0;
    // Each headline ~6s to scroll. Adjust based on total content.
    const duration = headlines.length * 6000;
    translateX.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-1000 * (headlines.length / 2), { duration, easing: Easing.linear }),
      ),
      -1,
    );
  }, [headlines]);

  const tickerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (headlines.length === 0) return null;

  // Duplicate the headlines so the loop appears seamless
  const loop = [...headlines, ...headlines];

  return (
    <View style={styles.wrap}>
      <View style={styles.liveBadge}>
        <View style={styles.dot} />
        <Text variant="labelSmall" style={{ color: colors.green, fontSize: 9, letterSpacing: 0.8 }}>
          LIVE
        </Text>
      </View>
      <View style={styles.tickerMask}>
        <Animated.View style={[styles.tickerInner, tickerStyle]}>
          {loop.map((h, i) => (
            <View key={`${h}-${i}`} style={styles.item}>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1} style={styles.itemText}>
                {h}
              </Text>
              <Text variant="caption" color={colors.textTertiary} style={styles.dotSep}>•</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection:    'row',
    alignItems:       'center',
    backgroundColor:  colors.surface,
    borderRadius:     999,
    paddingHorizontal: spacing.sm,
    paddingVertical:  6,
    borderWidth:      1,
    borderColor:      colors.border,
    marginBottom:     spacing.sm,
    overflow:         'hidden',
  },
  liveBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    paddingRight:   8,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    marginRight:    8,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green,
  },
  tickerMask: {
    flex:     1,
    overflow: 'hidden',
  },
  tickerInner: {
    flexDirection: 'row',
  },
  item: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  itemText: {
    maxWidth: 280,
  },
  dotSep: {
    marginHorizontal: 8,
  },
});
