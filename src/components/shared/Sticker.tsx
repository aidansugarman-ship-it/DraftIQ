import { View, StyleSheet } from 'react-native';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { radius } from '@constants/spacing';

/**
 * Sticker — small uppercase badge for vibe (HOT, COLD, LOCK, FIRE, etc.)
 * Pure visual personality. Drop it next to a player name or card title.
 */
export type StickerVariant = 'hot' | 'cold' | 'lock' | 'fire' | 'dagger' | 'sleeper' | 'rising' | 'falling' | 'lockedIn' | 'must';

const VARIANTS: Record<StickerVariant, { color: string; emoji: string; label: string }> = {
  hot:      { color: colors.coral,  emoji: '🔥', label: 'ON FIRE' },
  cold:     { color: '#5BB4FF',     emoji: '❄️', label: 'ICE COLD' },
  lock:     { color: colors.gold,   emoji: '🔒', label: 'LOCK' },
  fire:     { color: colors.coral,  emoji: '🔥', label: 'HOT TAKE' },
  dagger:   { color: colors.purple, emoji: '🗡️', label: 'DAGGER' },
  sleeper:  { color: colors.green,  emoji: '💤', label: 'SLEEPER' },
  rising:   { color: colors.green,  emoji: '📈', label: 'RISING' },
  falling:  { color: colors.coral,  emoji: '📉', label: 'FALLING' },
  lockedIn: { color: colors.gold,   emoji: '🎯', label: 'LOCKED IN' },
  must:     { color: colors.coral,  emoji: '🚨', label: 'MUST ADD' },
};

export function Sticker({ variant, label }: { variant: StickerVariant; label?: string }) {
  const def = VARIANTS[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: `${def.color}1A`, borderColor: `${def.color}55` }]}>
      <Text style={styles.emoji}>{def.emoji}</Text>
      <Text style={[styles.label, { color: def.color }]}>{label ?? def.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      radius.sm,
    borderWidth:       1,
    alignSelf:         'flex-start',
  },
  emoji: { fontSize: 10, lineHeight: 14 },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
});
