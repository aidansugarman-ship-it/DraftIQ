import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { signOut } from '@services/firebaseAuth';
import { useUserStore } from '@store/useUserStore';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  right,
  danger,
  last,
}: {
  icon: IoniconName;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={danger ? colors.coral : colors.green} />
        <Text style={[styles.rowLabel, danger && { color: colors.coral }]}>{label}</Text>
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user } = useUserStore();
  const prefs = user?.notificationPreferences;

  const [notifs, setNotifs] = useState({
    injuryAlerts:       prefs?.injuryAlerts       ?? true,
    waiverAlerts:       prefs?.waiverAlerts        ?? true,
    sleeperAlerts:      prefs?.sleeperAlerts       ?? true,
    gmReport:           prefs?.gmReport            ?? true,
    draftReminders:     prefs?.draftReminders      ?? true,
    weatherAlerts:      prefs?.weatherAlerts       ?? true,
  });

  const toggle = (key: keyof typeof notifs) =>
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Section title="EXPERIENCE LEVEL">
          <View style={styles.expRow}>
            {(['beginner', 'experienced'] as const).map((level) => {
              const active = (user?.experienceLevel ?? 'experienced') === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.expPill, active && styles.expPillActive]}
                  onPress={() => {
                    useUserStore.getState().updateUser({ experienceLevel: level });
                    if (user) {
                      const { doc, updateDoc } = require('firebase/firestore');
                      const { db, COLLECTIONS } = require('@lib/firebase');
                      updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { experienceLevel: level }).catch(() => {});
                    }
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.expEmoji]}>{level === 'beginner' ? '🌱' : '🎯'}</Text>
                  <Text style={{
                    color: active ? colors.textPrimary : colors.textTertiary,
                    fontSize: 14,
                    fontWeight: active ? '700' : '500',
                  }}>
                    {level === 'beginner' ? 'New to fantasy' : 'Experienced'}
                  </Text>
                  <Text style={{
                    color: active ? colors.textSecondary : colors.textTertiary,
                    fontSize: 11,
                    marginTop: 2,
                    textAlign: 'center',
                  }}>
                    {level === 'beginner' ? 'Walks you through everything' : 'Sharp takes, no fluff'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="LEAGUES">
          <Row
            icon="link-outline"
            label="Connect Sleeper League (NFL)"
            onPress={() => router.push('/settings/connect-sleeper')}
          />
          <Row
            icon="link"
            label="Connect Yahoo (all 4 sports)"
            onPress={() => router.push('/settings/connect-yahoo')}
            last
          />
        </Section>

        <Section title="SUBSCRIPTION">
          <Row
            icon="trophy-outline"
            label="Manage Subscription"
            onPress={() => router.push('/paywall')}
          />
          <Row
            icon="refresh-outline"
            label="Restore Purchases"
            last
            onPress={() => {}}
          />
        </Section>

        <Section title="NOTIFICATIONS">
          <Row icon="fitness-outline"    label="Injury Alerts"      right={<Switch value={notifs.injuryAlerts}   onValueChange={() => toggle('injuryAlerts')}   trackColor={{ true: colors.green }} thumbColor="#fff" />} />
          <Row icon="people-outline"     label="Waiver Alerts"      right={<Switch value={notifs.waiverAlerts}   onValueChange={() => toggle('waiverAlerts')}   trackColor={{ true: colors.green }} thumbColor="#fff" />} />
          <Row icon="trending-up-outline" label="Sleeper Alerts"    right={<Switch value={notifs.sleeperAlerts}  onValueChange={() => toggle('sleeperAlerts')}  trackColor={{ true: colors.green }} thumbColor="#fff" />} />
          <Row icon="document-text-outline" label="Weekly GM Report" right={<Switch value={notifs.gmReport}      onValueChange={() => toggle('gmReport')}       trackColor={{ true: colors.green }} thumbColor="#fff" />} />
          <Row icon="calendar-outline"   label="Draft Reminders"    right={<Switch value={notifs.draftReminders} onValueChange={() => toggle('draftReminders')} trackColor={{ true: colors.green }} thumbColor="#fff" />} />
          <Row icon="rainy-outline"      label="Weather Alerts"     right={<Switch value={notifs.weatherAlerts}  onValueChange={() => toggle('weatherAlerts')}  trackColor={{ true: colors.green }} thumbColor="#fff" />} last />
        </Section>

        <Section title="ACCOUNT">
          <Row icon="person-outline"   label="Edit Profile"    onPress={() => router.push('/(tabs)/profile')} />
          <Row icon="shield-outline"   label="Privacy Policy"  onPress={() => Linking.openURL('https://draftiq.app/privacy')} />
          <Row icon="document-outline" label="Terms of Service" onPress={() => Linking.openURL('https://draftiq.app/terms')} />
          <Row icon="mail-outline"     label="Contact Support" onPress={() => Linking.openURL('mailto:support@draftiq.app')} last />
        </Section>

        <Section title="DANGER ZONE">
          <Row icon="log-out-outline" label="Sign Out"       onPress={handleSignOut} danger />
          <Row icon="trash-outline"   label="Delete Account" onPress={handleDeleteAccount} danger last />
        </Section>

        <Text style={styles.version}>DraftIQ v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:      { width: 40, height: 40, justifyContent: 'center' },
  title:        { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content:      { paddingHorizontal: spacing.md, paddingBottom: 40 },
  section:      { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1, marginBottom: spacing.xs, marginLeft: 4 },
  sectionCard:  { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14 },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLeft:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel:     { fontSize: 15, color: colors.textPrimary },
  version:      { textAlign: 'center', color: colors.textTertiary, fontSize: 12, marginTop: spacing.md },
  expRow:       { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  expPill:      {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    gap: 4,
  },
  expPillActive: {
    borderColor: colors.green,
    backgroundColor: `${colors.green}10`,
  },
  expEmoji:     { fontSize: 24, lineHeight: 30, marginBottom: 4 },
});
