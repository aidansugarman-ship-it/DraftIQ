import { useEffect, useState, useCallback } from 'react';
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
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { EmptyState } from '@components/shared/EmptyState';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useYahooStore } from '@store/useYahooStore';
import { useUserStore } from '@store/useUserStore';
import { yahooFantasy, type YahooRosterPlayer } from '@services/yahooFantasy';

interface TeamRollup {
  sport:     SportId;
  league:    string;
  team:      string;
  starters:  YahooRosterPlayer[];
  injured:   YahooRosterPlayer[];
  urgent:    string;       // headline action (e.g. "2 injured starters")
  priority:  number;       // sort order — higher = more urgent
}

/**
 * GM WALLET — your fantasy life at a glance.
 * Every connected team across NFL/NBA/MLB/NHL, ranked by how much
 * attention they need right now. One screen, all your action items.
 */
export default function GmWalletScreen() {
  const active = useYahooStore(s => s.active);
  const setSport = useUserStore(s => s.setCurrentSport);

  const [rows, setRows]       = useState<TeamRollup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const sports = (Object.keys(active) as SportId[]).filter(s => active[s]);
    if (sports.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const rollups: TeamRollup[] = [];
      await Promise.all(sports.map(async (sport) => {
        const league = active[sport]!;
        try {
          const roster   = await yahooFantasy.teamRoster(league.teamKey);
          const starters = roster.filter(p => !['BN', 'IL', 'IL+', 'IR', 'NA'].includes(p.selectedPos));
          const injured  = starters.filter(p => !!p.status);
          let urgent   = '';
          let priority = 0;
          if (injured.length > 0) {
            urgent   = `🚨 ${injured.length} injured starter${injured.length === 1 ? '' : 's'}`;
            priority = 100 + injured.length * 10;
          } else if (roster.length === 0) {
            urgent   = '⚠️ Roster empty';
            priority = 200;
          } else {
            urgent   = '✅ All clear';
            priority = 10;
          }
          rollups.push({ sport, league: league.leagueName, team: league.teamName, starters, injured, urgent, priority });
        } catch {
          rollups.push({
            sport, league: league.leagueName, team: league.teamName,
            starters: [], injured: [],
            urgent: '⚠️ Couldn\'t load', priority: 50,
          });
        }
      }));
      rollups.sort((a, b) => b.priority - a.priority);
      setRows(rollups);
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => { load(); }, [load]);

  const hasAny = Object.values(active).some(Boolean);

  return (
    <View style={styles.container}>
      <SportTint sport={'nfl'} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="GM Wallet" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {!hasAny ? (
            <EmptyState
              emoji="👜"
              title="No teams in your wallet yet"
              body="Connect Yahoo to pull every team you manage across NFL, NBA, MLB & NHL into one view."
              ctaLabel="Connect Yahoo"
              onCta={() => router.push('/settings/connect-yahoo')}
            />
          ) : (
            <>
              <Text style={styles.title}>EVERY TEAM.{'\n'}EVERY SPORT.</Text>
              <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
                Ranked by what needs your attention RIGHT NOW.
              </Text>

              {loading && rows.length === 0 && (
                <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.green} />
                </View>
              )}

              {rows.map((r) => {
                const def = SPORTS[r.sport];
                const tone = r.priority >= 100 ? colors.coral : r.priority >= 50 ? colors.gold : colors.green;
                return (
                  <TouchableOpacity
                    key={r.sport}
                    style={[styles.card, { borderColor: `${tone}55` }]}
                    activeOpacity={0.8}
                    onPress={() => { setSport(r.sport); router.push(`/(tabs)/${r.sport}`); }}
                  >
                    <View style={styles.cardHead}>
                      <Text style={[styles.sportEmoji, { color: def.primaryColor }]}>
                        {def.emoji}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700' }}>
                          {def.shortLabel} · {r.team}
                        </Text>
                        <Text variant="caption" color={colors.textTertiary} numberOfLines={1}>
                          {r.league}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                    </View>
                    <View style={[styles.urgentBox, { backgroundColor: `${tone}14`, borderLeftColor: tone }]}>
                      <Text variant="bodySmallMedium" style={{ color: tone }}>{r.urgent}</Text>
                    </View>
                    {r.injured.length > 0 && (
                      <View style={{ marginTop: spacing.sm, gap: 2 }}>
                        {r.injured.slice(0, 3).map(p => (
                          <Text key={p.playerKey} variant="caption" color={colors.textSecondary}>
                            • {p.name} ({p.position}) — {p.status}
                          </Text>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}

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
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1.5,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginBottom:  spacing.sm,
  },
  sportEmoji: {
    fontSize:   28,
    lineHeight: 32,
  },
  urgentBox: {
    borderRadius:    radius.md,
    borderLeftWidth: 2,
    padding:         spacing.sm,
  },
});
