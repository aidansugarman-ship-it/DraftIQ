import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { useYahooAuth, isYahooConnected, disconnectYahoo } from '@services/yahooAuth';
import { yahooFantasy, type YahooLeague } from '@services/yahooFantasy';
import { EmptyState } from '@components/shared/EmptyState';

export default function ConnectYahooScreen() {
  const { isReady, promptAsync } = useYahooAuth();
  const [connected, setConnected] = useState(false);
  const [checking, setChecking]   = useState(true);
  const [leagues, setLeagues]     = useState<YahooLeague[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    isYahooConnected().then(isOn => {
      setConnected(isOn);
      setChecking(false);
      if (isOn) loadLeagues();
    });
  }, []);

  async function loadLeagues() {
    setLoading(true);
    setError('');
    try {
      const ls = await yahooFantasy.myLeagues();
      setLeagues(ls);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load leagues');
    } finally {
      setLoading(false);
    }
  }

  async function connect() {
    setError('');
    try {
      await promptAsync();
      // After the auth flow completes, the token gets stored automatically by useYahooAuth.
      // Re-check status after a beat.
      setTimeout(async () => {
        const isOn = await isYahooConnected();
        setConnected(isOn);
        if (isOn) loadLeagues();
      }, 600);
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed');
    }
  }

  async function disconnect() {
    await disconnectYahoo();
    setConnected(false);
    setLeagues([]);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Connect Yahoo</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>YAHOO FANTASY{'\n'}LINK-UP.</Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            Pull your real Yahoo leagues — NFL, NBA, MLB, NHL. Personalized takes built around YOUR roster.
          </Text>

          {checking ? (
            <ActivityIndicator size="large" color={colors.green} style={{ marginTop: spacing.lg }} />
          ) : !connected ? (
            <>
              <Button
                label="Sign in with Yahoo"
                variant="primary"
                disabled={!isReady}
                onPress={connect}
              />
              {error ? (
                <View style={styles.errBox}>
                  <Text variant="bodySmall" style={{ color: colors.coral }}>{error}</Text>
                </View>
              ) : null}
              <View style={styles.hintBox}>
                <Text variant="caption" color={colors.textTertiary} style={{ lineHeight: 18 }}>
                  Opens a Yahoo login window. You stay signed in — your password never touches DraftIQ. We only read your league data, never modify it.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.connectedRow}>
                <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                <Text variant="bodyMedium" color={colors.textPrimary}>Connected to Yahoo</Text>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={colors.green} style={{ marginTop: spacing.lg }} />
              ) : leagues.length === 0 ? (
                <EmptyState
                  emoji="🤔"
                  title="No leagues found"
                  body="Make sure you've joined or commissioned at least one Yahoo fantasy league this season."
                />
              ) : (
                <>
                  <Text variant="label" color={colors.textTertiary} style={{ letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm }}>
                    YOUR LEAGUES
                  </Text>
                  {leagues.map((l) => (
                    <View key={l.leagueKey} style={styles.leagueCard}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" color={colors.textPrimary}>{l.name}</Text>
                        <Text variant="caption" color={colors.textTertiary}>
                          {l.sport.toUpperCase()} · {l.numTeams}-team · {l.season} · {l.scoringType}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <Button
                label="Disconnect Yahoo"
                variant="danger"
                onPress={disconnect}
                style={{ marginTop: spacing.xl }}
              />
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
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
  scroll: { padding: spacing.base, paddingBottom: 60 },
  title: {
    fontSize: 32, fontWeight: '800',
    color: colors.textPrimary, letterSpacing: -0.5,
    lineHeight: 36, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  subtitle: { marginBottom: spacing.xl, lineHeight: 22 },
  errBox: {
    padding: spacing.sm,
    backgroundColor: `${colors.coral}10`,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.coral}40`,
    marginTop: spacing.md,
  },
  hintBox: { marginTop: spacing.lg, padding: spacing.base, backgroundColor: colors.surface, borderRadius: radius.md },
  connectedRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    padding:       spacing.base,
    backgroundColor: `${colors.green}10`,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.green}40`,
  },
  leagueCard: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
});
