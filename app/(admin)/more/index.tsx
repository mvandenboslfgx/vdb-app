import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ListRow, Screen, Text } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function AdminMoreScreen() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { t: ta } = useTranslation('auth');
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <Screen scroll>
      <Text variant="title">{t('title')}</Text>
      <ListRow
        title={t('leads.title')}
        onPress={() => router.push('/(admin)/leads')}
      />
      <ListRow
        title={tc('switchArea.customer')}
        onPress={() => router.replace('/(customer)')}
      />
      <ListRow
        title={tc('switchArea.partner')}
        onPress={() => router.replace('/(partner)')}
      />
      <Button
        title={ta('signOut')}
        variant="danger"
        style={styles.signOut}
        onPress={() => {
          void signOut().then(() => router.replace('/(public)'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  signOut: { marginTop: spacing.xl },
});