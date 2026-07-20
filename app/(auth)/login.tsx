import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { resolveHomeRoute } from '@/security/roles';
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

  async function onSubmit() {
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(te('auth.invalidCredentials'));
      return;
    }
    setLoading(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      router.replace(resolveHomeRoute(['customer']));
    } catch {
      setError(te('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll testID="screen-auth-login">
      <Text variant="title">{t('login.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('login.subtitle')}
      </Text>

      <View style={styles.form}>
        <TextInput
          testID="input-login-email"
          label={t('login.email')}
          placeholder={t('login.emailPlaceholder')}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="input-login-password"
          label={t('login.password')}
          placeholder={t('login.passwordPlaceholder')}
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />
        {error ? (
          <Text variant="caption" color="error" testID="login-error">
            {error}
          </Text>
        ) : null}
        {isDemoMode ? (
          <Text variant="caption" color="textMuted">
            {t('login.demoHint')}
          </Text>
        ) : null}
        <Button
          testID="btn-login-submit"
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
