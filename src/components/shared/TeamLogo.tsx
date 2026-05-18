import { useState } from 'react';
import { Image, View, StyleSheet, type ImageStyle } from 'react-native';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { radius } from '@constants/spacing';
import type { SportId } from '@constants/sports';

/**
 * Renders a team's logo via ESPN's CDN. Falls back to the team abbreviation in a tile if the image fails.
 *
 * URL pattern: https://a.espncdn.com/i/teamlogos/{sport}/500/{abbrev_lowercase}.png
 * Works for NFL, NBA, MLB, NHL.
 */
interface TeamLogoProps {
  sport: SportId;
  team:  string;  // team abbreviation, e.g. "BUF", "LAL"
  size?: number;
  style?: ImageStyle;
}

const SPORT_PATH: Record<SportId, string> = {
  nfl: 'nfl',
  nba: 'nba',
  mlb: 'mlb',
  nhl: 'nhl',
};

export function TeamLogo({ sport, team, size = 28, style }: TeamLogoProps) {
  const [errored, setErrored] = useState(false);
  const abbrev = (team || '').toLowerCase();

  if (!abbrev || errored) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <Text variant="labelSmall" color={colors.textTertiary} style={{ fontSize: Math.max(8, size / 4) }}>
          {team || '—'}
        </Text>
      </View>
    );
  }

  const url = `https://a.espncdn.com/i/teamlogos/${SPORT_PATH[sport]}/500/${abbrev}.png`;
  return (
    <Image
      source={{ uri: url }}
      style={[{ width: size, height: size, borderRadius: radius.xs }, style]}
      onError={() => setErrored(true)}
      resizeMode="contain"
    />
  );
}
