import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { SPORTS, type SportId } from '@constants/sports';
import { useMyRoster } from '@hooks/useMyRoster';
import { gemini } from '@services/gemini';

interface StrengthCell {
  pos:    string;
  player: string;
  week:   string;        // "W14" or date
  difficulty: 'easy' | 'medium' | 'hard' | 'bye';
}

interface StrengthGrid {
  weeks: string[];
  rows:  Array<{ player: string; pos: string; team: string; cells: StrengthCell[] }>;
}

const cache: Record<string, { ts: number; grid: StrengthGrid }> = {};
const CACHE_MS = 1000 * 60 * 60 * 6;

const COLOR: Record<StrengthCell['difficulty'], string> = {
  easy:   colors.green,
  medium: colors.gold,
  hard:   colors.coral,
  bye:    colors.textTertiary,
};

/**
 * SCHEDULE STRENGTH — for each starter, the difficulty of the next 3 matchups,
 * color-coded green/gold/red. Quick visual: where do you have an edge soon?
 */
export function ScheduleStrength({ sport }: { sport: SportId }) {
  const { roster, hasLeague } = useMyRoster(sport);
  const sportDef = SPORTS[sport];

  const cacheKey = roster?.leagueId ? `${sport}:${roster.leagueId}` : null;
  const [grid, setGrid]       = useState<StrengthGrid | null>(cacheKey ? cache[cacheKey]?.grid ?? null : null);
  const [loading, setLoading] = useState(false);

  const starters = useMemo(
    () => (roster?.players ?? []).filter(p => p.isStarter).slice(0, 8),
    [roster?.players],
  );

  useEffect(() => {
    if (!cacheKey || starters.length === 0) return;
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      setGrid(cached.grid);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const starterStr = starters
          .map(p => `${p.name} (${p.position}, ${p.team})`)
          .join('\n');
        const prompt = `${sportDef.shortLabel} fantasy schedule strength. For each of these starters, rate the difficulty of their NEXT 3 ${sportDef.shortLabel} matchups: easy (favorable), medium (toss-up), hard (tough D / great pitching / etc.), or bye if it's their bye week.

PLAYERS:
${starterStr}

Output EXACT JSON, nothing else:
{
  "weeks": ["W1", "W2", "W3"],
  "rows": [
    {
      "player": "exact name",
      "pos": "position",
      "team": "team abbrev",
      "cells": [
        {"week": "W1", "difficulty": "easy" | "medium" | "hard" | "bye"},
        ...3 cells
      ]
    }
  ]
}
Use real upcoming opponents and matchup context. Be honest.`;

        const raw = await gemini.chat(prompt, sportDef.shortLabel);
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('no json');
        const parsed = JSON.parse(m[0]);
        const g: StrengthGrid = {
          weeks: Array.isArray(parsed.weeks) ? parsed.weeks.slice(0, 3) : ['W1', 'W2', 'W3'],
          rows:  (Array.isArray(parsed.rows) ? parsed.rows : []).map((r: any) => ({
            player: r.player ?? '',
            pos:    r.pos ?? '',
            team:   r.team ?? '',
            cells:  (Array.isArray(r.cells) ? r.cells : []).slice(0, 3).map((c: any) => ({
              pos: r.pos, player: r.player, week: c.week ?? '',
              difficulty: (['easy', 'medium', 'hard', 'bye'].includes(c.difficulty) ? c.difficulty : 'medium') as StrengthCell['difficulty'],
            })),
          })),
        };
        cache[cacheKey] = { ts: Date.now(), grid: g };
        if (!cancelled) setGrid(g);
      } catch {
        /* swallow */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cacheKey, sport, sportDef.shortLabel, starters.length]);

  if (!hasLeague) return null;
  if (loading && !grid) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.head}>SCHEDULE STRENGTH · NEXT 3</Text>
        <ActivityIndicator size="small" color={colors.green} />
      </View>
    );
  }
  if (!grid || grid.rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.head}>SCHEDULE STRENGTH · NEXT 3</Text>
      <View style={styles.weekHeaderRow}>
        <View style={{ flex: 1 }} />
        {grid.weeks.map(w => (
          <Text key={w} variant="caption" color={colors.textTertiary} style={styles.weekHeader}>{w}</Text>
        ))}
      </View>
      {grid.rows.map((r, i) => {
        const allBad   = r.cells.length > 0 && r.cells.every(c => c.difficulty === 'hard' || c.difficulty === 'bye');
        const allGreat = r.cells.length > 0 && r.cells.every(c => c.difficulty === 'easy');
        const nameColor = allBad ? colors.coral : allGreat ? colors.green : colors.textPrimary;
        const nameOpacity = allBad ? 0.6 : 1;
        return (
          <View key={`${r.player}-${i}`} style={[styles.row, i < grid.rows.length - 1 && styles.border, { opacity: nameOpacity }]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: nameColor, fontWeight: '700' }} numberOfLines={1}>{r.player}</Text>
              <Text variant="caption" color={colors.textTertiary}>{r.pos} · {r.team}</Text>
            </View>
            {r.cells.map((c, j) => (
              <View key={`${c.week}-${j}`} style={[styles.cell, { backgroundColor: `${COLOR[c.difficulty]}30`, borderColor: `${COLOR[c.difficulty]}90` }]}>
                <Text style={{ color: COLOR[c.difficulty], fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>
                  {c.difficulty === 'bye' ? 'BYE' : c.difficulty === 'easy' ? 'GO' : c.difficulty === 'hard' ? 'NO' : 'TBD'}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
      <View style={styles.legend}>
        <LegendDot color={COLOR.easy} label="EASY" />
        <LegendDot color={COLOR.medium} label="MED" />
        <LegendDot color={COLOR.hard} label="HARD" />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.item}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text variant="caption" color={colors.textTertiary} style={{ fontSize: 10 }}>{label}</Text>
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
  head: {
    fontSize:      11,
    fontWeight:    '800',
    color:         colors.textPrimary,
    letterSpacing: 1.2,
    marginBottom:  spacing.sm,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    gap:           6,
    marginBottom:  spacing.xs,
  },
  weekHeader: {
    width:      64,
    textAlign:  'center',
    fontSize:   11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    paddingVertical: spacing.md,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    width:           64,
    paddingVertical: 10,
    borderRadius:    radius.md,
    borderWidth:     1.5,
    alignItems:      'center',
    justifyContent:  'center',
  },
  legend: {
    flexDirection: 'row',
    gap:           spacing.md,
    marginTop:     spacing.sm,
    justifyContent: 'center',
  },
});

const legendStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:  { width: 8, height: 8, borderRadius: 4 },
});
