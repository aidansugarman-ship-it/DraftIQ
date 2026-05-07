import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import type { TierId } from '@types/subscription';

interface BadgeProps {
  tier: TierId;
  size?: 'sm' | 'md';
}

const TIER_CONFIG: Record<TierId, { label: string; color: string; bg: string }> = {
  rookie:  { label: 'FREE',   color: colors.tierRookie,  bg: 'rgba(107,114,128,0.15)' },
  starter: { label: 'PRO',    color: colors.tierStarter, bg: 'rgba(59,130,246,0.15)'  },
  gm:      { label: 'GM',     color: colors.tierGM,      bg: 'rgba(201,168,76,0.15)'  },
};

export function TierBadge({ tier, size = 'sm' }: BadgeProps) {
  const config = TIER_CONFIG[tier];
  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.bg, borderColor: config.color },
      size === 'md' && styles.badgeMd,
    ]}>
      <Text
        variant={size === 'md' ? 'label' : 'labelSmall'}
        color={config.color}
        style={styles.text}
      >
        {config.label}
      </Text>
    </View>
  );
}

interface LabelBadgeProps {
  label:    string;
  color?:   string;
  bgColor?: string;
}

export function LabelBadge({ label, color = colors.textSecondary, bgColor = colors.surfaceElevated }: LabelBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text variant="labelSmall" color={color}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical:   3,
    borderRadius:      radius.full,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  badgeMd: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
  },
  text: {
    letterSpacing: 0.8,
  },
});
