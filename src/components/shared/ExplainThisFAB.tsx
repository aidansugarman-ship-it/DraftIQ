import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { gemini } from '@services/gemini';
import { useUserStore } from '@store/useUserStore';

/**
 * Floating "Explain this screen" button. Drop it on any complex screen.
 * Tap → AI explains, in plain English, what the user is looking at and
 * what they can do with it — tailored to the sport + beginner level.
 *
 *   <ExplainThisFAB
 *     screenName="Trade Finder"
 *     context="A screen that scans your league and proposes trades..."
 *   />
 */
export function ExplainThisFAB({ screenName, context }: { screenName: string; context: string }) {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);

  const sport: SportId = useUserStore(s => s.currentSport) ?? 'nfl';
  const sportLabel     = SPORTS[sport].shortLabel;
  const cacheKey       = `${sport}:${screenName}`;

  function explain() {
    setOpen(true);
    if (memo[cacheKey]) { setText(memo[cacheKey]); return; }
    if (loading) return;
    setLoading(true);
    const prompt = `I'm a beginner looking at the "${screenName}" screen in a ${sportLabel} fantasy app. Here's what it does: ${context}

In plain, friendly English explain to me: what am I looking at, and what should I actually DO here? 3-5 short sentences. No jargon without explaining it. Encouraging tone — assume I'm new and a little overwhelmed.`;
    gemini.beginnerExplainer(prompt, sportLabel)
      .then((res) => { const safe = res || 'Tap again in a sec.'; memo[cacheKey] = safe; setText(safe); })
      .catch((e) => setText(`Couldn't load: ${e?.message ?? 'unknown error'}`))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={explain} activeOpacity={0.85}>
        <Ionicons name="help" size={20} color="#000" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Animated.View entering={FadeIn.duration(250)} style={styles.sheet}>
            <View style={styles.head}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="sparkles" size={15} color={colors.green} />
                <Text variant="bodyMedium" color={colors.textPrimary} numberOfLines={1}>
                  What is "{screenName}"?
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {loading ? (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                  <ActivityIndicator size="small" color={colors.green} />
                  <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 8 }}>
                    Breaking it down…
                  </Text>
                </View>
              ) : (
                <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 23 }}>
                  {text}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.gotIt} onPress={() => setOpen(false)} activeOpacity={0.8}>
              <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800' }}>Got it</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

// Module-level memo so re-opening a screen's explainer is instant.
const memo: Record<string, string> = {};

const styles = StyleSheet.create({
  fab: {
    position:        'absolute',
    bottom:          110,
    right:           spacing.base,
    width:           48,
    height:          48,
    borderRadius:    24,
    backgroundColor: colors.green,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOpacity:   0.3,
    shadowRadius:    8,
    shadowOffset:    { width: 0, height: 3 },
    elevation:       6,
    zIndex:          50,
  },
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent:  'center',
    padding:         spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.lg,
  },
  head: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
    gap:            spacing.sm,
  },
  gotIt: {
    backgroundColor: colors.green,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
    marginTop:       spacing.md,
  },
});
