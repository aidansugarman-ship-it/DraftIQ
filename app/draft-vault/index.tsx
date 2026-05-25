import { useState, useCallback } from 'react';
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
import { SPORTS } from '@constants/sports';
import { useUserStore } from '@store/useUserStore';
import { useDraftVaultStore, type VaultDraft } from '@store/useDraftVaultStore';
import { gemini } from '@services/gemini';

export default function DraftVaultScreen() {
  const sport    = useUserStore(s => s.currentSport);
  const sportDef = SPORTS[sport];
  const drafts   = useDraftVaultStore(s => s.drafts).filter(d => d.sport === sport);
  const attachGrade = useDraftVaultStore(s => s.attachGrade);
  const remove   = useDraftVaultStore(s => s.remove);

  const [grading, setGrading] = useState<string | null>(null);

  const grade = useCallback(async (d: VaultDraft) => {
    setGrading(d.id);
    try {
      const picksStr = d.picks
        .map(p => `R${p.round}: ${p.name} (${p.pos}, ${p.team})`)
        .join(', ');
      const prompt = `${sportDef.shortLabel} fantasy mock draft. Grade these picks.

PICKS: ${picksStr}

Output EXACT JSON, nothing else:
{
  "grade": "letter grade (A+, B-, etc.)",
  "note":  "ONE sharp sentence — what's the story of this draft. TikTok creator voice."
}`;
      const raw = await gemini.chat(prompt, sportDef.shortLabel);
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('no json');
      const parsed = JSON.parse(m[0]);
      attachGrade(d.id, parsed.grade ?? '—', parsed.note ?? '');
    } catch {
      /* swallow */
    } finally {
      setGrading(null);
    }
  }, [attachGrade, sportDef.shortLabel]);

  return (
    <View style={styles.container}>
      <SportTint sport={sport} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Draft Vault" />

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>EVERY MOCK.{'\n'}EVERY GRADE.</Text>
          <Text variant="bodySmall" color={colors.textTertiary} style={{ marginBottom: spacing.lg }}>
            Every {sportDef.shortLabel} mock you save lands here. AI grades them. See your patterns over time.
          </Text>

          {drafts.length === 0 ? (
            <EmptyState
              emoji="🗂️"
              title="Vault is empty"
              body="Run a mock draft and tap 'Save to Vault' at the end. AI will grade it here."
              ctaLabel="Run a mock"
              onCta={() => router.push('/draft')}
            />
          ) : (
            drafts.map(d => (
              <View key={d.id} style={styles.draftCard}>
                <View style={styles.draftHead}>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color={colors.textTertiary}>
                      {new Date(d.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{d.picks.length} picks
                    </Text>
                    {d.grade ? (
                      <View style={styles.gradeRow}>
                        <View style={[styles.gradePill, { borderColor: gradeColor(d.grade), backgroundColor: `${gradeColor(d.grade)}15` }]}>
                          <Text style={[styles.gradeText, { color: gradeColor(d.grade) }]}>{d.grade}</Text>
                        </View>
                        {d.note && (
                          <Text variant="bodySmall" color={colors.textSecondary} style={{ flex: 1, lineHeight: 19, fontStyle: 'italic' }}>
                            "{d.note}"
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Sticker variant="must" label="UNGRADED" />
                    )}
                  </View>
                  <TouchableOpacity onPress={() => remove(d.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: spacing.sm }}>
                  {d.picks.map((p, i) => (
                    <View key={i} style={styles.pickChip}>
                      <Text variant="labelSmall" color={colors.textTertiary} style={{ fontSize: 9 }}>R{p.round}</Text>
                      <Text variant="bodySmallMedium" color={colors.textPrimary} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text variant="caption" color={colors.textTertiary}>{p.pos}</Text>
                    </View>
                  ))}
                </ScrollView>

                {!d.grade && (
                  grading === d.id ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm }}>
                      <ActivityIndicator size="small" color={colors.green} />
                      <Text variant="caption" color={colors.textTertiary}>Grading…</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.gradeBtn} onPress={() => grade(d)} activeOpacity={0.8}>
                      <Ionicons name="sparkles" size={14} color={colors.green} />
                      <Text variant="bodySmall" style={{ color: colors.green }}>Grade this draft</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            ))
          )}

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function gradeColor(grade: string): string {
  const letter = grade.charAt(0).toUpperCase();
  if (letter === 'A') return colors.green;
  if (letter === 'B') return colors.gold;
  if (letter === 'C') return colors.coral;
  return colors.textTertiary;
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
  draftCard: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    padding:         spacing.base,
    marginBottom:    spacing.md,
  },
  draftHead: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginTop:     6,
  },
  gradePill: {
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:      radius.sm,
    borderWidth:       1,
  },
  gradeText: {
    fontSize:   16,
    fontWeight: '800',
  },
  pickChip: {
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      radius.md,
    backgroundColor:   colors.background,
    borderWidth:       1,
    borderColor:       colors.border,
    alignItems:        'center',
    gap:               2,
  },
  gradeBtn: {
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
});
