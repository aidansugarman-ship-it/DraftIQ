import { TouchableOpacity, Share, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { radius, spacing } from '@constants/spacing';

/**
 * Consistent, branded share button for AI takes. Formats the take into a
 * clean shareable block with the DraftIQ watermark so screenshots/text
 * shared to group chats carry the brand — the social growth loop.
 */
export function ShareTakeButton({
  headline,
  detail,
  sport,
  compact,
}: {
  headline: string;
  detail?:  string;
  sport?:   string;
  compact?: boolean;
}) {
  function onShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const lines = [
      `🔥 ${headline}`,
      detail ? `\n${detail}` : '',
      `\n— DraftIQ${sport ? ` · ${sport}` : ''}`,
      `The AI fantasy advisor that actually calls it.`,
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  }

  if (compact) {
    return (
      <TouchableOpacity onPress={onShare} hitSlop={8} style={styles.compact}>
        <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onShare} style={styles.btn} activeOpacity={0.8}>
      <Ionicons name="share-social" size={14} color={colors.green} />
      <Text variant="labelSmall" style={{ color: colors.green, letterSpacing: 0.6 }}>SHARE</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: spacing.md,
    paddingVertical:   6,
    borderRadius:      999,
    backgroundColor:   `${colors.green}14`,
    borderWidth:       1,
    borderColor:       `${colors.green}40`,
    alignSelf:         'flex-start',
  },
  compact: {
    padding: 4,
  },
});
