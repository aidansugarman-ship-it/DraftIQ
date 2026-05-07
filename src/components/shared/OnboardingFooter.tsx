import { View, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing } from '@constants/spacing';

interface OnboardingFooterProps {
  primaryLabel:    string;
  onPrimary:       () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?:    () => void;
}

export function OnboardingFooter({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading  = false,
  secondaryLabel,
  onSecondary,
}: OnboardingFooterProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* Fade overlay so scrolled content tucks neatly under the footer */}
      <LinearGradient
        colors={['rgba(13,13,15,0)', colors.background]}
        style={styles.fade}
        pointerEvents="none"
      />
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={styles.content}>
          <Button
            label={primaryLabel}
            variant="primary"
            onPress={onPrimary}
            disabled={primaryDisabled}
            loading={primaryLoading}
          />
          {secondaryLabel && onSecondary && (
            <TouchableOpacity onPress={onSecondary} style={styles.secondary} activeOpacity={0.7}>
              <Text variant="bodyMedium" color={colors.textSecondary}>{secondaryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom:   0,
    left:     0,
    right:    0,
  },
  fade: {
    height:    32,
    width:     '100%',
  },
  safe: {
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.md,
    gap:               spacing.md,
  },
  secondary: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
