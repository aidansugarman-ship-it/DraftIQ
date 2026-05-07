import {
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { Text } from './Text';
import { colors } from '@constants/colors';
import { radius, spacing } from '@constants/spacing';
import { typography } from '@constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label:      string;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
}

export function Button({
  label,
  variant   = 'primary',
  size      = 'lg',
  loading   = false,
  fullWidth = true,
  leftIcon,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.background : colors.green}
          size="small"
        />
      ) : (
        <View style={styles.inner}>
          {leftIcon && <View style={styles.iconWrap}>{leftIcon}</View>}
          <Text
            style={[
              styles.label,
              styles[`label_${variant}`],
              styles[`labelSize_${size}`],
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },

  // Variants
  primary: {
    backgroundColor: colors.green,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.coral,
  },

  // Sizes
  size_sm: { paddingVertical: spacing.xs,  paddingHorizontal: spacing.md   },
  size_md: { paddingVertical: spacing.sm,  paddingHorizontal: spacing.base },
  size_lg: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl },

  disabled: { opacity: 0.45 },

  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: spacing.sm,
  },

  // Label variants
  label: {
    ...typography.bodyMedium,
    letterSpacing: 0.3,
  },
  label_primary:   { color: colors.background },
  label_secondary: { color: colors.textPrimary },
  label_ghost:     { color: colors.textPrimary },
  label_danger:    { color: colors.coral },

  // Label sizes
  labelSize_sm: { ...typography.bodySmallMedium },
  labelSize_md: { ...typography.bodyMedium },
  labelSize_lg: { ...typography.bodyMedium, fontSize: 16 },
});
