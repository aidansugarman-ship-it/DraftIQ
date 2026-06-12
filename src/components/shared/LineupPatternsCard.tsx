import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@components/ui/Text';
import { Sticker } from '@components/shared/Sticker';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useLineupHistoryStore } from '@store/useLineupHistoryStore';
import { gemini } from '@services/gemini';

interface Pattern { headline: string; detail: string; goodOrBad: 'good' | 'bad' }
interface Read { summary: string; patterns: Pattern[] }

const cache: Record<string, { ts: number; read: Read }> = {};
const CACHE_MS = 1000 * 60 * 60 * 12;

/**
 * Lineup pattern card — reads the last ~10 optimize runs from history,
 * asks AI to spot habits ("you bench Q-questionable RBs 70% of the time
 * and they hit 8/10 weeks — stop doing that").
 */
export function LineupPatternsCard({ leagueId, sport }: { leagueId: string; sport: SportId }) {
  const sportDef = SPORTS[sport];
  const entries  = useLineupHistoryStore(s => s.entries).filter(e => e.leagueId === leagueId);

  const [read, setRead]       = useState<Read | null>(cache[leagueId]?.read ?? null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (entries.length < 3) return;
    setLoading(true);
    try {
      const summary = entries.slice(0, 12).map((e, i) => {
        const date = new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const starts = e.decisions.filter(d => d.slot === 'START').map(d => d.name).join(', ');
        const benches = e.decisions.filter(d => d.slot === 'BENCH').map(d => d.name).join(', ');
        return `Run ${i + 1} (${date}, ${e.changedCount} changes): STARTED ${starts}; BENCHED ${benches}`;
      }).join('\n');

      const prompt = `${sportDef.shortLabel} fantasy lineup history. ${entries.length} optimize runs.

${summary}

Look for HABITS and PATTERNS — both good and bad. Things like:
- "You bench Q-questionable RBs 70% of the time"
- "You always start your highest-projected QB"
- "You bench player X in every blowout — but X has hit 5 of 6 times"

Output EXACT JSON, nothing else:
{
  "summary": "ONE punchy sentence — overall read on the user's lineup-setting style",
  "patterns": [
    {"headline": "the pattern in 6-8 words", "detail": "1-2 sentence elaboration with numbers if possible", "goodOrBad": "good" | "bad"},
    ...2-4 patterns total
  ]
}
Be specific. Reference real player names from the data. TikTok creator voice.`;

      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      const r: Read = {
        summary:  parsed.summary ?? '',
        patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 4) : [],
      };
      cache[leagueId] = { ts: Date.now(), read: r };
      setRead(r);
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, [entries, leagueId, sportDef.shortLabel]);

  useEffect(() => {
    const cached = cache[leagueId];
    if (cached && Date.now() - cached.ts < CACHE_MS) setRead(cached.read);
  }, [leagueId]);

  if (entries.length < 3) {
    return (
      <View style={styles.wrap}>
        <Sticker variant="lockedIn" label="PATTERNS" />
        <Text variant="bodySmall" color={colors.textTertiary} style={{ marginTop: spacing.sm, lineHeight: 19 }}>
          Run the Optimizer at least 3 times and AI will start spotting your lineup-setting habits — the good ones to keep and the bad ones to break.
        </Text>
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: 4 }}>
          {entries.length} / 3 runs logged so far.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Sticker variant="fire" label="PATTERN ANALYSIS" />
        <TouchableOpacity onPress={run} hitSlop={6}>
          <Ionicons name={loading ? 'hourglass-outline' : 'refresh'} size={14} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {loading && !read ? (
        <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.green} />
        </View>
      ) : !read ? (
        <TouchableOpacity style={styles.scanBtn} onPress={run} activeOpacity={0.8}>
          <Ionicons name="sparkles" size={14} color={colors.green} />
          <Text variant="bodySmall" style={{ color: colors.green }}>Spot my patterns</Text>
        </TouchableOpacity>
      ) : (
        <>
          {!!read.summary && (
            <Text variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700', lineHeight: 22, marginVertical: spacing.sm }}>
              {read.summary}
            </Text>
          )}
          {read.patterns.map((p, i) => {
            const tone = p.goodOrBad === 'good' ? colors.green : colors.coral;
            return (
              <View key={i} style={[styles.pattern, { borderLeftColor: tone }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 12 }}>{p.goodOrBad === 'good' ? '✅' : '⚠️'}</Text>
                  <Text variant="bodySmallMedium" style={{ color: tone, flex: 1 }}>{p.headline}</Text>
                </View>
                <Text variant="caption" color={colors.textSecondary} style={{ lineHeight: 17 }}>
                  {p.detail}
                </Text>
              </View>
            );
          })}
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
    marginTop:       spacing.lg,
    marginBottom:    spacing.sm,
  },
  headRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  scanBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.green}10`,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     `${colors.green}30`,
    marginTop:       spacing.sm,
  },
  pattern: {
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    borderLeftWidth: 2,
    padding:         spacing.sm,
    marginTop:       spacing.sm,
  },
});
