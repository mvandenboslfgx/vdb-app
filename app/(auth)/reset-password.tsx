import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { spacing } from '@/theme';
import { resetPasswordSchema } from '@/validation/auth';

export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(te('validation.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <Text variant="title">{t('reset.title')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('reset.success')}
        </Text>
        <Button
          title={t('login.submit')}
          variant="gold"
          fullWidth
          onPress={() => router.replace('/(auth)/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('reset.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('reset.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput
          label={t('register.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          label={t('register.confirmPassword')}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error ? (
          <Text variant="caption" color="error">
            {error}
          </Text>
        ) : null}
        <Button
          title={t('reset.submit')}
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
