import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useYahooAuth, isYahooConnected } from '@services/yahooAuth';
import { useYahooStore } from '@store/useYahooStore';

/**
 * App-launch Yahoo gate — shown to ANY signed-in user who hasn't connected
 * Yahoo yet (including pre-existing accounts). Strongly suggested, NOT
 * mandatory: an "I don't use Yahoo" bypass lets them through, and once tapped
 * the gate never shows again.
 */
const PERKS = [
  { icon: 'people',        text: 'Your real roster, every sport — auto-synced' },
  { icon: 'flash',         text: 'One-tap Lineup Optimizer built on YOUR team' },
  { icon: 'swap-horizontal', text: 'Trade Finder that scans your actual league' },
  { icon: 'clipboard',     text: 'GM Score + roster grades that mean something' },
] as const;

export default function ConnectGateScreen() {
  const { isReady, promptAsync } = useYahooAuth();
  const [linking, setLinking] = useState(false);
  const [error, setError]     = useState('');

  // If they're somehow already connected, don't block them.
  useEffect(() => {
    isYahooConnected().then((isOn) => {
      if (isOn) {
        useYahooStore.getState().autoConnect();
        router.replace('/(tabs)');
      }
    });
  }, []);

  async function connect() {
    setError('');
    setLinking(true);
    try {
      await promptAsync();
      setTimeout(async () => {
        const isOn = await isYahooConnected();
        setLinking(false);
        if (isOn) {
          useYahooStore.getState().autoConnect();
          router.replace('/(tabs)');
        } else {
          setError("Sign-in didn't complete. Give it another shot.");
        }
      }, 700);
    } catch (e: any) {
      setLinking(false);
      setError(e?.message ?? 'Sign-in failed. Try again.');
    }
  }

  function bypass() {
    useYahooStore.getState().dismissPrompt();
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.kicker}>GET THE MOST OUT OF DRAFTIQ</Text>
          <Text style={styles.title}>LINK YOUR{'\n'}YAHOO LEAGUE.</Text>
          <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
            DraftIQ is built to run on YOUR real teams. Connect Yahoo and the whole
            app gets personal — across NFL, NBA, MLB & NHL.
          </Text>

          <View style={styles.perks}>
            {PERKS.map((p) => (
              <View key={p.text} style={styles.perkRow}>
                <View style={styles.perkIcon}>
                  <Ionicons name={p.icon} size={16} color={colors.green} />
                </View>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1 }}>
                  {p.text}
                </Text>
              </View>
            ))}
          </View>

          {error ? (
            <View style={styles.errBox}>
              <Text variant="bodySmall" style={{ color: colors.coral }}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.hintBox}>
            <Ionicons name="lock-closed" size={13} color={colors.textTertiary} />
            <Text variant="caption" color={colors.textTertiary} style={{ flex: 1, lineHeight: 17 }}>
              Secure Yahoo login — your password never touches DraftIQ. We only read
              your league data, never change it.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            label={linking ? 'Opening Yahoo…' : 'Connect Yahoo'}
            variant="primary"
            disabled={!isReady || linking}
            onPress={connect}
          />
          {linking && (
            <ActivityIndicator size="small" color={colors.green} style={{ marginTop: spacing.sm }} />
          )}
          <TouchableOpacity style={styles.bypass} onPress={bypass} activeOpacity={0.7}>
            <Text variant="bodySmall" color={colors.textTertiary}>
              I don't use Yahoo — continue without it
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.xl,
    paddingBottom:     spacing.lg,
  },
  kicker: {
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 1.2,
    color:         colors.green,
    marginBottom:  spacing.sm,
  },
  title: {
    ...typography.h1,
    fontSize:      40,
    lineHeight:    42,
    color:         colors.textPrimary,
    marginBottom:  spacing.md,
  },
  subtitle: { lineHeight: 23, marginBottom: spacing.xl },
  perks: { gap: spacing.md },
  perkRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  perkIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: `${colors.green}14`,
    borderWidth: 1, borderColor: `${colors.green}30`,
    alignItems: 'center', justifyContent: 'center',
  },
  errBox: {
    padding:         spacing.sm,
    backgroundColor: `${colors.coral}10`,
    borderRadius:    radius.sm,
    borderWidth:     1,
    borderColor:     `${colors.coral}40`,
    marginTop:       spacing.lg,
  },
  hintBox: {
    flexDirection:   'row',
    gap:             spacing.sm,
    marginTop:       spacing.lg,
    padding:         spacing.base,
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
  },
  footer: {
    paddingHorizontal: spacing.base,
    paddingTop:        spacing.md,
  },
  bypass: {
    alignItems:      'center',
    paddingVertical: spacing.md,
    marginTop:       spacing.xs,
  },
});
