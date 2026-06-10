import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { PageHeader } from '@components/shared/PageHeader';
import { Sticker } from '@components/shared/Sticker';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useAchievementsStore, ACHIEVEMENTS } from '@store/useAchievementsStore';

export default function AchievementsScreen() {
  const unlocked = useAchievementsStore(s => s.unlocked);
  const unlockedCount = Object.keys(unlocked).length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Achievements" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>BADGES</Text>
          <View style={styles.summary}>
            <Sticker variant="lockedIn" label={`${unlockedCount} / ${ACHIEVEMENTS.length}`} />
            <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1 }}>
              Every move you make unlocks something. Run the optimizer, scan for trades, set custom alerts — they all count.
            </Text>
          </View>

          {ACHIEVEMENTS.map((a, i) => {
            const ts = unlocked[a.id];
            const isUnlocked = !!ts;
            return (
              <Animated.View
                key={a.id}
                entering={FadeInDown.delay(i * 30).duration(280)}
                style={[styles.card, !isUnlocked && styles.cardLocked]}
              >
                <View style={[styles.iconBubble, { backgroundColor: isUnlocked ? `${colors.green}20` : `${colors.textTertiary}15` }]}>
                  <Text style={[styles.emoji, !isUnlocked && { opacity: 0.35 }]}>{a.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color={isUnlocked ? colors.textPrimary : colors.textTertiary} style={{ fontWeight: '700' }}>
                    {isUnlocked ? a.title : '???'}
                  </Text>
                  <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2, lineHeight: 17 }}>
                    {a.desc}
                  </Text>
                  {isUnlocked && (
                    <Text variant="caption" style={{ color: colors.green, marginTop: 4, letterSpacing: 0.4 }}>
                      ✓ Unlocked {new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
              </Animated.View>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  title: {
    fontSize:      34,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    marginTop:     spacing.md,
    marginBottom:  spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    backgroundColor: colors.surface,
    padding:       spacing.base,
    borderRadius:  radius.lg,
    borderWidth:   1,
    borderColor:   colors.border,
    marginBottom:  spacing.lg,
  },
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
  },
  cardLocked: {
    backgroundColor: `${colors.surface}80`,
    borderColor:     `${colors.border}88`,
  },
  iconBubble: {
    width:           48,
    height:          48,
    borderRadius:    24,
    alignItems:      'center',
    justifyContent:  'center',
  },
  emoji: { fontSize: 24, lineHeight: 30 },
});
