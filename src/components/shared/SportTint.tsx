import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPORTS, type SportId } from '@constants/sports';

/**
 * Subtle sport-themed gradient backdrop. Place inside the root <View> of any
 * sport-aware page — sits behind everything else, very low opacity so content stays readable.
 */
export function SportTint({ sport, intensity = 'soft' }: { sport: SportId; intensity?: 'soft' | 'bold' }) {
  const def = SPORTS[sport];
  const topAlpha = intensity === 'bold' ? '55' : '30';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient
        colors={[`${def.primaryColor}${topAlpha}`, 'transparent']}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 280,
  },
  gradient: {
    flex: 1,
  },
});
