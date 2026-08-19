import { Link, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { resolveSignInErrorMessage } from '@/lib/auth/resolveSignInErrorMessage';
import { syncControlledFieldValue } from '@/lib/auth/syncControlledFieldValue';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';
import { loginSchema } from '@/validation/auth';

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const { signIn, isDemoMode } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailDraftRef = useRef('');
  const passwordDraftRef = useRef('');

  const syncEmail = useCallback((value: string) => {
    setEmail((prev) => {
      const next = syncControlledFieldValue(prev, value);
      emailDraftRef.current = next;
      return next;
    });
  }, []);

  const syncPassword = useCallback((value: string) => {
    setPassword((prev) => {
      const next = syncControlledFieldValue(prev, value);
      passwordDraftRef.current = next;
      return next;
    });
  }, []);

  async function onSubmit() {
    setError(null);
    const emailValue = (emailDraftRef.current || email).trim();
    const passwordValue = passwordDraftRef.current || password;
    const parsed = loginSchema.safeParse({ email: emailValue, password: passwordValue });
    if (!parsed.success) {
      setError(te('auth.invalidCredentials'));
      return;
    }
    setLoading(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      router.replace('/');
    } catch (err) {
      setError(resolveSignInErrorMessage(err, te));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll testID="auth-login-screen">
      <Text variant="title">{t('login.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('login.subtitle')}
      </Text>

      <View style={styles.form}>
        <TextInput
          testID="auth-email-input"
          label={t('login.email')}
          placeholder={t('login.emailPlaceholder')}
          autoCapitalize="none"
          keyboardType="email-address"
          // Off for device tests: Samsung Pass / autofill corrupts Maestro-typed credentials.
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          value={email}
          onChangeText={syncEmail}
        />
        <TextInput
          testID="auth-password-input"
          label={t('login.password')}
          placeholder={t('login.passwordPlaceholder')}
          secureTextEntry
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          value={password}
          onChangeText={syncPassword}
        />
        {error ? (
          <Text
            variant="caption"
            color="error"
            testID="auth-error-message"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        ) : null}
        {isDemoMode ? (
          <Text variant="caption" color="textMuted">
            {t('login.demoHint')}
          </Text>
        ) : null}
        <Button
          testID="auth-login-submit"
          title={t('login.submit')}
          onPress={() => void onSubmit()}
          loading={loading}
          variant="gold"
          fullWidth
        />
        <Link href="/(auth)/forgot-password">
          <Text variant="label" color="champagneGold" align="center">
            {t('login.forgotPassword')}
          </Text>
        </Link>
        <Link href="/(auth)/register">
          <Text variant="body" color="textSecondary" align="center">
            {t('login.noAccount')} {t('login.createAccount')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing['2xl'] },
  form: { gap: spacing.lg },
});
