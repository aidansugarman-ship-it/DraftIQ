import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { OnboardingProgress } from '@components/shared/OnboardingProgress';
import { OnboardingFooter } from '@components/shared/OnboardingFooter';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useYahooAuth, isYahooConnected } from '@services/yahooAuth';
import { useYahooStore } from '@store/useYahooStore';

/**
 * Onboarding step 2 — connecting Yahoo is REQUIRED.
 * DraftIQ's whole engine (rosters, trades, waivers, AI takes) runs on the
 * user's real league data, and Yahoo's API is OAuth-only — there's no app
 * without it. The Continue button stays locked until sign-in succeeds.
 */
export default function OnboardingConnectYahoo() {
  const { isReady, promptAsync } = useYahooAuth();
  const [connected, setConnected] = useState(false);
  const [checking, setChecking]   = useState(true);
  const [linking, setLinking]     = useState(false);
  const [error, setError]         = useState('');

  const heroOpacity = useSharedValue(0);
  const heroY       = useSharedValue(16);
  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    heroY.value       = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const heroStyle = useAnimatedStyle(() => ({
    opacity:   heroOpacity.value,
    transform: [{ translateY: heroY.value }],
  }));

  useEffect(() => {
    isYahooConnected().then((isOn) => {
      setConnected(isOn);
      setChecking(false);
      if (isOn) useYahooStore.getState().autoConnect();
    });
  }, []);

  async function connect() {
    setError('');
    setLinking(true);
    try {
      await promptAsync();
      // Token is stored by useYahooAuth once the flow completes — re-check shortly.
      setTimeout(async () => {
        const isOn = await isYahooConnected();
        setConnected(isOn);
        setLinking(false);
        if (isOn) {
          useYahooStore.getState().autoConnect();
        } else {
          setError("Sign-in didn't complete. Give it another shot.");
        }
      }, 700);
    } catch (e: any) {
      setLinking(false);
      setError(e?.message ?? 'Sign-in failed. Try again.');
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={2} totalSteps={6} showBack onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.header, heroStyle]}>
            <Text style={styles.title}>FIRST —{'\n'}LINK YOUR{'\n'}YAHOO.</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              DraftIQ is built around YOUR real teams. Linking Yahoo is required —
              it's how we pull your rosters, waivers and trades across all 4 sports.
            </Text>
          </Animated.View>

          {checking ? (
            <ActivityIndicator size="large" color={colors.green} style={{ marginTop: spacing.xl }} />
          ) : connected ? (
            <View style={styles.connectedCard}>
              <Ionicons name="checkmark-circle" size={28} color={colors.green} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>Yahoo connected</Text>
                <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  Your leagues are linked. Tap Continue.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Button
                label={linking ? 'Opening Yahoo…' : 'Sign in with Yahoo'}
                variant="primary"
                disabled={!isReady || linking}
                onPress={connect}
              />
              {error ? (
                <View style={styles.errBox}>
                  <Text variant="bodySmall" style={{ color: colors.coral }}>{error}</Text>
                </View>
              ) : null}
              <View style={styles.hintBox}>
                <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
                <Text variant="caption" color={colors.textTertiary} style={{ flex: 1, lineHeight: 18 }}>
                  Opens a secure Yahoo login. Your password never touches DraftIQ — we
                  only read your league data, never change it.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.bypass}
                activeOpacity={0.7}
                onPress={() => {
                  useYahooStore.getState().dismissPrompt();
                  router.push('/(onboarding)/experience');
                }}
              >
                <Text variant="bodySmall" color={colors.textTertiary}>
                  I don't use Yahoo — skip for now
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>

        <OnboardingFooter
          primaryLabel="Continue"
          primaryDisabled={!connected}
          onPrimary={() => router.push('/(onboarding)/experience')}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     120,
  },
  header: {
    marginTop:    spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color:        colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { lineHeight: 22 },
  connectedCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    padding:         spacing.base,
    backgroundColor: `${colors.green}12`,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     `${colors.green}40`,
  },
  errBox: {
    padding:         spacing.sm,
    backgroundColor: `${colors.coral}10`,
    borderRadius:    radius.sm,
    borderWidth:     1,
    borderColor:     `${colors.coral}40`,
    marginTop:       spacing.md,
  },
  hintBox: {
    flexDirection:   'row',
    gap:             spacing.sm,
    marginTop:       spacing.lg,
    padding:         spacing.base,
    backgroundColor: colors.surface,
    borderRadius:    radius.md,
  },
  bypass: {
    alignItems:      'center',
    paddingVertical: spacing.md,
    marginTop:       spacing.md,
  },
});
