import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useAlertsStore, type AlertCondition } from '@store/useAlertsStore';
import { requestNotificationPermission } from '@services/notifications';

const CONDITIONS: Array<{ id: AlertCondition; label: string; emoji: string; desc: string }> = [
  { id: 'news_mention',  label: 'News mention',    emoji: '📰', desc: 'Any time this player shows up in headlines' },
  { id: 'injury_status', label: 'Injury status',   emoji: '🏥', desc: 'When their injury report changes' },
  { id: 'roster_change', label: 'Roster activity', emoji: '🔄', desc: 'When they get added/dropped league-wide' },
];

export default function CustomAlertsScreen() {
  const currentSport = useUserStore(s => s.currentSport);
  const alerts   = useAlertsStore(s => s.alerts);
  const add      = useAlertsStore(s => s.add);
  const toggle   = useAlertsStore(s => s.toggle);
  const remove   = useAlertsStore(s => s.remove);

  const [name, setName]           = useState('');
  const [sport, setSport]         = useState<SportId>(currentSport);
  const [cond, setCond]           = useState<AlertCondition>('news_mention');
  const [permNote, setPermNote]   = useState('');

  async function create() {
    if (!name.trim()) return;
    // Make sure notification permission is granted so alerts actually fire.
    const ok = await requestNotificationPermission();
    if (!ok) {
      setPermNote('Enable notifications for DraftIQ in Settings for alerts to actually fire.');
    } else {
      setPermNote('');
    }
    add({ player: name.trim(), sport, condition: cond });
    setName('');
  }

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Custom Alerts" />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>BUILD YOUR{'\n'}ALERTS.</Text>
          <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
            Get pinged the moment news drops on any player you care about — across all 4 sports.
          </Text>

          {/* Builder */}
          <View style={styles.builder}>
            <Text style={styles.label}>PLAYER NAME</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={14} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Saquon Barkley"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={[styles.label, { marginTop: spacing.md }]}>SPORT</Text>
            <View style={styles.sportRow}>
              {(['nfl', 'nba', 'mlb', 'nhl'] as SportId[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sportPill, sport === s && styles.sportPillOn]}
                  onPress={() => setSport(s)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 18 }}>{SPORTS[s].emoji}</Text>
                  <Text variant="caption" style={{ color: sport === s ? colors.textPrimary : colors.textTertiary }}>
                    {SPORTS[s].shortLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: spacing.md }]}>WHEN TO PING ME</Text>
            <View style={{ gap: 6 }}>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.condCard, cond === c.id && styles.condCardOn]}
                  onPress={() => setCond(c.id)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmallMedium" color={colors.textPrimary}>{c.label}</Text>
                    <Text variant="caption" color={colors.textTertiary}>{c.desc}</Text>
                  </View>
                  {cond === c.id && <Ionicons name="checkmark-circle" size={18} color={colors.green} />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              onPress={create}
              disabled={!name.trim()}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={16} color="#000" />
              <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800', letterSpacing: 0.5 }}>
                CREATE ALERT
              </Text>
            </TouchableOpacity>

            {!!permNote && (
              <Text variant="caption" color={colors.coral} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                {permNote}
              </Text>
            )}
          </View>

          {/* Existing alerts */}
          <Text style={[styles.label, { marginTop: spacing.lg }]}>YOUR ALERTS · {alerts.length}</Text>
          {alerts.length === 0 ? (
            <EmptyState
              emoji="🔔"
              title="No alerts yet"
              body="Build one above — we'll ping you the second the headline drops."
            />
          ) : (
            alerts.map(a => {
              const condDef = CONDITIONS.find(c => c.id === a.condition);
              return (
                <View key={a.id} style={styles.alertCard}>
                  <Text style={{ fontSize: 20 }}>{condDef?.emoji ?? '🔔'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>
                      {a.player}
                    </Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {SPORTS[a.sport].shortLabel} · {condDef?.label}
                    </Text>
                  </View>
                  <Switch
                    value={a.enabled}
                    onValueChange={() => toggle(a.id)}
                    trackColor={{ true: colors.green }}
                    thumbColor="#fff"
                  />
                  <TouchableOpacity onPress={() => remove(a.id)} hitSlop={8}>
                    <Ionicons name="close" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <View style={{ marginTop: spacing.lg, padding: spacing.base, backgroundColor: `${colors.gold}10`, borderRadius: radius.md, borderLeftWidth: 2, borderLeftColor: colors.gold }}>
            <Sticker variant="lockedIn" label="HOW IT WORKS" />
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 6, lineHeight: 17 }}>
              DraftIQ scans ESPN headlines on every app launch. Any match against your enabled alerts fires a local notification — deduped so you don't get spammed twice on the same story.
            </Text>
          </View>

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  title: {
    fontSize:      34,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight:    38,
    marginTop:     spacing.md,
    marginBottom:  spacing.sm,
  },
  label: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginBottom:  6,
  },
  builder: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
  },
  inputWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    paddingHorizontal: spacing.base,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  input: {
    flex:    1,
    color:   colors.textPrimary,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  sportRow: {
    flexDirection: 'row',
    gap:           6,
  },
  sportPill: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.sm,
    borderRadius:    radius.md,
    backgroundColor: colors.background,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  sportPillOn: {
    backgroundColor: `${colors.green}1A`,
    borderColor:     `${colors.green}55`,
  },
  condCard: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    padding:       spacing.sm,
    borderRadius:  radius.md,
    backgroundColor: colors.background,
    borderWidth:   1,
    borderColor:   colors.border,
  },
  condCardOn: {
    backgroundColor: `${colors.green}10`,
    borderColor:     `${colors.green}55`,
  },
  createBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: colors.green,
    borderRadius:    radius.lg,
    paddingVertical: spacing.md,
    marginTop:       spacing.md,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  alertCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.sm,
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
  },
});
