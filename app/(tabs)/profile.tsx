import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { TIERS } from '@constants/tiers';
import { SPORTS } from '@constants/sports';
import { ARCHETYPES } from '@types/draft';
import { signOut } from '@services/firebaseAuth';
import { useUserStore } from '@store/useUserStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Subcomponents ────────────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  danger,
}: {
  icon:          IoniconName;
  label:         string;
  value?:        string;
  onPress?:      () => void;
  rightElement?: React.ReactNode;
  danger?:       boolean;
}) {
  return (
    <TouchableOpacity
      style={rowStyles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={rowStyles.iconWrap}>
        <Ionicons name={icon} size={18} color={danger ? colors.coral : colors.textSecondary} />
      </View>
      <Text
        variant="body"
        color={danger ? colors.coral : colors.textPrimary}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      {value && (
        <Text variant="bodySmall" color={colors.textTertiary} style={rowStyles.value}>
          {value}
        </Text>
      )}
      {rightElement}
      {onPress && !rightElement && (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <Text variant="label" color={colors.textTertiary} style={sectionStyles.label}>
      {label}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = useUserStore((s) => s.user);
  const tier = useUserStore((s) => s.tier);

  const [notifInjury,  setNotifInjury]  = useState(user?.notificationPreferences.injuryAlerts  ?? true);
  const [notifWaiver,  setNotifWaiver]  = useState(user?.notificationPreferences.waiverAlerts  ?? true);
  const [notifSleeper, setNotifSleeper] = useState(user?.notificationPreferences.sleeperAlerts ?? true);
  const [notifReport,  setNotifReport]  = useState(user?.notificationPreferences.gmReport      ?? true);

  const op = useSharedValue(0);
  useEffect(() => {
    op.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
  }, []);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: op.value }));

  const tierDef   = TIERS[tier];
  const sport     = user?.primarySport ?? 'nfl';
  const archetype = user?.archetype;
  const league    = user?.leagueSettings;

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Animated.View style={[{ flex: 1 }, fadeStyle]}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

            {/* ── User card ───────────────────────────────────────────────── */}
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.displayName ?? user?.email ?? 'G')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.textPrimary}>
                  {user?.displayName ?? 'Fantasy GM'}
                </Text>
                <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: 2 }}>
                  {user?.email}
                </Text>
                {user?.sleeperUsername && (
                  <View style={sleeperStyles.pill}>
                    <Text style={sleeperStyles.sleeperS}>S</Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      {user.sleeperUsername}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[tierBadgeStyles.badge, { borderColor: `${tierDef.color}60`, backgroundColor: `${tierDef.color}18` }]}>
                <Text variant="labelSmall" style={{ color: tierDef.color, letterSpacing: 1 }}>
                  {tierDef.badge}
                </Text>
              </View>
            </View>

            {/* ── Upgrade banner (non-GM) ──────────────────────────────────── */}
            {tier !== 'gm' && (
              <TouchableOpacity
                style={styles.upgradeBanner}
                onPress={() => router.push('/paywall')}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeEmoji}>👑</Text>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" color={colors.gold}>Upgrade to GM</Text>
                  <Text variant="caption" color={colors.textTertiary}>
                    War Room, weekly reports, unlimited everything.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.gold} />
              </TouchableOpacity>
            )}

            {/* ── League settings ──────────────────────────────────────────── */}
            <SectionTitle label="LEAGUE SETTINGS" />
            <View style={styles.section}>
              <SettingsRow
                icon="american-football-outline"
                label="Primary Sport"
                value={SPORTS[sport].shortLabel}
                onPress={() => {}}
              />
              {league && (
                <>
                  <SettingsRow
                    icon="people-outline"
                    label="League Size"
                    value={`${league.numTeams} teams`}
                    onPress={() => {}}
                  />
                  <SettingsRow
                    icon="stats-chart-outline"
                    label="Scoring"
                    value={league.scoringType?.toUpperCase()}
                    onPress={() => {}}
                  />
                  <SettingsRow
                    icon="trophy-outline"
                    label="Format"
                    value={league.format === 'snake' ? 'Snake Draft' : 'Auction'}
                    onPress={() => {}}
                  />
                  {league.isDynasty && (
                    <SettingsRow
                      icon="infinite-outline"
                      label="Dynasty Mode"
                      value="Enabled"
                      onPress={() => {}}
                    />
                  )}
                </>
              )}
              {archetype && (
                <SettingsRow
                  icon="bulb-outline"
                  label="Draft Archetype"
                  value={ARCHETYPES[archetype].label}
                  onPress={() => {}}
                />
              )}
            </View>

            {/* ── Notifications ────────────────────────────────────────────── */}
            <SectionTitle label="NOTIFICATIONS" />
            <View style={styles.section}>
              <SettingsRow
                icon="warning-outline"
                label="Injury Alerts"
                rightElement={
                  <Switch
                    value={notifInjury}
                    onValueChange={setNotifInjury}
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor="#FFF"
                    ios_backgroundColor={colors.border}
                  />
                }
              />
              <SettingsRow
                icon="swap-horizontal-outline"
                label="Waiver Alerts"
                rightElement={
                  <Switch
                    value={notifWaiver}
                    onValueChange={setNotifWaiver}
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor="#FFF"
                    ios_backgroundColor={colors.border}
                  />
                }
              />
              <SettingsRow
                icon="sparkles-outline"
                label="Sleeper Alerts"
                rightElement={
                  <Switch
                    value={notifSleeper}
                    onValueChange={setNotifSleeper}
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor="#FFF"
                    ios_backgroundColor={colors.border}
                  />
                }
              />
              <SettingsRow
                icon="document-text-outline"
                label="GM Report (Tuesdays)"
                rightElement={
                  <Switch
                    value={notifReport}
                    onValueChange={setNotifReport}
                    trackColor={{ false: colors.border, true: colors.green }}
                    thumbColor="#FFF"
                    ios_backgroundColor={colors.border}
                  />
                }
              />
            </View>

            {/* ── Account ──────────────────────────────────────────────────── */}
            <SectionTitle label="ACCOUNT" />
            <View style={styles.section}>
              <SettingsRow
                icon="shield-outline"
                label="Privacy Policy"
                onPress={() => {}}
              />
              <SettingsRow
                icon="document-outline"
                label="Terms of Service"
                onPress={() => {}}
              />
              <SettingsRow
                icon="star-outline"
                label="Rate DraftIQ"
                onPress={() => {}}
              />
              <SettingsRow
                icon="log-out-outline"
                label="Sign Out"
                onPress={handleSignOut}
                danger
              />
            </View>

            <Text variant="caption" color={colors.textTertiary} align="center" style={styles.version}>
              DraftIQ v1.0.0
            </Text>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.base,
    paddingBottom:     100,
  },

  userCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    padding:         spacing.base,
    gap:             spacing.md,
    marginTop:       spacing.base,
    marginBottom:    spacing.md,
  },
  avatar: {
    width:           52,
    height:          52,
    borderRadius:    radius.full,
    backgroundColor: colors.green,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarText: {
    ...typography.h3,
    color: colors.background,
  },

  upgradeBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderWidth:     1,
    borderColor:     'rgba(201,168,76,0.3)',
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             spacing.md,
    marginBottom:    spacing.xl,
  },
  upgradeEmoji: { fontSize: 22 },

  section: {
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    marginBottom:    spacing.xl,
  },

  version: {
    marginBottom: spacing.lg,
  },
  bottomSpacer: { height: spacing.xl },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap:              spacing.md,
  },
  iconWrap: {
    width:          32,
    height:         32,
    borderRadius:   radius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems:     'center',
    justifyContent: 'center',
  },
  value: { marginRight: spacing.xs },
});

const sectionStyles = StyleSheet.create({
  label: {
    letterSpacing: 1,
    marginBottom:  spacing.sm,
    marginTop:     spacing.xs,
  },
});

const sleeperStyles = StyleSheet.create({
  pill: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    marginTop:       4,
    alignSelf:       'flex-start',
    backgroundColor: 'rgba(0,200,255,0.08)',
    borderRadius:    radius.full,
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderWidth:     1,
    borderColor:     'rgba(0,200,255,0.2)',
  },
  sleeperS: {
    fontSize:    10,
    fontWeight:  '700',
    color:       '#00C8FF',
    letterSpacing: 0.5,
  },
});

const tierBadgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius:       radius.full,
    borderWidth:        1,
  },
});
