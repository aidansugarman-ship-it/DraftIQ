import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
      <View style={styles.emojiBubble}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
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
          <Text variant="bodyMedium" style={{ color: colors.background, letterSpacing: 0.3 }}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems:    'center',
    padding:       spacing['2xl'],
    gap:           spacing.sm,
  },
  emojiBubble: {
    width:           80,
    height:          80,
    borderRadius:    40,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.sm,
  },
  emoji: {
    fontSize:   36,
    lineHeight: 44,
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
