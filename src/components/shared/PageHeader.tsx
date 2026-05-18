import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';

/**
 * Consistent page header across all screens.
 * Back button on the left, title centered, optional right slot.
 */
interface PageHeaderProps {
  title:    string;
  onBack?:  () => void;
  right?:   React.ReactNode;
  /** Hide the back button (for tab roots). */
  showBack?: boolean;
}

export function PageHeader({ title, onBack, right, showBack = true }: PageHeaderProps) {
  return (
    <View style={styles.row}>
      {showBack ? (
        <TouchableOpacity
          style={styles.btn}
          onPress={onBack ?? (() => router.back())}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.btn} />
      )}

      <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      <View style={styles.btn}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  btn: {
    width:           36,
    height:          36,
    borderRadius:    radius.sm,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  title: {
    flex:       1,
    textAlign:  'center',
    marginHorizontal: spacing.sm,
  },
});
