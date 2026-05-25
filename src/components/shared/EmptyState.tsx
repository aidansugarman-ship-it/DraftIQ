import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ZoomIn, FadeIn } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';

interface EmptyStateProps {
  emoji?:    string;
  title:     string;
  body?:     string;
  ctaLabel?: string;
  onCta?:    () => void;
}

export function EmptyState({ emoji = '✨', title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {/* Soft layered glow behind the emoji — feels like an illustration, not a single icon */}
      <Animated.View entering={ZoomIn.springify().damping(10).mass(0.6)} style={styles.emojiStage}>
        <LinearGradient
          colors={[`${colors.green}26`, `${colors.purple}1A`, 'transparent']}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.glow}
        />
        <View style={styles.outerRing}>
          <View style={styles.innerRing}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
        </View>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(150).duration(280)} style={{ alignItems: 'center', gap: spacing.sm }}>
        <Text variant="h3" color={colors.textPrimary} align="center" style={styles.title}>
          {title}
        </Text>
        {body && (
          <Text variant="body" color={colors.textSecondary} align="center" style={styles.body}>
            {body}
          </Text>
        )}
        {ctaLabel && onCta && (
          <TouchableOpacity style={styles.cta} onPress={onCta} activeOpacity={0.85}>
            <Text variant="bodyMedium" style={{ color: colors.background, letterSpacing: 0.3, fontWeight: '700' }}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems:    'center',
    padding:       spacing['2xl'],
    gap:           spacing.sm,
  },
  emojiStage: {
    width:          160,
    height:         160,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.md,
  },
  glow: {
    position:    'absolute',
    width:       160,
    height:      160,
    borderRadius: 80,
  },
  outerRing: {
    width:           120,
    height:          120,
    borderRadius:    60,
    borderWidth:     1,
    borderColor:     `${colors.green}30`,
    alignItems:      'center',
    justifyContent:  'center',
  },
  innerRing: {
    width:           90,
    height:          90,
    borderRadius:    45,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  emoji: {
    fontSize:   52,
    lineHeight: 60,
  },
  title: {
    marginTop: spacing.xs,
  },
  body: {
    lineHeight:  22,
    maxWidth:    320,
    marginBottom: spacing.md,
  },
  cta: {
    backgroundColor:   colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:      radius.full,
  },
});
