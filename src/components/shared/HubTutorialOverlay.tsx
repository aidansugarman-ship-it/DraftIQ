import { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useFirstRunStore } from '@store/useFirstRunStore';

const STEPS = [
  {
    emoji: '⚡',
    title: 'This is your hub',
    body:  "Everything that matters for your team — collapsed into clear chapters. Tap any chapter header to fold it away.",
  },
  {
    emoji: '🏆',
    title: 'Your DraftIQ Score',
    body:  'One number out of 100 that tracks how sharp of a GM you\'re being. Tap the ⓘ on the card to see the formula.',
  },
  {
    emoji: '🏟',
    title: 'Five things to explore first',
    body:  '• Pulse — daily hot/cold takes\n• Lineup Optimizer — one-tap best lineup\n• Trade Finder — AI scans your league\n• Power Rankings — where every team stands\n• Alerts — get pinged on any player',
  },
  {
    emoji: '⚙️',
    title: 'Settings & profile',
    body:  'Top-right corner. That\'s where your Yahoo connection, notification preferences and account stuff live.',
  },
];

export function HubTutorialOverlay() {
  const tutorialDone    = useFirstRunStore(s => s.tutorialDone);
  const hydrated        = useFirstRunStore(s => s.hydrated);
  const markTutorialDone = useFirstRunStore(s => s.markTutorialDone);
  const [step, setStep] = useState(0);

  if (!hydrated || tutorialDone) return null;

  const current = STEPS[step];
  const last    = step === STEPS.length - 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={markTutorialDone}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.sheet}>
          <View style={styles.dotRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
            ))}
          </View>
          <Text style={styles.bigEmoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            <Text variant="body" color={colors.textSecondary} style={styles.body}>
              {current.body}
            </Text>
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={markTutorialDone} hitSlop={8}>
              <Text variant="bodySmall" color={colors.textTertiary}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextBtn}
              activeOpacity={0.85}
              onPress={last ? markTutorialDone : () => setStep(s => s + 1)}
            >
              <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800', letterSpacing: 0.4 }}>
                {last ? "LET'S GO" : 'NEXT'}
              </Text>
              <Ionicons name={last ? 'rocket' : 'arrow-forward'} size={16} color="#000" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent:  'center',
    padding:         spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
    gap:             spacing.md,
    alignItems:      'center',
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
    width:           20,
  },
  bigEmoji: {
    fontSize:   56,
    lineHeight: 64,
  },
  title: {
    fontSize:      24,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    textAlign:     'center',
  },
  body: {
    lineHeight: 22,
    textAlign:  'center',
  },
  btnRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    width:          '100%',
    marginTop:      spacing.sm,
  },
  nextBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderRadius:    radius.md,
    backgroundColor: colors.green,
  },
});
