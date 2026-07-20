import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';
import { resetPasswordSchema } from '@/validation/auth';

export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const { updatePassword } = useAuth();
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
      const msg = parsed.error.issues[0]?.message ?? 'errors.generic';
      setError(msg.startsWith('errors.') ? te(msg.replace(/^errors\./, '') as 'generic') : msg);
      return;
    }
    setLoading(true);
    try {
      // Real Supabase call — the recovery session comes from the deep link.
      await updatePassword(parsed.data.password);
      setDone(true);
    } catch {
      setError(te('generic'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen testID="screen-auth-reset-password-done">
        <Text variant="title">{t('reset.title')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('reset.success')}
        </Text>
        <Button
          testID="btn-reset-go-to-login"
          title={t('login.submit')}
          variant="gold"
          fullWidth
          onPress={() => router.replace('/(auth)/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="screen-auth-reset-password">
      <Text variant="title">{t('reset.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('reset.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput
          testID="input-reset-password"
          label={t('register.password')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          testID="input-reset-confirm-password"
          label={t('register.confirmPassword')}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error ? (
          <Text variant="caption" color="error" testID="reset-error">
            {error}
          </Text>
        ) : null}
        <Button
          testID="btn-reset-submit"
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
