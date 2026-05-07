import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { OnboardingProgress } from '@components/shared/OnboardingProgress';
import { OnboardingFooter } from '@components/shared/OnboardingFooter';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useOnboardingStore } from '@store/useOnboardingStore';
import { useUserStore } from '@store/useUserStore';
import { registerForPushNotifications } from '@lib/notifications';

interface PreviewProps {
  emoji:    string;
  title:    string;
  body:     string;
  time:     string;
  accent:   string;
  delay:    number;
}

function NotificationPreview({ emoji, title, body, time, accent, delay }: PreviewProps) {
  const opacity = useSharedValue(0);
  const ty      = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    ty.value      = withDelay(delay, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <Animated.View style={[previewStyles.card, animStyle]}>
      <View style={[previewStyles.iconWrap, { backgroundColor: `${accent}1F` }]}>
        <Text style={previewStyles.icon}>{emoji}</Text>
      </View>
      <View style={previewStyles.body}>
        <View style={previewStyles.headerRow}>
          <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>
            DraftIQ
          </Text>
          <Text variant="caption" color={colors.textTertiary}>{time}</Text>
        </View>
        <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={2}>
          {body}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const { commit } = useOnboardingStore();
  const user        = useUserStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);

  const opacity = useSharedValue(0);
  const ty      = useSharedValue(16);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    ty.value      = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);
  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  const finishOnboarding = async () => {
    setSubmitting(true);
    try {
      await commit();
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert(
        'Could not save your settings',
        'Check your connection and try again.',
      );
      setSubmitting(false);
    }
  };

  const handleEnable = async () => {
    if (!user) {
      await finishOnboarding();
      return;
    }
    setSubmitting(true);
    try {
      await registerForPushNotifications(user.uid);
    } catch {
      // Silently continue — notification permission denial is OK
    }
    await finishOnboarding();
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OnboardingProgress step={5} totalSteps={5} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, animStyle]}>
            <Text style={styles.title}>STAY AHEAD{'\n'}OF THE LEAGUE.</Text>
            <Text variant="bodyLarge" color={colors.textSecondary} style={styles.subtitle}>
              Get the alerts that matter — when your players get hurt, when targets fall,
              when sleepers spike on waivers.
            </Text>
          </Animated.View>

          <View style={styles.previews}>
            <NotificationPreview
              emoji="🚨"
              title="Injury Alert — Josh Allen"
              body="Allen is QUESTIONABLE for Sunday with a shoulder issue. Backup plan ready."
              time="now"
              accent={colors.coral}
              delay={300}
            />
            <NotificationPreview
              emoji="📡"
              title="Waiver Spike — Jaylen Wright"
              body="Wright is being added in 4,200+ leagues. Top RB on the wire this week."
              time="2m"
              accent={colors.green}
              delay={500}
            />
            <NotificationPreview
              emoji="📊"
              title="Your GM Report is ready"
              body="Position grades, underperformer flags, and 3 bold moves for Week 12."
              time="1h"
              accent={colors.gold}
              delay={700}
            />
          </View>

          {/* Permission promise */}
          <Animated.View style={[styles.promiseCard, animStyle]}>
            <Text variant="labelSmall" color={colors.textTertiary} style={styles.promiseLabel}>
              YOUR PROMISE
            </Text>
            <Text variant="bodySmall" color={colors.textSecondary} style={styles.promiseText}>
              We never spam. You can fine-tune which alerts you want from your profile any time.
            </Text>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <OnboardingFooter
        primaryLabel="Enable Notifications"
        onPrimary={handleEnable}
        primaryLoading={submitting}
        secondaryLabel="Maybe Later"
        onSecondary={handleSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     220,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize:    40,
    lineHeight:  44,
    color:       colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: { lineHeight: 24 },

  previews: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  promiseCard: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.md,
    padding:         spacing.base,
    gap:             spacing.xs,
  },
  promiseLabel: { letterSpacing: 1 },
  promiseText:  { lineHeight: 18 },

  bottomSpacer: { height: spacing.xl },
});

const previewStyles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             spacing.md,
    alignItems:      'flex-start',
  },
  iconWrap: {
    width:         42,
    height:        42,
    borderRadius:  10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  icon:  { fontSize: 22 },
  body:  { flex: 1, gap: 2 },
  headerRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   2,
  },
});
