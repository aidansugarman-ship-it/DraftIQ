import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPORTS, type SportId } from '@constants/sports';

/**
 * Subtle sport-themed gradient backdrop. Place inside the root <View> of any
 * sport-aware page — sits behind everything else, very low opacity so content stays readable.
 */
export function SportTint({ sport, intensity = 'soft' }: { sport: SportId; intensity?: 'soft' | 'bold' }) {
  const def = SPORTS[sport];
  // Stronger top alpha so each sport's color genuinely tints the screen.
  const topAlpha = intensity === 'bold' ? '90' : '60';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient
        colors={[`${def.primaryColor}${topAlpha}`, `${def.primaryColor}10`, 'transparent']}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 380,
  },
  gradient: {
    flex: 1,
  },
});
