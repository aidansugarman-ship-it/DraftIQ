import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { gemini } from '@services/gemini';
import { useUserStore } from '@store/useUserStore';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { useGlossaryStore } from '@store/useGlossaryStore';

/**
 * Tap-to-explain fantasy jargon.
 *
 *  - <GlossaryTerm term="PPR" />              → inline, dotted-underline word
 *  - <GlossaryTerm term="ADP">ADP</GlossaryTerm>
 *
 * GlossaryTerm is just an inline <Text> (safe to nest inside other Text).
 * <GlossaryModalHost /> — mounted once at the app root — renders the explainer.
 */

// Module-level cache — `${sport}:${term}` → explanation.
const cache: Record<string, string> = {};

export function GlossaryTerm({ term, children }: { term: string; children?: string }) {
  const show = useGlossaryStore(s => s.show);
  return (
    <Text onPress={() => show(term)} style={styles.term} suppressHighlighting>
      {children ?? term}
    </Text>
  );
}

export function GlossaryModalHost() {
  const term = useGlossaryStore(s => s.term);
  const hide = useGlossaryStore(s => s.hide);

  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);

  const onboardingSport = useOnboardingStore(s => s.primarySport);
  const globalSport     = useUserStore(s => s.currentSport);
  const sport: SportId  = globalSport ?? onboardingSport ?? 'nfl';
  const sportLabel      = SPORTS[sport].shortLabel;

  useEffect(() => {
    if (!term) return;
    const key = `${sport}:${term.toLowerCase()}`;
    if (cache[key]) { setText(cache[key]); setLoading(false); return; }
    setText('');
    setLoading(true);
    const prompt = `In ${sportLabel} fantasy, explain the term "${term}" in plain English for a beginner. 2-3 sentences max. Give a quick concrete example. No extra jargon.`;
    let cancelled = false;
    gemini.chat(prompt, sportLabel)
      .then((res) => { if (cancelled) return; cache[key] = res; setText(res); })
      .catch(() => { if (!cancelled) setText("Couldn't load that one — tap again in a sec."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [term, sport, sportLabel]);

  return (
    <Modal visible={!!term} transparent animationType="fade" onRequestClose={hide}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <Ionicons name="book" size={15} color={colors.green} />
              <Text variant="bodyMedium" color={colors.textPrimary}>{term}</Text>
            </View>
            <TouchableOpacity onPress={hide} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.green} />
              </View>
            ) : (
              <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>
                {text}
              </Text>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.gotIt} onPress={hide} activeOpacity={0.8}>
            <Text variant="bodyMedium" style={{ color: colors.background }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  term: {
    color:               colors.green,
    textDecorationLine:  'underline',
    textDecorationStyle: 'dotted',
  },
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
  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
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
