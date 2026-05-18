import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { colors } from '@constants/colors';
import { spacing, radius } from '@constants/spacing';
import { typography } from '@constants/typography';
import {
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  isAppleAuthAvailable,
} from '@services/firebaseAuth';

type Field = 'email' | 'password';

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize  = 'none',
  keyboardType    = 'default',
  isFocused       = false,
  onFocus,
  onBlur,
  editable        = true,
}: {
  label:             string;
  value:             string;
  onChangeText:      (v: string) => void;
  placeholder:       string;
  secureTextEntry?:  boolean;
  autoCapitalize?:   'none' | 'sentences' | 'words';
  keyboardType?:     'default' | 'email-address';
  isFocused?:        boolean;
  onFocus?:          () => void;
  onBlur?:           () => void;
  editable?:         boolean;
}) {
  return (
    <View style={inputStyles.wrap}>
      <Text variant="label" color={colors.textSecondary} style={inputStyles.label}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[
          inputStyles.input,
          isFocused && inputStyles.inputFocused,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={editable}
      />
    </View>
  );
}

export default function LoginScreen() {
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [focused,     setFocused]     = useState<Field | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error,       setError]       = useState('');
  const [appleAvail,  setAppleAvail]  = useState(false);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvail);
    contentOpacity.value    = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    contentTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      // onAuthStateChanged in _layout.tsx handles navigation
    } catch (e: any) {
      console.error('[login] email sign-in failed:', e.code, e.message, e);
      setError(getFriendlyError(e.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') {
        setError('Google sign-in failed. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in failed. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text variant="bodyMedium" color={colors.textSecondary}>← Back</Text>
          </TouchableOpacity>

          <Animated.View style={animStyle}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>WELCOME{'\n'}BACK.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Sign in to your DraftIQ account
              </Text>
            </View>

            {/* Social auth */}
            <View style={styles.socialSection}>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Text style={styles.googleG}>G</Text>
                <Text variant="bodyMedium" color={colors.textPrimary}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="caption" color={colors.textTertiary} style={styles.dividerText}>
                or sign in with email
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              <AuthInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                isFocused={focused === 'email'}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                editable={!isSubmitting}
              />
              <AuthInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                isFocused={focused === 'password'}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                editable={!isSubmitting}
              />

              {/* Error message */}
              {!!error && (
                <View style={styles.errorWrap}>
                  <Text variant="bodySmall" color={colors.coral}>{error}</Text>
                </View>
              )}

              <Button
                label={isSubmitting ? '' : 'Sign In'}
                variant="primary"
                onPress={handleEmailSignIn}
                loading={isSubmitting}
                style={styles.submitBtn}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text variant="body" color={colors.textSecondary}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/signup')} activeOpacity={0.7}>
                <Text variant="bodyMedium" color={colors.green}>Sign up free</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const getFriendlyError = (code: string): string => {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests':  return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Something went wrong. Try again.';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },

  backBtn: {
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
    alignSelf: 'flex-start',
  },

  // Header
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    ...typography.h1,
    fontSize:    42,
    lineHeight:  44,
    color:       colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
  },

  // Social
  socialSection: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  appleBtn: {
    width:  '100%',
    height: 52,
  },
  googleBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.sm,
    backgroundColor: colors.surface,
    borderWidth:    1,
    borderColor:    colors.border,
    borderRadius:   radius.lg,
    paddingVertical: 15,
  },
  googleG: {
    ...typography.bodyBold,
    fontSize:   18,
    color:      '#4285F4',
    fontFamily: 'DMSans_700Bold',
  },

  // Divider
  divider: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    marginBottom:   spacing.xl,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: colors.border,
  },
  dividerText: {
    flexShrink: 1,
  },

  // Form
  form: {
    gap: spacing.base,
    marginBottom: spacing['2xl'],
  },
  errorWrap: {
    backgroundColor: 'rgba(255,95,95,0.1)',
    borderRadius:    radius.sm,
    padding:         spacing.sm,
    borderWidth:     1,
    borderColor:     'rgba(255,95,95,0.3)',
  },
  submitBtn: {
    marginTop: spacing.xs,
  },

  // Footer
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
  },
});

const inputStyles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: {
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor:  colors.surface,
    borderWidth:      1.5,
    borderColor:      colors.border,
    borderRadius:     radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical:  spacing.md,
    ...typography.body,
    color:            colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.green,
  },
});
