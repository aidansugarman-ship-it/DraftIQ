import { useState } from 'react';
import { Image, View, StyleSheet, type ImageStyle } from 'react-native';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import type { SportId } from '@constants/sports';

/**
 * Player headshot. NFL pulls from Sleeper's CDN by player_id;
 * other sports pull from ESPN's headshot CDN.
 *
 * Sleeper: https://sleepercdn.com/content/nfl/players/{id}.jpg
 * ESPN:    https://a.espncdn.com/i/headshots/{sport}/players/full/{id}.png
 */
interface PlayerAvatarProps {
  sport: SportId;
  id?:   string;
  name?: string;
  size?: number;
  style?: ImageStyle;
}

const ESPN_SPORT: Record<SportId, string> = {
  nfl: 'nfl',
  nba: 'nba',
  mlb: 'mlb',
  nhl: 'nhl',
};

export function PlayerAvatar({ sport, id, name, size = 36, style }: PlayerAvatarProps) {
  const [errored, setErrored] = useState(false);

  if (!id || errored) {
    const initials = (name ?? '?')
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text variant="labelSmall" color={colors.textSecondary} style={{ fontSize: size / 3 }}>
          {initials}
        </Text>
      </View>
    );
  }

  const url = sport === 'nfl'
    ? `https://sleepercdn.com/content/nfl/players/${id}.jpg`
    : `https://a.espncdn.com/i/headshots/${ESPN_SPORT[sport]}/players/full/${id}.png`;

  return (
    <Image
      source={{ uri: url }}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }, style]}
      onError={() => setErrored(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
