import { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import type { MyRoster } from '@hooks/useMyRoster';
import { enableLineupReminders, disableLineupReminders } from '@services/notifications';

const PREF_KEY = 'draftiq.lineupAlerts.on';

/**
 * Lineup Lock Alerts — flags injured players still in the starting lineup
 * and lets the user turn on a daily "check your lineup" reminder.
 */
export function LineupAlertsCard({ roster }: { roster: MyRoster | null }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [note, setNote]       = useState('');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then(v => setEnabled(v === 'true')).catch(() => {});
  }, []);

  const atRisk = (roster?.players ?? []).filter(p => p.isStarter && p.injury);

  async function toggle(next: boolean) {
    setBusy(true);
    setNote('');
    if (next) {
      const ok = await enableLineupReminders();
      if (ok) {
        setEnabled(true);
        AsyncStorage.setItem(PREF_KEY, 'true').catch(() => {});
        setNote("You'll get a daily reminder to lock your lineup.");
      } else {
        setEnabled(false);
        setNote('Enable notifications for DraftIQ in Settings to use reminders.');
      }
    } else {
      await disableLineupReminders();
      setEnabled(false);
      AsyncStorage.setItem(PREF_KEY, 'false').catch(() => {});
      setNote('Reminders off.');
    }
    setBusy(false);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Ionicons name="notifications" size={16} color={colors.coral} />
        <Text variant="labelSmall" style={{ color: colors.coral, letterSpacing: 0.8, flex: 1 }}>
          LINEUP LOCK ALERTS
        </Text>
      </View>

      {/* At-risk starters — injured players still starting */}
      {atRisk.length > 0 ? (
        <View style={styles.riskBox}>
          <Text variant="bodySmallMedium" color={colors.textPrimary} style={{ marginBottom: 6 }}>
            ⚠️ {atRisk.length} injured {atRisk.length === 1 ? 'starter' : 'starters'} in your lineup
          </Text>
          {atRisk.map(p => (
            <Text key={p.id} variant="caption" color={colors.textSecondary}>
              {p.name} — {p.position} · {p.injury?.status}
            </Text>
          ))}
        </View>
      ) : roster ? (
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginBottom: spacing.sm }}>
          ✅ No injured players in your starting lineup right now.
        </Text>
      ) : null}

      {/* Reminder toggle */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text variant="bodySmallMedium" color={colors.textPrimary}>Daily lineup reminder</Text>
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2 }}>
            A daily nudge so you never leave a benched stud — or an injured one in.
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={colors.green} />
        ) : (
          <Switch
            value={enabled}
            onValueChange={toggle}
            trackColor={{ true: colors.green }}
            thumbColor="#fff"
          />
        )}
      </View>

      {!!note && (
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.sm }}>
          {note}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginTop:       spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.sm,
  },
  riskBox: {
    backgroundColor: `${colors.coral}10`,
    borderRadius:    radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.coral,
    padding:         spacing.sm,
    marginBottom:    spacing.md,
    gap:             2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
});
