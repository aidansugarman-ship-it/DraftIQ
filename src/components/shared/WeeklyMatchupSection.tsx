import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useYahooStore } from '@store/useYahooStore';
import { yahooFantasy } from '@services/yahooFantasy';
import { gemini } from '@services/gemini';

interface Breakdown {
  opponentName: string;
  week:         number;
  verdict:      string;     // ONE-line headline
  wins:         string[];   // positions where you win
  losses:       string[];   // positions where you lose
  steal:        string;     // the move to steal the win
}

const cache: Record<string, { ts: number; data: Breakdown }> = {};
const CACHE_MS = 1000 * 60 * 60 * 4;

/**
 * THIS WEEK — pulls the user's real Yahoo matchup, AI breaks it down
 * position-by-position with a "how to steal the win" call.
 */
export function WeeklyMatchupSection({ sport }: { sport: SportId }) {
  const active   = useYahooStore(s => s.active[sport]);
  const sportDef = SPORTS[sport];
  const [data, setData]       = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    const cacheKey = `${active.teamKey}`;
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setData(cached.data);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const matchup = await yahooFantasy.currentMatchup(active.teamKey);
        if (!matchup || cancelled) { setLoading(false); return; }

        const [myRoster, oppRoster] = await Promise.all([
          yahooFantasy.teamRoster(active.teamKey).catch(() => []),
          yahooFantasy.teamRoster(matchup.opponentTeamKey).catch(() => []),
        ]);
        if (cancelled) return;

        const myStr  = myRoster.map(p => `${p.name} (${p.position}, ${p.team})`).join(', ');
        const oppStr = oppRoster.map(p => `${p.name} (${p.position}, ${p.team})`).join(', ');

        const prompt = `${sportDef.shortLabel} fantasy week ${matchup.week} matchup.

MY ROSTER: ${myStr || '(loading)'}

OPPONENT (${matchup.opponentName}): ${oppStr || '(loading)'}

Output EXACT JSON, nothing else:
{
  "verdict": "ONE punchy sentence — who wins this matchup and why",
  "wins":   ["position groups where MY team is better — e.g. 'RB', 'WR depth'"],
  "losses": ["position groups where the opponent is better"],
  "steal":  "the specific move that would tilt this matchup in MY favor — TikTok creator voice, 1-2 sentences"
}
Be sharp. Real opinions.`;

        const raw = await gemini.chat(prompt, sportDef.shortLabel);
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('no json');
        const parsed = JSON.parse(m[0]);
        const result: Breakdown = {
          opponentName: matchup.opponentName,
          week:         matchup.week,
          verdict:      parsed.verdict ?? '',
          wins:         Array.isArray(parsed.wins) ? parsed.wins : [],
          losses:       Array.isArray(parsed.losses) ? parsed.losses : [],
          steal:        parsed.steal ?? '',
        };
        cache[cacheKey] = { ts: Date.now(), data: result };
        if (!cancelled) setData(result);
      } catch {
        /* swallow — section just won't show */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active?.teamKey, sport]);

  if (!active) return null;
  if (loading && !data) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.head}>THIS WEEK</Text>
        <ActivityIndicator size="small" color={colors.green} />
      </View>
    );
  }
  if (!data) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.headEmoji}>⚔️</Text>
        <Text style={styles.head}>WEEK {data.week} · VS {data.opponentName.toUpperCase()}</Text>
      </View>

      <View style={styles.verdictBox}>
        <Sticker variant="fire" label="THE READ" />
        <Text variant="bodyLarge" color={colors.textPrimary} style={styles.verdict}>
          "{data.verdict}"
        </Text>
      </View>

      {(data.wins.length > 0 || data.losses.length > 0) && (
        <View style={styles.splitRow}>
          <View style={styles.splitCol}>
            <Sticker variant="rising" label="YOU WIN" />
            {data.wins.map((w, i) => (
              <Text key={`w-${i}`} variant="bodySmallMedium" color={colors.textPrimary}>• {w}</Text>
            ))}
          </View>
          <View style={styles.splitCol}>
            <Sticker variant="falling" label="YOU LOSE" />
            {data.losses.map((l, i) => (
              <Text key={`l-${i}`} variant="bodySmallMedium" color={colors.textPrimary}>• {l}</Text>
            ))}
          </View>
        </View>
      )}

      {!!data.steal && (
        <View style={styles.stealBox}>
          <Ionicons name="flash" size={14} color={colors.gold} />
          <View style={{ flex: 1 }}>
            <Text variant="labelSmall" style={{ color: colors.gold, letterSpacing: 0.6, marginBottom: 2 }}>
              STEAL THE WIN
            </Text>
            <Text variant="bodySmall" color={colors.textPrimary} style={{ lineHeight: 19 }}>
              {data.steal}
            </Text>
          </View>
        </View>
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
  head: {
    fontSize:      12,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: 1.2,
  },
  verdictBox: {
    backgroundColor: `${colors.coral}0E`,
    borderRadius:    radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.coral,
    padding:         spacing.sm,
    marginBottom:    spacing.md,
    gap:             6,
  },
  verdict: {
    fontSize:   17,
    fontWeight: '700',
    lineHeight: 23,
  },
  splitRow: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  splitCol: {
    flex:            1,
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.sm,
    gap:             4,
  },
  stealBox: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             spacing.sm,
    backgroundColor: `${colors.gold}0E`,
    borderRadius:    radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    padding:         spacing.sm,
  },
});
