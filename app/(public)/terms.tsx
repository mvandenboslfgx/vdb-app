import * as WebBrowser from 'expo-web-browser';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/design-system';
import { clientEnv } from '@/config/env';
import { spacing } from '@/theme';

export default function TermsScreen() {
  const { t } = useTranslation('public');

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {t('terms.title')}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.body}>
        {t('terms.body')}
      </Text>
      <Button
        title={t('welcome.openTerms')}
        variant="gold"
        onPress={() => void WebBrowser.openBrowserAsync(`${clientEnv.siteUrl}/terms`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  body: { marginBottom: spacing.xl },
});
