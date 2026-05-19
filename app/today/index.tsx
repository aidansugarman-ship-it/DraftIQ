import { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import { useUserStore } from '@store/useUserStore';
import { SPORTS, SPORT_IDS, type SportId } from '@constants/sports';
import { VIBES } from '@constants/sportVibes';
import { useDailyDrops } from '@hooks/useDailyDrops';
import { SportTint } from '@components/shared/SportTint';
import { ConfidenceStars } from '@components/shared/ConfidenceStars';

/**
 * Vertical scroll feed of today's hottest cards across all 4 sports.
 * News reactions, bold calls, sleepers — interleaved.
 */
export default function TodayFeed() {
  const currentSport = useUserStore(s => s.currentSport);
  const setCurrentSport = useUserStore(s => s.setCurrentSport);

  // Pull drops for ALL sports so the feed feels fresh and varied
  const nfl = useDailyDrops('nfl');
  const nba = useDailyDrops('nba');
  const mlb = useDailyDrops('mlb');
  const nhl = useDailyDrops('nhl');

  const allDrops = useMemo(() => [
    { sport: 'nfl' as SportId, data: nfl },
    { sport: 'nba' as SportId, data: nba },
    { sport: 'mlb' as SportId, data: mlb },
    { sport: 'nhl' as SportId, data: nhl },
  ], [nfl, nba, mlb, nhl]);

  // Build an interleaved feed: news reactions first, then bold calls, then sleepers
  const feed = useMemo(() => {
    const items: Array<{ kind: 'news' | 'bold' | 'sleeper'; sport: SportId; payload: any }> = [];
    allDrops.forEach(({ sport, data }) => {
      if (data.newsTake.headline) items.push({ kind: 'news', sport, payload: data.newsTake });
    });
    allDrops.forEach(({ sport, data }) => {
      if (data.prediction.headline) items.push({ kind: 'bold', sport, payload: data.prediction });
    });
    allDrops.forEach(({ sport, data }) => {
      data.sleepers.forEach(s => items.push({ kind: 'sleeper', sport, payload: s }));
    });
    return items;
  }, [allDrops]);

  return (
    <View style={styles.container}>
      <SportTint sport={currentSport} intensity="bold" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="bodyMedium" color={colors.textPrimary}>Today's Drops</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>TODAY.</Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            All 4 sports. Just the cards that matter.
          </Text>

          {/* Sport filter chips — also sets the global currentSport so user lands somewhere meaningful */}
          <View style={styles.sportChips}>
            {SPORT_IDS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sportChip, currentSport === s && styles.sportChipActive]}
                onPress={() => setCurrentSport(s)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14 }}>{SPORTS[s].emoji}</Text>
                <Text variant="labelSmall" style={{
                  color: currentSport === s ? colors.textPrimary : colors.textTertiary,
                  letterSpacing: 0.3,
                }}>
                  {SPORTS[s].shortLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {feed.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text variant="body" color={colors.textSecondary} align="center" style={{ marginTop: spacing.md }}>
                Cooking up today's takes…
              </Text>
            </View>
          ) : (
            feed.map((item, i) => (
              <Animated.View key={`${item.kind}-${item.sport}-${i}`} entering={FadeInDown.delay(i * 60).duration(400)}>
                <FeedCard item={item} />
              </Animated.View>
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FeedCard({ item }: { item: { kind: 'news' | 'bold' | 'sleeper'; sport: SportId; payload: any } }) {
  const vibe = VIBES[item.sport];
  const sportLabel = SPORTS[item.sport].shortLabel;

  if (item.kind === 'news') {
    return (
      <View style={[cardStyles.card, { borderLeftColor: colors.gold }]}>
        <CardHeader sportLabel={sportLabel} emoji={vibe.news} tagText="NEWS REACTION" tagColor={colors.gold} />
        <Text variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: 6 }}>{item.payload.headline}</Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6, lineHeight: 19 }}>{item.payload.take}</Text>
        <View style={{ marginTop: 8 }}><ConfidenceStars value={item.payload.confidence} /></View>
      </View>
    );
  }

  if (item.kind === 'bold') {
    return (
      <View style={[cardStyles.card, { borderLeftColor: colors.coral }]}>
        <CardHeader sportLabel={sportLabel} emoji={vibe.bold} tagText="BOLD CALL" tagColor={colors.coral} />
        <Text variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: 6, fontWeight: '700' }}>{item.payload.headline}</Text>
        <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6, lineHeight: 19 }}>{item.payload.reasoning}</Text>
        <View style={{ marginTop: 8 }}><ConfidenceStars value={item.payload.confidence} /></View>
      </View>
    );
  }

  return (
    <View style={[cardStyles.card, { borderLeftColor: colors.purple }]}>
      <CardHeader sportLabel={sportLabel} emoji={vibe.sleeper} tagText="SLEEPER" tagColor={colors.purple} />
      <Text variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: 6 }}>
        {item.payload.player} <Text variant="caption" color={colors.textTertiary}>· {item.payload.pos} · {item.payload.team}</Text>
      </Text>
      <Text variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 6, lineHeight: 19 }}>{item.payload.reason}</Text>
      <View style={{ marginTop: 8 }}><ConfidenceStars value={item.payload.confidence} /></View>
    </View>
  );
}

function CardHeader({ sportLabel, emoji, tagText, tagColor }: { sportLabel: string; emoji: string; tagText: string; tagColor: string }) {
  return (
    <View style={cardStyles.headerRow}>
      <View style={[cardStyles.tag, { backgroundColor: `${tagColor}18`, borderColor: `${tagColor}50` }]}>
        <Text style={{ fontSize: 11 }}>{emoji}</Text>
        <Text variant="labelSmall" style={{ color: tagColor, fontSize: 10, letterSpacing: 0.5 }}>{tagText}</Text>
      </View>
      <Text variant="labelSmall" color={colors.textTertiary} style={{ letterSpacing: 0.6 }}>{sportLabel}</Text>
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
  scroll: { padding: spacing.base, gap: spacing.sm },
  title: {
    fontSize: 56, fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -2,
    marginTop: spacing.md,
  },
  subtitle: { marginBottom: spacing.lg, lineHeight: 22 },
  sportChips: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' },
  sportChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius:    radius.full,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  sportChipActive: {
    backgroundColor: `${colors.green}18`,
    borderColor:     `${colors.green}60`,
  },
  empty: { padding: spacing['2xl'], alignItems: 'center' },
});

const cardStyles = StyleSheet.create({
  card: {
    padding:         spacing.base,
    borderRadius:    radius.lg,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderLeftWidth: 3,
    marginBottom:    spacing.sm,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  tag: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              5,
    paddingHorizontal: 8,
    paddingVertical:  3,
    borderRadius:     999,
    borderWidth:      1,
  },
});
