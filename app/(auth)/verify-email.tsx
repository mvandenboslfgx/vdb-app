import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resendVerification } = useAuth();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onResend() {
    setStatus('sending');
    try {
      await resendVerification(email);
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Screen testID="screen-auth-verify-email">
      <Text variant="title">{t('verify.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('verify.subtitle')}
      </Text>
      <Text variant="body" color="textMuted" style={styles.body}>
        {t('register.successBody')}
      </Text>

      {status === 'sent' ? (
        <Text
          variant="caption"
          color="success"
          testID="verify-resend-success"
          style={styles.status}
        >
          {t('verify.resendSuccess')}
        </Text>
      ) : null}
      {status === 'error' ? (
        <Text variant="caption" color="error" testID="verify-resend-error" style={styles.status}>
          {te('generic')}
        </Text>
      ) : null}

      <Button
        testID="btn-verify-resend"
        title={t('verify.resend')}
        variant="secondary"
        fullWidth
        loading={status === 'sending'}
        onPress={() => void onResend()}
        style={styles.resend}
      />
      <Link href="/(auth)/login" asChild>
        <Button
          testID="btn-verify-back-to-login"
          title={t('register.signIn')}
          variant="gold"
          fullWidth
        />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  body: { marginBottom: spacing.xl },
  status: { marginBottom: spacing.md },
  resend: { marginBottom: spacing.md },
});
