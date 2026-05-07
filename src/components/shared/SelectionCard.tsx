import { TouchableOpacity, View, StyleSheet, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@constants/colors';
import { radius, spacing } from '@constants/spacing';

interface SelectionCardProps {
  selected:    boolean;
  onPress:     () => void;
  children:    React.ReactNode;
  accentColor?: string;
  style?:      ViewStyle;
  disabled?:   boolean;
}

export function SelectionCard({
  selected,
  onPress,
  children,
  accentColor = colors.green,
  style,
  disabled = false,
}: SelectionCardProps) {
  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[
        styles.card,
        selected && {
          borderColor:     accentColor,
          backgroundColor: `${accentColor}10`,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      {children}
      {selected && (
        <View style={[styles.checkmark, { backgroundColor: accentColor }]}>
          <View style={styles.checkInner} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth:     1.5,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
  },
  disabled: { opacity: 0.5 },
  checkmark: {
    position: 'absolute',
    top:      spacing.md,
    right:    spacing.md,
    width:    22,
    height:   22,
    borderRadius: 11,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkInner: {
    width:           8,
    height:          4,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor:     colors.background,
    transform:       [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});
