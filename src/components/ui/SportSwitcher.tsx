import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from './Text';
import { SPORTS, type SportId } from '@constants/sports';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useUserStore } from '@store/useUserStore';

interface SportSwitcherProps {
  compact?: boolean;
}

const ORDER: SportId[] = ['nfl', 'nba', 'mlb', 'nhl'];

export function SportSwitcher({ compact = false }: SportSwitcherProps) {
  const currentSport    = useUserStore((s) => s.currentSport);
  const setCurrentSport = useUserStore((s) => s.setCurrentSport);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, compact && styles.rowCompact]}
    >
      {ORDER.map((id) => {
        const sport = SPORTS[id];
        const active = id === currentSport;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => setCurrentSport(id)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              compact && styles.pillCompact,
              active && {
                backgroundColor: sport.primaryColor,
                borderColor:     sport.primaryColor,
              },
            ]}
          >
            <Text style={styles.emoji}>{sport.emoji}</Text>
            <Text
              variant="bodyMedium"
              color={active ? colors.textPrimary : colors.textSecondary}
              style={styles.label}
            >
              {sport.shortLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:   'row',
    gap:             spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowCompact: {
    paddingVertical: 2,
  },
  pill: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:  spacing.xs,
    borderRadius:     radius.full ?? 999,
    backgroundColor:  colors.surfaceElevated,
    borderWidth:      1,
    borderColor:      colors.border,
    gap:              6,
  },
  pillCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical:  4,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    letterSpacing: 0.3,
  },
});
