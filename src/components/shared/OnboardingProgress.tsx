import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing } from '@constants/spacing';

interface OnboardingProgressProps {
  step:       number;     // 1-indexed
  totalSteps: number;
  showBack?:  boolean;
}

export function OnboardingProgress({ step, totalSteps, showBack = true }: OnboardingProgressProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {showBack && step > 1 ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text variant="bodyMedium" color={colors.textSecondary}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <Text variant="labelSmall" color={colors.textTertiary} style={styles.label}>
          STEP {step} OF {totalSteps}
        </Text>

        <View style={styles.backBtn} />
      </View>

      <View style={styles.barTrack}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <ProgressSegment key={i} active={i < step} index={i} />
        ))}
      </View>
    </View>
  );
}

function ProgressSegment({ active, index }: { active: boolean; index: number }) {
  const opacity = useSharedValue(active ? 1 : 0.15);

  useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0.15, { duration: 350 });
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.segmentWrap}>
      <Animated.View style={[styles.segmentFill, animStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.lg,
    gap:               spacing.md,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width:  32,
    height: 32,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    letterSpacing: 1,
  },
  barTrack: {
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  segmentWrap: {
    flex:            1,
    height:          3,
    backgroundColor: colors.border,
    borderRadius:    2,
    overflow:        'hidden',
  },
  segmentFill: {
    height:          3,
    backgroundColor: colors.green,
    borderRadius:    2,
  },
});
