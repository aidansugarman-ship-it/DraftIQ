import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';

/**
 * 1-5 star confidence indicator for an AI call.
 * Color shifts based on conviction (high = gold, low = grey).
 */
export function ConfidenceStars({ value, size = 12 }: { value: number; size?: number }) {
  if (!value || value < 1) return null;

  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  const color =
    clamped >= 5 ? colors.gold :
    clamped === 4 ? colors.green :
    clamped === 3 ? colors.blue :
    colors.textTertiary;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= clamped ? 'star' : 'star-outline'}
          size={size}
          color={i <= clamped ? color : colors.border}
        />
      ))}
      <Text variant="labelSmall" style={{ color, fontSize: 10, marginLeft: 4, letterSpacing: 0.5 }}>
        {clamped === 5 ? 'LOCK' : clamped === 4 ? 'STRONG' : clamped === 3 ? 'SOLID' : clamped === 2 ? 'LEAN' : 'GUT'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
