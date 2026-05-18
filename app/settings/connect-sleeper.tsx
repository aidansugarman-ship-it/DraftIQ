import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@lib/firebase';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { sleeper, SleeperLeague, SleeperUser } from '@services/sleeper';
import { useUserStore } from '@store/useUserStore';
import type { ConnectedLeague } from '@types/user';

type Step = 'username' | 'pick-league' | 'done';

export default function ConnectSleeperScreen() {
  const user        = useUserStore((s) => s.user);
  const updateUser  = useUserStore((s) => s.updateUser);

  const [step,        setStep]        = useState<Step>('username');
  const [username,    setUsername]    = useState('');
  const [sleeperUser, setSleeperUser] = useState<SleeperUser | null>(null);
  const [leagues,     setLeagues]     = useState<SleeperLeague[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const lookupUser = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      const su = await sleeper.getUser(username.trim());
      setSleeperUser(su);
      const ls = await sleeper.getLeagues(su.user_id, '2024');
      setLeagues(ls);
      if (ls.length === 0) {
        setError(`No 2024 NFL leagues found for ${su.display_name}. You may need to be active in a league.`);
        return;
      }
      setStep('pick-league');
    } catch (e: any) {
      setError(`Couldn't find Sleeper user "${username}". Double-check spelling.`);
    } finally {
      setLoading(false);
    }
  };

  const pickLeague = async (league: SleeperLeague) => {
    if (!user || !sleeperUser) return;
    setLoading(true);
    try {
      const rosters = await sleeper.getRosters(league.league_id);
      const myRoster = rosters.find(r => r.owner_id === sleeperUser.user_id);
      if (!myRoster) {
        setError("Couldn't find your roster in that league.");
        return;
      }

      const connected: ConnectedLeague = {
        id:         `sleeper-${league.league_id}`,
        platform:   'sleeper',
        leagueName: league.name,
        teamName:   sleeperUser.display_name,
        leagueId:   league.league_id,
        teamId:     String(myRoster.roster_id),
        connectedAt: new Date().toISOString(),
        sport:      'nfl',
      };

      const existing = user.connectedLeagues ?? [];
      const next = [
        ...existing.filter(l => l.leagueId !== league.league_id),
        connected,
      ];

      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), {
        connectedLeagues: next,
        sleeperUsername:  sleeperUser.username,
      });
      updateUser({ connectedLeagues: next, sleeperUsername: sleeperUser.username });

      setStep('done');
    } catch (e: any) {
      setError('Could not connect that league. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Connect Sleeper</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 'username' && (
            <>
              <Text style={styles.title}>CONNECT YOUR{'\n'}SLEEPER LEAGUE.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Pull your real roster and start getting AI takes on YOUR team — not generic players.
              </Text>

              <View style={styles.inputBox}>
                <Text variant="caption" color={colors.textTertiary} style={styles.inputLabel}>
                  SLEEPER USERNAME
                </Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your_sleeper_handle"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {error ? (
                <View style={styles.errBox}>
                  <Text variant="bodySmall" style={{ color: colors.coral }}>{error}</Text>
                </View>
              ) : null}

              <Button
                label={loading ? '' : 'Find My Leagues'}
                variant="primary"
                onPress={lookupUser}
                loading={loading}
                disabled={!username.trim() || loading}
              />

              <View style={styles.hintBox}>
                <Text variant="caption" color={colors.textTertiary}>
                  Don't have a Sleeper account?{'\n'}
                  It's free at sleeper.com — most fantasy folks already use it.
                </Text>
              </View>
            </>
          )}

          {step === 'pick-league' && sleeperUser && (
            <>
              <Text style={styles.title}>PICK YOUR{'\n'}LEAGUE.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Found {leagues.length} league{leagues.length === 1 ? '' : 's'} for {sleeperUser.display_name}. Pick the one you want DraftIQ to follow.
              </Text>

              {leagues.map((l) => (
                <TouchableOpacity
                  key={l.league_id}
                  style={styles.leagueCard}
                  onPress={() => pickLeague(l)}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" color={colors.textPrimary}>{l.name}</Text>
                    <Text variant="caption" color={colors.textTertiary}>
                      {l.total_rosters}-team · {l.season} · {l.status}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}

              {error ? (
                <View style={styles.errBox}>
                  <Text variant="bodySmall" style={{ color: colors.coral }}>{error}</Text>
                </View>
              ) : null}
            </>
          )}

          {step === 'done' && (
            <>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark-circle" size={72} color={colors.green} />
              </View>
              <Text style={styles.title}>CONNECTED.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Your roster is now synced. Head back to the home screen — every AI take from here is about YOUR players.
              </Text>
              <Button
                label="Back to Home"
                variant="primary"
                onPress={() => router.replace('/(tabs)')}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: {
    padding: spacing.base,
    paddingBottom: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginTop:    spacing.lg,
    marginBottom: spacing.md,
  },
  subtitle: {
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  inputBox: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  inputLabel: {
    letterSpacing: 0.8,
    marginBottom:  6,
  },
  input: {
    fontSize:        16,
    color:           colors.textPrimary,
    minHeight:       28,
    paddingVertical: 4,
  },
  errBox: {
    padding:           spacing.sm,
    backgroundColor:   `${colors.coral}10`,
    borderRadius:      radius.sm,
    borderWidth:       1,
    borderColor:       `${colors.coral}40`,
    marginBottom:      spacing.md,
  },
  hintBox: {
    marginTop:    spacing.lg,
    padding:      spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  leagueCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.sm,
  },
  doneIcon: {
    alignItems:    'center',
    marginTop:     spacing['3xl'],
    marginBottom:  spacing.lg,
  },
});
