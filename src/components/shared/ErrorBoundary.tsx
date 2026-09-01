import { Component, type ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@components/ui/Text';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { captureError } from '@services/errorReporting';

interface Props {
  children: ReactNode;
  /** Optional label so we can tell WHERE it crashed in logs/UI. */
  scope?: string;
  /** Optional custom fallback. */
  fallback?: ReactNode;
}
interface State { hasError: boolean; message: string }

/**
 * App-wide crash guard. Without this, a single render/parse error white-screens
 * the whole app — fatal for a demo or review. Catches the error, shows a clean
 * recover screen, and lets the user retry instead of force-quitting.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Something went wrong.',
    };
  }

  componentDidCatch(error: unknown) {
    // No-ops when no Sentry DSN is configured.
    captureError(error, { scope: this.props.scope ?? 'app' });
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <View style={styles.wrap}>
        <Text style={styles.emoji}>🫤</Text>
        <Text style={styles.title}>Something glitched.</Text>
        <Text variant="body" color={colors.textSecondary} align="center" style={styles.body}>
          That screen hit a snag — not your fault. Tap below to jump back in.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.reset} activeOpacity={0.85}>
          <Text variant="bodyMedium" style={{ color: '#000', fontWeight: '800' }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  emoji: { fontSize: 64, lineHeight: 72 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  body:  { lineHeight: 22, maxWidth: 300, marginBottom: spacing.md },
  btn: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
  },
});
