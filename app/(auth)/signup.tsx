import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
  isAppleAuthAvailable,
} from '@services/firebaseAuth';

type Field = 'name' | 'email' | 'password';

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
  label:            string;
  value:            string;
  onChangeText:     (v: string) => void;
  placeholder:      string;
  secureTextEntry?: boolean;
  autoCapitalize?:  'none' | 'sentences' | 'words';
  keyboardType?:    'default' | 'email-address';
  isFocused?:       boolean;
  onFocus?:         () => void;
  onBlur?:          () => void;
  editable?:        boolean;
}) {
  return (
    <View style={inputStyles.wrap}>
      <Text variant="label" color={colors.textSecondary} style={inputStyles.label}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        style={[inputStyles.input, isFocused && inputStyles.inputFocused]}
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

const PASSWORD_MIN = 8;

export default function SignupScreen() {
  const [name,        setName]       = useState('');
  const [email,       setEmail]      = useState('');
  const [password,    setPassword]   = useState('');
  const [focused,     setFocused]    = useState<Field | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error,       setError]      = useState('');
  const [appleAvail,  setAppleAvail] = useState(false);

  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    isAppleAuthAvailable().then(setAppleAvail);
    opacity.value    = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const validate = (): string | null => {
    if (!name.trim())                        return 'Please enter your name.';
    if (!email.includes('@'))               return 'Please enter a valid email.';
    if (password.length < PASSWORD_MIN)     return `Password must be at least ${PASSWORD_MIN} characters.`;
    return null;
  };

  const handleEmailSignUp = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setSubmitting(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      // _layout.tsx onAuthStateChanged handles navigation → onboarding
    } catch (e: any) {
      console.error('[signup] email sign-up failed:', e.code, e.message, e);
      setError(getFriendlyError(e.code));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') {
        setError('Google sign-up failed. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppleSignUp = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-up failed. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const passwordStrength = (): { label: string; color: string; width: string } => {
    const len = password.length;
    if (len === 0) return { label: '', color: 'transparent', width: '0%' };
    if (len < 8)   return { label: 'Weak',   color: colors.coral, width: '33%' };
    if (len < 12)  return { label: 'Good',   color: colors.gold,  width: '66%' };
    return              { label: 'Strong', color: colors.green, width: '100%' };
  };

  const strength = passwordStrength();

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
          {/* Back */}
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
              <Text style={styles.title}>CREATE YOUR{'\n'}ACCOUNT.</Text>
              <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
                Free forever. Upgrade when you're ready.
              </Text>
            </View>

            {/* Tier preview strip */}
            <View style={styles.tierStrip}>
              <View style={[styles.tierPill, { borderColor: colors.tierRookie }]}>
                <Text variant="labelSmall" color={colors.tierRookie}>FREE</Text>
                <Text variant="caption" color={colors.textTertiary}>Rookie</Text>
              </View>
              <View style={styles.tierArrow}>
                <Text variant="caption" color={colors.textTertiary}>→</Text>
              </View>
              <View style={[styles.tierPill, { borderColor: colors.tierStarter }]}>
                <Text variant="labelSmall" color={colors.tierStarter}>$6.99/mo</Text>
                <Text variant="caption" color={colors.textTertiary}>Starter</Text>
              </View>
              <View style={styles.tierArrow}>
                <Text variant="caption" color={colors.textTertiary}>→</Text>
              </View>
              <View style={[styles.tierPill, { borderColor: colors.tierGM }]}>
                <Text variant="labelSmall" color={colors.tierGM}>$12.99/mo</Text>
                <Text variant="caption" color={colors.textTertiary}>GM</Text>
              </View>
            </View>

            {/* Social auth */}
            <View style={styles.socialSection}>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignUp}
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
                or sign up with email
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Form */}
            <View style={styles.form}>
              <AuthInput
                label="Your Name"
                value={name}
                onChangeText={setName}
                placeholder="First and last name"
                autoCapitalize="words"
                isFocused={focused === 'name'}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                editable={!isSubmitting}
              />
              <AuthInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                isFocused={focused === 'email'}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                editable={!isSubmitting}
              />

              {/* Password with strength meter */}
              <View>
                <AuthInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  secureTextEntry
                  isFocused={focused === 'password'}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  editable={!isSubmitting}
                />
                {password.length > 0 && (
                  <View style={styles.strengthWrap}>
                    <View style={styles.strengthTrack}>
                      <View style={[styles.strengthFill, {
                        width: strength.width as any,
                        backgroundColor: strength.color,
                      }]} />
                    </View>
                    <Text variant="labelSmall" color={strength.color}>
                      {strength.label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Error */}
              {!!error && (
                <View style={styles.errorWrap}>
                  <Text variant="bodySmall" color={colors.coral}>{error}</Text>
                </View>
              )}

              <Button
                label="Create Free Account"
                variant="primary"
                onPress={handleEmailSignUp}
                loading={isSubmitting}
                style={styles.submitBtn}
              />

              <Text
                variant="caption"
                color={colors.textTertiary}
                align="center"
                style={styles.terms}
              >
                By creating an account you agree to our Terms of Service and Privacy Policy.
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text variant="body" color={colors.textSecondary}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
                <Text variant="bodyMedium" color={colors.green}>Sign in</Text>
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
    case 'auth/email-already-in-use': return 'That email is already registered. Try signing in.';
    case 'auth/weak-password':        return 'Password is too weak. Use at least 8 characters.';
    case 'auth/invalid-email':        return 'Please enter a valid email address.';
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

  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    fontSize:    40,
    lineHeight:  42,
    color:       colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
  },

  // Tier preview
  tierStrip: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom:    spacing.xl,
    gap:             spacing.xs,
  },
  tierPill: {
    alignItems:      'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius:    radius.sm,
    borderWidth:     1,
    gap:             1,
  },
  tierArrow: {
    paddingHorizontal: spacing.xs,
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
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.sm,
    backgroundColor: colors.surface,
    borderWidth:     1,
    borderColor:     colors.border,
    borderRadius:    radius.lg,
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
  dividerText: { flexShrink: 1 },

  // Form
  form: {
    gap: spacing.base,
    marginBottom: spacing['2xl'],
  },
  strengthWrap: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    marginTop:     spacing.xs,
    paddingHorizontal: 2,
  },
  strengthTrack: {
    flex:            1,
    height:          3,
    backgroundColor: colors.border,
    borderRadius:    2,
    overflow:        'hidden',
  },
  strengthFill: {
    height:       3,
    borderRadius: 2,
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
  terms: {
    lineHeight: 16,
  },

  // Footer
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
  },
});

const inputStyles = StyleSheet.create({
  wrap:  { gap: spacing.xs },
  label: { letterSpacing: 0.8 },
  input: {
    backgroundColor:   colors.surface,
    borderWidth:       1.5,
    borderColor:       colors.border,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.base,
    paddingVertical:   spacing.md,
    ...typography.body,
    color:             colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.green,
  },
});
