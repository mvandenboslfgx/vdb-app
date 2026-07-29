import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';
import { forgotPasswordSchema } from '@/validation/auth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(te('validation.emailInvalid'));
      return;
    }
    setLoading(true);
    try {
      // Real Supabase call — never resolved locally without hitting the server.
      await requestPasswordReset(parsed.data.email);
      setSent(true);
    } catch {
      setError(te('generic'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Screen testID="screen-auth-forgot-password-sent">
        <Text variant="title">{t('forgot.successTitle')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('forgot.successBody')}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Button
            testID="btn-forgot-back-to-login"
            title={t('forgot.backToLogin')}
            variant="gold"
            fullWidth
          />
        </Link>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="screen-auth-forgot-password">
      <Text variant="title">{t('forgot.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('forgot.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput
          testID="input-forgot-email"
          label={t('login.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        {error ? (
          <Text variant="caption" color="error" testID="forgot-error">
            {error}
          </Text>
        ) : null}
        <Button
          testID="btn-forgot-submit"
          title={t('forgot.submit')}
          onPress={() => void onSubmit()}
          loading={loading}
          variant="gold"
          fullWidth
        />
        <Link href="/(auth)/login">
          <Text variant="label" color="champagneGold" align="center">
            {t('forgot.backToLogin')}
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
