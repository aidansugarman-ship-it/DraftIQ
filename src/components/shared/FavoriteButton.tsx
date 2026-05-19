import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@constants/colors';
import { useFavoritesStore, type FavoritePlayer } from '@store/useFavoritesStore';

/**
 * A persistent heart button. Tap = toggle favorite. Survives app restart.
 */
export function FavoriteButton({
  player,
  size = 22,
}: {
  player: Omit<FavoritePlayer, 'addedAt'>;
  size?: number;
}) {
  const isFavorite = useFavoritesStore(s => s.isFavorite(player.id));
  const toggle     = useFavoritesStore(s => s.toggle);

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggle(player);
      }}
      hitSlop={8}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? colors.coral : colors.textTertiary}
      />
    </TouchableOpacity>
  );
}
