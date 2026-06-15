import { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { radius, spacing } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';

/**
 * Image-share button. Renders an off-screen branded card, captures it to a
 * PNG, and shares the actual image (true screenshot virality). Falls back to
 * text share if capture or the share sheet isn't available.
 */
export function ShareableCard({
  headline,
  detail,
  sport,
  label = 'SHARE CARD',
}: {
  headline: string;
  detail?:  string;
  sport:    SportId;
  label?:   string;
}) {
  const shotRef = useRef<ViewShot>(null);
  const [busy, setBusy] = useState(false);
  const def = SPORTS[sport];

  async function onShare() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBusy(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      const uri = await shotRef.current?.capture?.();
      if (uri && canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your DraftIQ take' });
      } else {
        // Fallback to text
        await Share.share({ message: `🔥 ${headline}${detail ? `\n${detail}` : ''}\n\n— DraftIQ · ${def.shortLabel}` });
      }
    } catch {
      await Share.share({ message: `🔥 ${headline}\n\n— DraftIQ · ${def.shortLabel}` }).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Off-screen capture target — positioned far off-canvas so it never shows. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
          <View style={[styles.card, { borderColor: def.primaryColor }]}>
            <LinearGradient
              colors={[`${def.primaryColor}55`, '#0D0D0F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.cardHead}>
              <Text style={styles.cardEmoji}>{def.emoji}</Text>
              <Text style={styles.cardSport}>{def.shortLabel} TAKE</Text>
            </View>
            <Text style={styles.cardHeadline}>"{headline}"</Text>
            {!!detail && <Text style={styles.cardDetail}>{detail}</Text>}
            <View style={styles.cardFooter}>
              <Text style={styles.cardBrand}>DraftIQ</Text>
              <Text style={styles.cardTag}>the AI fantasy advisor that calls it</Text>
            </View>
          </View>
        </ViewShot>
      </View>

      <TouchableOpacity onPress={onShare} disabled={busy} style={styles.btn} activeOpacity={0.8}>
        <Ionicons name="image" size={14} color={colors.green} />
        <Text variant="labelSmall" style={{ color: colors.green, letterSpacing: 0.6 }}>{busy ? '…' : label}</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -9999, top: -9999 },
  card: {
    width:        360,
    padding:      28,
    borderRadius: 24,
    borderWidth:  2,
    backgroundColor: '#0D0D0F',
    overflow:     'hidden',
    gap:          16,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardEmoji: { fontSize: 28 },
  cardSport: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 2, opacity: 0.85 },
  cardHeadline: { fontSize: 30, fontWeight: '900', color: '#fff', lineHeight: 36, letterSpacing: -0.5 },
  cardDetail: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 21 },
  cardFooter: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  cardBrand: { fontSize: 20, fontWeight: '900', color: colors.green, letterSpacing: -0.5 },
  cardTag:   { fontSize: 11, color: 'rgba(255,255,255,0.5)', flex: 1 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999,
    backgroundColor: `${colors.green}14`, borderWidth: 1, borderColor: `${colors.green}40`,
    alignSelf: 'flex-start',
  },
});
