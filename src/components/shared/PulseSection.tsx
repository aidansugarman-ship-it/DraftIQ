import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { JargonText } from '@components/shared/JargonText';
import { ShareTakeButton } from '@components/shared/ShareTakeButton';
import { ShareableCard } from '@components/shared/ShareableCard';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { gemini } from '@services/gemini';
import { espn } from '@services/espn';
import { useRefreshSignal } from '@store/useRefreshSignal';
import { useTakesLog } from '@store/useTakesLog';
import { useStreakStore } from '@store/useStreakStore';

interface Pulse {
  headline: string;
  hot:      Array<{ name: string; note: string }>;
  cold:     Array<{ name: string; note: string }>;
}

const cache: Record<string, { ts: number; pulse: Pulse }> = {};
const CACHE_MS = 1000 * 60 * 30;

/**
 * PULSE — the daily heartbeat of a sport. AI-generated hot/cold list
 * + one big take, grounded in real ESPN news. TikTok energy.
 */
export function PulseSection({ sport }: { sport: SportId }) {
  const sportDef = SPORTS[sport];
  const [pulse, setPulse]     = useState<Pulse | null>(cache[sport]?.pulse ?? null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const news = await espn.news(sport, 8).catch(() => []);
      const newsStr = news.slice(0, 8).map(n => `- ${n.headline}`).join('\n');
      const prompt = `You're a TikTok-creator fantasy ${sportDef.shortLabel} analyst.
Today's headlines:
${newsStr}

Give me the pulse of the league right now. Output EXACT JSON, nothing else:
{
  "headline": "ONE punchy hot take of the day — TikTok creator voice, 1 sentence",
  "hot":  [{"name": "player name", "note": "why he's hot — short phrase, 3-7 words"}, ...3 players],
  "cold": [{"name": "player name", "note": "why he's cold — short phrase, 3-7 words"}, ...3 players]
}
Real, current players from the headlines or known stars. No fluff.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]);
      const p: Pulse = {
        headline: parsed.headline ?? '',
        hot:      Array.isArray(parsed.hot)  ? parsed.hot.slice(0, 3)  : [],
        cold:     Array.isArray(parsed.cold) ? parsed.cold.slice(0, 3) : [],
      };
      cache[sport] = { ts: Date.now(), pulse: p };
      // Log to memory so the AI can reference past takes later
      const log = useTakesLog.getState().log;
      p.hot.forEach(h => log({ sport, kind: 'hot',  player: h.name, take: h.note }));
      p.cold.forEach(c => log({ sport, kind: 'cold', player: c.name, take: c.note }));
      // Record the bold takes as gradeable calls so the track record / hit-rate
      // / GM-score pipeline actually has data to resolve later. Deduped by the
      // store-side key on player+headline within a session via the cache guard.
      const rec = useStreakStore.getState().record;
      if (p.headline) rec({ sport, kind: 'bold', headline: p.headline });
      p.hot.forEach(h => rec({ sport, kind: 'sleeper', headline: `${h.name} heating up: ${h.note}`, player: h.name }));
      setPulse(p);
    } catch {
      /* swallow — keep last state */
    } finally {
      setLoading(false);
    }
  }

  const refreshTick = useRefreshSignal((s) => s.tick);

  useEffect(() => {
    const cached = cache[sport];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setPulse(cached.pulse);
      return;
    }
    refresh();
  }, [sport]);

  // Pull-to-refresh: bust the cache and refetch immediately.
  useEffect(() => {
    if (refreshTick === 0) return;
    delete cache[sport];
    refresh();
  }, [refreshTick]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.headEmoji}>⚡</Text>
        <Text style={styles.headTitle}>{sportDef.shortLabel} PULSE</Text>
        <TouchableOpacity onPress={refresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6}>
          <Ionicons name="refresh" size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {!pulse && loading ? (
        <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.green} />
        </View>
      ) : !pulse ? (
        <Text variant="bodySmall" color={colors.textTertiary}>Pulse will load in a sec.</Text>
      ) : (
        <>
          {/* Headline take */}
          <View style={styles.takeBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Sticker variant="fire" />
              <ShareTakeButton headline={pulse.headline} sport={sportDef.shortLabel} compact />
            </View>
            <JargonText variant="bodyLarge" color={colors.textPrimary} style={styles.takeText}>
              {`"${pulse.headline}"`}
            </JargonText>
            <View style={{ marginTop: spacing.sm }}>
              <ShareableCard headline={pulse.headline} sport={sport} label="SHARE AS IMAGE" />
            </View>
          </View>

          {/* Hot / Cold splits */}
          <View style={styles.splitRow}>
            <View style={styles.splitCol}>
              <Sticker variant="hot" />
              {pulse.hot.map((p, i) => (
                <View key={`h-${i}`} style={styles.player}>
                  <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>{p.name}</Text>
                  <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>{p.note}</Text>
                </View>
              ))}
            </View>
            <View style={styles.splitCol}>
              <Sticker variant="cold" />
              {pulse.cold.map((p, i) => (
                <View key={`c-${i}`} style={styles.player}>
                  <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>{p.name}</Text>
                  <Text variant="caption" color={colors.textTertiary} numberOfLines={2}>{p.note}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
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
    marginBottom:    spacing.lg,
  },
  headRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.md,
  },
  headEmoji: { fontSize: 16 },
  headTitle: {
    fontSize:      12,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: 1.2,
    flex:          1,
  },
  takeBox: {
    backgroundColor: `${colors.coral}0E`,
    borderRadius:    radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    padding:         spacing.sm,
    marginBottom:    spacing.md,
    gap:             6,
  },
  takeText: {
    fontSize:      26,
    fontWeight:    '800',
    lineHeight:    32,
    letterSpacing: -0.5,
  },
  splitRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  splitCol: {
    flex:            1,
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.sm,
    gap:             spacing.sm,
  },
  player: { gap: 2 },
});
