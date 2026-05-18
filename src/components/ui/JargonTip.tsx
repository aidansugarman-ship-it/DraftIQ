import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useUserStore } from '@store/useUserStore';

/**
 * Inline fantasy-jargon explanation. Renders the term as-is, but adds a small
 * info icon next to it for BEGINNER-mode users. Tapping the icon shows a definition.
 *
 * For EXPERIENCED users the icon is hidden — they don't need it.
 */
interface JargonTipProps {
  term:       string;
  definition: string;
  /** Optional inline rendering of the term (defaults to the term itself in body text). */
  children?:  React.ReactNode;
}

export function JargonTip({ term, definition, children }: JargonTipProps) {
  const experience = useUserStore((s) => s.user?.experienceLevel);
  const [open, setOpen] = useState(false);

  // For experienced users, just render the term — no icon, no overhead.
  if (experience === 'experienced') {
    return <>{children ?? <Text variant="bodySmall" color={colors.textSecondary}>{term}</Text>}</>;
  }

  return (
    <>
      <View style={styles.inline}>
        {children ?? <Text variant="bodySmall" color={colors.textSecondary}>{term}</Text>}
        <TouchableOpacity onPress={() => setOpen(true)} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="information-circle-outline" size={14} color={colors.green} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text variant="bodyMedium" color={colors.textPrimary}>{term}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <Text variant="body" color={colors.textSecondary} style={styles.def}>
              {definition}
            </Text>
            <Text variant="caption" color={colors.textTertiary} style={styles.foot}>
              💡 You're seeing definitions because you set yourself as new to fantasy. Change anytime in Settings.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  iconBtn: {
    padding: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         spacing.lg,
  },
  sheet: {
    width:           '100%',
    maxWidth:        420,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  sheetHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  def: {
    lineHeight:   22,
    marginBottom: spacing.lg,
  },
  foot: {
    fontStyle:  'italic',
    lineHeight: 18,
  },
});

// ── Common fantasy terms — feel free to extend ────────────────────────────────
export const JARGON = {
  ADP: 'Average Draft Position. The typical pick number where a player gets selected across drafts. ADP of 12 = usually picked in round 1 of a 12-team league.',
  PPR: 'Points Per Reception. Each catch is worth 1 fantasy point in addition to yardage/TDs. Boosts pass-catching RBs and WRs.',
  HALF_PPR: 'Half-PPR. Each catch is worth 0.5 points. A compromise between standard and full PPR scoring.',
  TARGET_SHARE: 'The percentage of his team\'s passes that go to a specific receiver. Higher = more involved in the offense. 25%+ is elite.',
  USAGE: 'How often a player is on the field and getting opportunities (touches, targets, minutes, at-bats). High usage = high fantasy ceiling.',
  XG: 'Expected Goals (NHL/soccer). A model estimate of how many goals a player "should" be scoring based on shot quality. Useful for buy-low / sell-high.',
  BABIP: 'Batting Average on Balls In Play (MLB). Strips out HR and Ks to show how well a hitter is doing on balls in play. Wild swings often correct toward the mean.',
  DYNASTY: 'A league type where you keep your entire roster year over year. Age and contract status matter a lot more than in seasonal leagues.',
  KEEPER: 'A league where you keep a few players each year, typically 1-5. Less commitment than dynasty.',
  STREAMING: 'Picking up a player just for one week (usually a defense or kicker) based on matchup, then dropping them after.',
  HANDCUFF: 'The backup to your starting RB. You roster him as injury insurance — if your starter goes down, the handcuff becomes startable.',
  SLEEPER: 'A player drafted later than their ceiling — someone you think is undervalued. Not to be confused with the Sleeper app.',
} as const;
