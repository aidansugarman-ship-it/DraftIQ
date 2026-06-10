import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { gemini } from '@services/gemini';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { useUserStore } from '@store/useUserStore';

/**
 * "I'm too new to this 🤷" — drop it under any question.
 * Opens a modal with a plain-English, sport-tailored explanation from Gemini.
 *
 * `topic` should describe what needs explaining, e.g.
 *   "team building styles: Win Now vs Future Stars vs Balanced"
 *   "fantasy scoring types"
 */
export function TooNewButton({ topic, sport }: { topic: string; sport?: SportId }) {
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);

  // Sport from onboarding flow first, then global, then NFL.
  const onboardingSport = useOnboardingStore(s => s.primarySport);
  const globalSport     = useUserStore(s => s.currentSport);
  const resolved        = sport ?? onboardingSport ?? globalSport ?? 'nfl';
  const sportLabel      = SPORTS[resolved].shortLabel;

  function explain() {
    setOpen(true);
    if (text || loading) return;
    setLoading(true);
    const prompt = `I'm brand new to ${sportLabel} fantasy. In plain, friendly language explain: ${topic}.
Keep it short — 2 to 4 sentences or a tiny bullet list. Use ${sportLabel} examples a beginner would get. No jargon without explaining it. Encouraging tone.`;
    gemini.beginnerExplainer(prompt, sportLabel)
      .then((res) => setText(res || "No explanation came back — try again in a sec."))
      .catch((e) => setText(`Couldn't load an explanation: ${e?.message ?? 'unknown error'}`))
      .finally(() => setLoading(false));
  }

  return (
    <>
      <TouchableOpacity style={styles.btn} onPress={explain} activeOpacity={0.7}>
        <Text style={styles.btnEmoji}>🤷</Text>
        <Text variant="caption" style={{ color: colors.textSecondary }}>
          I'm too new to this
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.head}>
              <Text variant="bodyMedium" color={colors.textPrimary}>
                {sportLabel} · Quick explainer
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ paddingBottom: spacing.sm }}>
              {loading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.green} />
                  <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 8 }}>
                    Breaking it down…
                  </Text>
                </View>
              ) : (
                <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>
                  {text}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.gotIt} onPress={() => setOpen(false)} activeOpacity={0.8}>
              <Text variant="bodyMedium" style={{ color: colors.background }}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    gap:               6,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.full,
    backgroundColor:   colors.surface,
    borderWidth:       1,
    borderColor:       colors.border,
  },
  btnEmoji: { fontSize: 14 },
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent:  'center',
    padding:         spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
  },
  head: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  loadingBox: {
    alignItems:      'center',
    paddingVertical: spacing.xl,
  },
  gotIt: {
    backgroundColor: colors.green,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
    marginTop:       spacing.md,
  },
});
