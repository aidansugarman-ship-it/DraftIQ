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

interface Action {
  rank:    number;
  title:   string;
  detail:  string;
  urgency: 'urgent' | 'today' | 'chill';
}
interface Snapshot {
  generatedAt: number;
  headline:    string;
  actions:     Action[];
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

      const prompt = `Daily action card for a ${sportDef.shortLabel} fantasy manager. ${roster.teamName} starters: ${rosterStr}.

Recent ${sportDef.shortLabel} headlines (since yesterday-ish):
${newsStr}

Output 3 RANKED ACTIONS — the most impactful things this user should do TODAY. EXACT JSON, nothing else:
{
  "headline": "ONE punchy headline — TikTok creator voice, what's the day about",
  "actions": [
    {"rank": 1, "title": "imperative — 'Drop X for Y' or 'Set lineup before 1pm' style", "detail": "1 sentence why, specific to their roster", "urgency": "urgent" | "today" | "chill"},
    {"rank": 2, "title": "...", "detail": "...", "urgency": "..."},
    {"rank": 3, "title": "...", "detail": "...", "urgency": "..."}
  ]
}
Real player names. No fluff. If they're set, the 3rd action can be "Watch [game] — your X is hot" or similar low-priority chill action.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('no json');
      const parsed = JSON.parse(match[0]);
      const s: Snapshot = {
        generatedAt: Date.now(),
        headline:    parsed.headline ?? '',
        actions:     Array.isArray(parsed.actions) ? parsed.actions.slice(0, 3).map((a: any, i: number) => ({
          rank:    Number(a.rank) || i + 1,
          title:   a.title  ?? '',
          detail:  a.detail ?? '',
          urgency: ['urgent','today','chill'].includes(a.urgency) ? a.urgency : 'today',
        })) : [],
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
        <Sticker variant="must" label="DO TODAY" />
        <Text variant="caption" color={colors.textTertiary} style={{ flex: 1, textAlign: 'right' }}>
          {new Date(snap.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      {!!snap.headline && (
        <Text variant="bodyLarge" color={colors.textPrimary} style={styles.headline}>
          {snap.headline}
        </Text>
      )}
      {snap.actions.map((a) => {
        const tone = a.urgency === 'urgent' ? colors.coral : a.urgency === 'today' ? colors.gold : colors.green;
        return (
          <View key={a.rank} style={[styles.action, { borderLeftColor: tone }]}>
            <View style={[styles.actionRank, { backgroundColor: `${tone}22`, borderColor: `${tone}88` }]}>
              <Text style={[styles.actionRankNum, { color: tone }]}>{a.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700', lineHeight: 21 }}>
                {a.title}
              </Text>
              {!!a.detail && (
                <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 2, lineHeight: 17 }}>
                  {a.detail}
                </Text>
              )}
            </View>
          </View>
        );
      })}
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
  action: {
    flexDirection: 'row',
    gap:           spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft:   spacing.sm,
    borderLeftWidth: 3,
    marginTop:     6,
  },
  actionRank: {
    width:           28,
    height:          28,
    borderRadius:    14,
    borderWidth:     1.5,
    alignItems:      'center',
    justifyContent:  'center',
  },
  actionRankNum: {
    fontSize:   14,
    fontWeight: '800',
  },
});
