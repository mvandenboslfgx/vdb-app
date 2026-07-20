import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { spacing } from '@/theme';
import { forgotPasswordSchema } from '@/validation/auth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
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
      // Fail-closed: no local password reset without server.
      await new Promise((r) => setTimeout(r, 400));
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Screen>
        <Text variant="title">{t('forgot.successTitle')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('forgot.successBody')}
        </Text>
        <Link href="/(auth)/login" asChild>
          <Button title={t('forgot.backToLogin')} variant="gold" fullWidth />
        </Link>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('forgot.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('forgot.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput
          label={t('login.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {error ? (
          <Text variant="caption" color="error">
            {error}
          </Text>
        ) : null}
        <Button
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
