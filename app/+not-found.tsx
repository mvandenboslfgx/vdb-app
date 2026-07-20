import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/design-system';
import { spacing } from '@/theme';

export default function NotFoundScreen() {
  const { t } = useTranslation('errors');
  const { t: tc } = useTranslation('common');

  return (
    <>
      <Stack.Screen options={{ title: t('notFound'), headerShown: true }} />
      <Screen>
        <View style={styles.container}>
          <Text variant="title">{t('notFound')}</Text>
          <Text variant="body" color="textSecondary" style={styles.body}>
            {t('notFoundBody')}
          </Text>
          <Link href="/" asChild>
            <Button title={tc('appName')} variant="gold" />
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: spacing.md },
  body: { marginBottom: spacing.lg },
});
