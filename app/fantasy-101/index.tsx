import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useAchievementsStore } from '@store/useAchievementsStore';

const { width: SCREEN_W } = Dimensions.get('window');

const CARDS = [
  {
    emoji: '🎮',
    title: 'WHAT IS FANTASY?',
    body:  "You build a team of real pro athletes. Their real-life stats become your team's points each week. You play head-to-head against other people in your league. The team with the most points wins. That's it.",
  },
  {
    emoji: '📊',
    title: 'HOW SCORING WORKS',
    body:  "Each sport has its own scoring system, but the idea is simple: good real-life stats = fantasy points. A TD pass = X points. A home run = Y. The exact rules live in your league settings — but you don't really need to memorize them, you just need to play your best guys.",
  },
  {
    emoji: '⚡',
    title: 'WHY DRAFTING MATTERS',
    body:  "Before the season, you pick your team in a draft — usually 15-16 players. The better your draft, the better your team starts. But: every season has injuries, breakouts, and busts. Draft well, but expect to make moves all year.",
  },
  {
    emoji: '🔄',
    title: 'WAIVERS = FREE AGENTS',
    body:  "Any player not on someone's roster is on the 'waiver wire' — free to claim. Most leagues run a weekly waiver process where you submit claims. DraftIQ's Add/Drop tells you who to claim and who to drop, personalized to YOUR roster.",
  },
  {
    emoji: '🤝',
    title: 'TRADES',
    body:  "You can swap players with other managers. Good trades address roster holes — yours and theirs. DraftIQ's Trade Finder scans your league and proposes deals that actually help you. Don't trade out of boredom — trade with a plan.",
  },
];

export default function Fantasy101Screen() {
  const [step, setStep] = useState(0);
  const unlock = useAchievementsStore(s => s.unlock);
  const last   = step === CARDS.length - 1;

  function advance() {
    if (last) {
      unlock('fantasy_101');
      router.back();
      return;
    }
    setStep(s => s + 1);
  }

  const current = CARDS[step];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.dotRow}>
            {CARDS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
            ))}
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Animated.View
            key={step}
            entering={SlideInRight.duration(280)}
            exiting={SlideOutLeft.duration(180)}
            style={styles.card}
          >
            <Animated.Text entering={FadeIn.delay(80)} style={styles.emoji}>{current.emoji}</Animated.Text>
            <Sticker variant="lockedIn" label={`${step + 1} / ${CARDS.length}`} />
            <Text style={styles.title}>{current.title}</Text>
            <Text variant="body" color={colors.textSecondary} style={styles.body}>
              {current.body}
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text variant="bodySmall" color={colors.textSecondary}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={advance} style={styles.nextBtn} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{last ? "I'M READY" : 'NEXT'}</Text>
            <Ionicons name={last ? 'rocket' : 'arrow-forward'} size={16} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
  },
  dotRow: {
    flexDirection: 'row',
    gap:           6,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 4,
    backgroundColor: `${colors.green}30`,
  },
  dotOn: {
    backgroundColor: colors.green,
    width:           22,
  },
  scroll: {
    padding:       spacing.lg,
    paddingTop:    spacing.xl,
    flexGrow:      1,
  },
  card: {
    alignItems:    'center',
    gap:           spacing.md,
  },
  emoji: { fontSize: 96, lineHeight: 110, marginBottom: spacing.sm },
  title: {
    fontSize:      36,
    fontWeight:    '900',
    color:         colors.textPrimary,
    letterSpacing: -1,
    textAlign:     'center',
    lineHeight:    40,
  },
  body: {
    textAlign:  'center',
    lineHeight: 23,
    paddingHorizontal: spacing.md,
    fontSize:   17,
  },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        spacing.lg,
    gap:            spacing.sm,
  },
  backBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
  },
  nextBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.md,
    borderRadius:    999,
    backgroundColor: colors.green,
  },
  nextBtnText: {
    color:         '#000',
    fontWeight:    '900',
    letterSpacing: 0.6,
    fontSize:      14,
  },
});
