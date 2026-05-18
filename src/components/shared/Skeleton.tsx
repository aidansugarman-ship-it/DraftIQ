import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@constants/colors';
import { radius } from '@constants/spacing';

interface SkeletonProps {
  width?:  number | `${number}%`;
  height?: number;
  style?:  ViewStyle;
  rounded?: keyof typeof radius;
}

/** Shimmer placeholder for loading states. */
export function Skeleton({ width = '100%', height = 14, style, rounded = 'xs' }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius[rounded] },
        animStyle,
        style,
      ]}
    />
  );
}

/** Convenience: a card-shaped skeleton row used in lists. */
export function SkeletonRow({ height = 64 }: { height?: number }) {
  return (
    <View style={styles.rowWrap}>
      <Skeleton width={40} height={40} rounded="md" />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={52} height={22} rounded="full" />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  rowWrap: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              12,
    paddingVertical:  12,
    paddingHorizontal: 4,
  },
});
