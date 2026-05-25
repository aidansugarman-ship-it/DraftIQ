import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useMyRoster } from '@hooks/useMyRoster';
import { espn } from '@services/espn';
import { gemini } from '@services/gemini';
import { useRefreshSignal } from '@store/useRefreshSignal';

interface Snapshot {
  generatedAt: number;
  bullets:     string[];
  headline:    string;
}

const memCache: Record<string, Snapshot> = {};
const PER_SPORT_TTL = 1000 * 60 * 60 * 18;
const STORAGE_PREFIX = 'draftiq.dailySnap.v1.';

/**
 * "Since yesterday" — quick AI rundown of what changed for the user's team
 * in this sport. Persists per-sport-per-league to AsyncStorage so we can
 * actually compare across launches and only regenerate ~once per day.
 */
export function DailySnapshotCard({ sport }: { sport: SportId }) {
  const sportDef = SPORTS[sport];
  const { roster, hasLeague } = useMyRoster(sport);
  const refreshTick = useRefreshSignal(s => s.tick);

  const cacheKey = roster?.leagueId ? `${sport}:${roster.leagueId}` : null;
  const [snap, setSnap]       = useState<Snapshot | null>(cacheKey ? memCache[cacheKey] ?? null : null);
  const [loading, setLoading] = useState(false);

  async function regenerate() {
    if (!roster || !cacheKey) return;
    setLoading(true);
    try {
      const news      = await espn.news(sport, 6).catch(() => []);
      const newsStr   = news.map(n => `- ${n.headline}`).join('\n');
      const rosterStr = roster.players
        .filter(p => p.isStarter)
        .map(p => `${p.name} (${p.position}, ${p.team}${p.injury ? `, ${p.injury.status}` : ''})`)
        .join(', ');

      const prompt = `Daily snapshot for a ${sportDef.shortLabel} fantasy manager. ${roster.teamName} starters: ${rosterStr}.

Recent ${sportDef.shortLabel} headlines (since yesterday-ish):
${newsStr}

Output EXACT JSON, nothing else:
{
  "headline": "ONE punchy sentence — what's the biggest thing this manager needs to know",
  "bullets": ["1 sentence — specific change that affects their team", "...up to 4 bullets"]
}
Reference players by name. TikTok creator voice. No fluff. If nothing big changed, say so honestly.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]);
      const s: Snapshot = {
        generatedAt: Date.now(),
        headline:    parsed.headline ?? '',
        bullets:     Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 4) : [],
      };
      memCache[cacheKey] = s;
      AsyncStorage.setItem(STORAGE_PREFIX + cacheKey, JSON.stringify(s)).catch(() => {});
      setSnap(s);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cacheKey) return;
    // Try memory cache, then storage.
    const inMem = memCache[cacheKey];
    if (inMem && Date.now() - inMem.generatedAt < PER_SPORT_TTL) {
      setSnap(inMem);
      return;
    }
    AsyncStorage.getItem(STORAGE_PREFIX + cacheKey)
      .then((raw) => {
        if (raw) {
          const s = JSON.parse(raw) as Snapshot;
          memCache[cacheKey] = s;
          if (Date.now() - s.generatedAt < PER_SPORT_TTL) {
            setSnap(s);
            return;
          }
        }
        regenerate();
      })
      .catch(() => regenerate());
  }, [cacheKey]);

  // Pull-to-refresh bypasses the TTL
  useEffect(() => {
    if (refreshTick === 0 || !cacheKey) return;
    regenerate();
  }, [refreshTick]);

  if (!hasLeague) return null;
  if (loading && !snap) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.head}>SINCE YESTERDAY</Text>
        <ActivityIndicator size="small" color={colors.green} />
      </View>
    );
  }
  if (!snap) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Sticker variant="must" label="WHAT'S NEW" />
        <Text variant="caption" color={colors.textTertiary} style={{ flex: 1, textAlign: 'right' }}>
          {new Date(snap.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      {!!snap.headline && (
        <Text variant="bodyLarge" color={colors.textPrimary} style={styles.headline}>
          {snap.headline}
        </Text>
      )}
      {snap.bullets.map((b, i) => (
        <View key={i} style={styles.bullet}>
          <Ionicons name="chevron-forward" size={11} color={colors.green} />
          <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 19 }}>
            {b}
          </Text>
        </View>
      ))}
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
    gap:           spacing.sm,
    marginBottom:  spacing.sm,
  },
  head: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: 1.2,
    marginBottom:  spacing.sm,
  },
  headline: {
    fontSize:    17,
    fontWeight:  '700',
    lineHeight:  23,
    marginBottom: spacing.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.xs,
    marginTop:     4,
  },
});
