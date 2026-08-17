import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@components/ui/Text';
import { PageHeader } from '@components/shared/PageHeader';
import { colors } from '@constants/colors';
import { spacing } from '@constants/spacing';
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@constants/legal';

/**
 * In-app legal viewer. Renders the bundled Privacy Policy / Terms so the
 * Settings buttons work with zero hosting dependency. Apple also needs a
 * public URL in App Store Connect — the same text lives in /legal/*.md for
 * the dev to host.
 */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isTerms = doc === 'terms';
  const body    = isTerms ? TERMS_OF_SERVICE : PRIVACY_POLICY;
  const title   = isTerms ? 'Terms of Service' : 'Privacy Policy';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title={title} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {body.trim().split('\n').map((line, i) => {
            const t = line.trim();
            if (!t) return <View key={i} style={{ height: spacing.sm }} />;
            if (t.startsWith('## ')) {
              return <Text key={i} style={styles.h2}>{t.slice(3)}</Text>;
            }
            if (t.startsWith('# ')) {
              return <Text key={i} style={styles.h1}>{t.slice(2)}</Text>;
            }
            if (t.startsWith('- ')) {
              return (
                <Text key={i} variant="bodySmall" color={colors.textSecondary} style={styles.bullet}>
                  •  {t.slice(2)}
                </Text>
              );
            }
            if (t.startsWith('_') && t.endsWith('_')) {
              return <Text key={i} variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing.sm }}>{t.replace(/_/g, '')}</Text>;
            }
            return (
              <Text key={i} variant="bodySmall" color={colors.textSecondary} style={styles.para}>
                {t.replace(/\*\*/g, '')}
              </Text>
            );
          })}
          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  safe:      { flex: 1 },
  scroll:    { padding: spacing.base },
  h1: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.md, letterSpacing: -0.5 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginTop: spacing.lg, marginBottom: spacing.xs },
  para:   { lineHeight: 21, marginBottom: 4 },
  bullet: { lineHeight: 21, marginBottom: 3, paddingLeft: spacing.sm },
});
