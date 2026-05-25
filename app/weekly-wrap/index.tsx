import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PageHeader } from '@components/shared/PageHeader';
import { SportTint } from '@components/shared/SportTint';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useStreakStore } from '@store/useStreakStore';
import { useGmHistoryStore } from '@store/useGmHistoryStore';
import { useTakesLog } from '@store/useTakesLog';
import { useYahooStore } from '@store/useYahooStore';

export default function WeeklyWrapScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const active   = useYahooStore(s => s.active[sport]);
  const calls    = useStreakStore(s => s.calls);
  const gmHist   = useGmHistoryStore(s => s.snapshots);
  const takes    = useTakesLog(s => s.takes);

  const data = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Hit rate for the past week
    const recent  = calls.filter(c => c.outcome && c.ts >= weekAgo);
    const hits    = recent.filter(c => c.outcome === 'hit').length;
    const misses  = recent.length - hits;
    const hitPct  = recent.length > 0 ? Math.round((hits / recent.length) * 100) : 0;

    // GM Score trend
    const sportGm = gmHist
      .filter(g => g.sport === sport)
      .sort((a, b) => a.ts - b.ts);
    const latestGm  = sportGm[sportGm.length - 1];
    const weekStart = sportGm.find(g => g.ts >= weekAgo);
    const gmDelta   = latestGm && weekStart ? latestGm.score - weekStart.score : 0;

    // Takes this week
    const weekTakes = takes.filter(t => t.sport === sport && t.ts >= weekAgo);

    return {
      hits, misses, hitPct,
      latestGm: latestGm?.score ?? null,
      latestGrade: latestGm?.grade ?? null,
      gmDelta,
      takeCount: weekTakes.length,
      hotPicks:  weekTakes.filter(t => t.kind === 'hot').slice(0, 3),
    };
  }, [calls, gmHist, takes, sport]);

  async function share() {
    const lines = [
      `🏆 My DraftIQ Week — ${sportDef.shortLabel}`,
      '',
      `Hit rate: ${data.hits} / ${data.hits + data.misses} (${data.hitPct}%)`,
    ];
    if (data.latestGm != null) lines.push(`GM Score: ${data.latestGm} (${data.latestGrade})${data.gmDelta !== 0 ? data.gmDelta > 0 ? ` ↑${data.gmDelta}` : ` ↓${Math.abs(data.gmDelta)}` : ''}`);
    lines.push(`${data.takeCount} takes logged`);
    lines.push('', '— via DraftIQ');
    await Share.share({ message: lines.join('\n') }).catch(() => {});
  }

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Weekly Wrap" />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>YOUR WEEK.{'\n'}WRAPPED.</Text>
          <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
            {sportDef.shortLabel} · Past 7 days · Share it.
          </Text>

          <LinearGradient
            colors={[`${colors.green}22`, `${colors.purple}22`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Sticker variant="lockedIn" label="THE WEEK" />
            <View style={styles.bigStatRow}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 1 }}>HIT RATE</Text>
                <Text style={[styles.bigNum, { color: data.hitPct >= 60 ? colors.green : data.hitPct >= 40 ? colors.gold : colors.coral }]}>
                  {data.hitPct}%
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {data.hits} hits · {data.misses} misses
                </Text>
              </View>
              {data.latestGm != null && (
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text variant="caption" color={colors.textTertiary} style={{ letterSpacing: 1 }}>GM SCORE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={[styles.bigNum, { color: colors.textPrimary }]}>{data.latestGm}</Text>
                    {data.gmDelta !== 0 && (
                      <Text variant="bodyMedium" style={{ color: data.gmDelta > 0 ? colors.green : colors.coral, fontWeight: '800' }}>
                        {data.gmDelta > 0 ? `↑${data.gmDelta}` : `↓${Math.abs(data.gmDelta)}`}
                      </Text>
                    )}
                  </View>
                  <Text variant="caption" color={colors.textSecondary}>Grade {data.latestGrade}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.sectionHead}>TAKES THIS WEEK</Text>
            <View style={styles.statRow}>
              <Text variant="bodyMedium" color={colors.textPrimary}>{data.takeCount}</Text>
              <Text variant="bodySmall" color={colors.textTertiary}>logged calls across {sportDef.shortLabel}</Text>
            </View>
            {data.hotPicks.length > 0 && (
              <>
                <Text style={[styles.sectionHead, { marginTop: spacing.md }]}>HOT PICKS YOU CALLED</Text>
                {data.hotPicks.map((t, i) => (
                  <Text key={i} variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 4 }}>
                    🔥 {t.player} — <Text variant="caption" color={colors.textTertiary}>{t.take}</Text>
                  </Text>
                ))}
              </>
            )}
            {!active && (
              <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.md, fontStyle: 'italic' }}>
                Connect Yahoo to get richer week recaps.
              </Text>
            )}
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={share} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={18} color="#000" />
            <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800', letterSpacing: 0.5 }}>
              SHARE THE WRAP
            </Text>
          </TouchableOpacity>

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
  },
  heroCard: {
    borderRadius: radius.lg,
    padding:      spacing.lg,
    borderWidth:  1,
    borderColor:  colors.border,
    marginBottom: spacing.lg,
    gap:          spacing.md,
  },
  bigStatRow: {
    flexDirection: 'row',
    gap:           spacing.md,
  },
  bigNum: {
    fontSize:      40,
    fontWeight:    '800',
    letterSpacing: -1.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.lg,
  },
  sectionHead: {
    fontSize:      11,
    fontWeight:    '700',
    color:         colors.textTertiary,
    letterSpacing: 1,
    marginBottom:  6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems:    'baseline',
    gap:           6,
  },
  shareBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: colors.green,
    borderRadius:    radius.lg,
    paddingVertical: spacing.md,
  },
});
