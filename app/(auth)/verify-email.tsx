import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/design-system';
import { spacing } from '@/theme';

export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');

  return (
    <Screen>
      <Text variant="title">{t('verify.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('verify.subtitle')}
      </Text>
      <Text variant="body" color="textMuted" style={styles.body}>
        {t('register.successBody')}
      </Text>
      <Link href="/(auth)/login" asChild>
        <Button title={t('register.signIn')} variant="gold" fullWidth />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.lg },
  body: { marginBottom: spacing['2xl'] },
});
