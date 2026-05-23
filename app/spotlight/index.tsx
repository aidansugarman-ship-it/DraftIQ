import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { PlayerAvatar } from '@components/shared/PlayerAvatar';
import { TeamLogo } from '@components/shared/TeamLogo';
import { FavoriteButton } from '@components/shared/FavoriteButton';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';

interface SpotlightCard {
  name:    string;
  team:    string;
  pos:     string;
  vibe:    'hot' | 'cold' | 'sleeper' | 'must' | 'dagger';
  hook:    string;       // big headline
  stats:   string;       // one-line stat
  take:    string;       // 2-3 sentence AI take
}

const { height: SCREEN_H } = Dimensions.get('window');

const cache: Record<string, { ts: number; cards: SpotlightCard[] }> = {};
const CACHE_MS = 1000 * 60 * 30;

export default function SpotlightReel() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];

  const [cards, setCards]     = useState<SpotlightCard[]>(cache[sport]?.cards ?? []);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const news = await espn.news(sport, 10).catch(() => []);
      const newsStr = news.slice(0, 8).map(n => `- ${n.headline}`).join('\n');
      const prompt = `You're a TikTok-creator ${sportDef.shortLabel} fantasy analyst. Build a vertical spotlight reel — 8 punchy cards on real players to know RIGHT NOW.

Recent headlines:
${newsStr}

Output EXACT JSON, nothing else:
{
  "cards": [
    {
      "name":  "real player name",
      "team":  "team abbreviation",
      "pos":   "position abbreviation",
      "vibe":  "hot" | "cold" | "sleeper" | "must" | "dagger",
      "hook":  "ONE punchy headline — 5-8 words, ALL CAPS feels right but not required",
      "stats": "ONE stat line — '24 HR / .298 / .945 OPS' style",
      "take":  "2-3 sentences — sharp TikTok creator voice, the WHY"
    }
  ]
}
Mix vibes. Real current players. Concrete stats. No fluff.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      const list = (Array.isArray(parsed.cards) ? parsed.cards : []).slice(0, 8);
      cache[sport] = { ts: Date.now(), cards: list };
      setCards(list);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [sport, sportDef.shortLabel]);

  useEffect(() => {
    const cached = cache[sport];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setCards(cached.cards);
      return;
    }
    load();
  }, [sport]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text variant="bodyMedium" style={{ color: '#fff' }}>
            {sportDef.shortLabel} Spotlight
          </Text>
          <TouchableOpacity onPress={load} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading && cards.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.green} />
            <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
              Cooking up takes…
            </Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(c, i) => `${c.name}-${i}`}
            pagingEnabled
            snapToInterval={SCREEN_H - 100}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <SpotlightCardView card={item} sport={sport} />
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function SpotlightCardView({ card, sport }: { card: SpotlightCard; sport: SportId }) {
  async function share() {
    await Share.share({
      message: `${card.hook}\n\n${card.name} — ${card.pos}, ${card.team}\n${card.stats}\n\n"${card.take}"\n\n— via DraftIQ`,
    }).catch(() => {});
  }

  return (
    <View style={cardStyles.wrap}>
      <LinearGradient
        colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={cardStyles.body}>
        <View style={cardStyles.headRow}>
          <PlayerAvatar sport={sport} id={card.name} name={card.name} size={64} />
          <View style={{ flex: 1 }}>
            <Sticker variant={card.vibe as any} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <TeamLogo sport={sport} team={card.team} size={18} />
              <Text variant="bodySmall" color={colors.textTertiary}>{card.pos} · {card.team}</Text>
            </View>
          </View>
          <FavoriteButton
            player={{ id: card.name, name: card.name, team: card.team, pos: card.pos, sport: sport as any }}
            size={28}
          />
        </View>

        <Text style={cardStyles.hook}>{card.hook}</Text>

        <View style={cardStyles.statsRow}>
          <Text style={cardStyles.statsLabel}>STATS</Text>
          <Text style={cardStyles.statsValue}>{card.stats}</Text>
        </View>

        <Text style={cardStyles.take}>{card.take}</Text>

        <View style={cardStyles.footer}>
          <Text variant="caption" color={colors.textTertiary}>— DraftIQ · {SPORTS[sport].shortLabel}</Text>
          <TouchableOpacity onPress={share} style={cardStyles.shareBtn} activeOpacity={0.75}>
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={cardStyles.shareLabel}>SHARE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe:      { flex: 1 },
  headerBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingBox: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});

const cardStyles = StyleSheet.create({
  wrap: {
    height:          SCREEN_H - 100,
    backgroundColor: '#0a0a0a',
    overflow:        'hidden',
  },
  body: {
    flex:    1,
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  hook: {
    fontSize:      36,
    fontWeight:    '900',
    color:         '#fff',
    lineHeight:    40,
    letterSpacing: -0.5,
  },
  statsRow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius:    radius.md,
    padding:         spacing.md,
    gap:             4,
  },
  statsLabel: {
    fontSize:      10,
    fontWeight:    '800',
    color:         colors.textTertiary,
    letterSpacing: 1.2,
  },
  statsValue: {
    fontSize:   20,
    fontWeight: '700',
    color:      '#fff',
  },
  take: {
    fontSize:   16,
    lineHeight: 22,
    color:      'rgba(255,255,255,0.88)',
  },
  footer: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      spacing.sm,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      999,
    backgroundColor:   colors.green,
  },
  shareLabel: {
    color:         '#000',
    fontSize:      11,
    fontWeight:    '800',
    letterSpacing: 0.8,
  },
});
