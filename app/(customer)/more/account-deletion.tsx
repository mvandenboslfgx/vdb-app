import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';

export default function AccountDeletionScreen() {
  const { t } = useTranslation('auth');
  const router = useRouter();
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (confirm !== t('accountDeletion.confirmWord')) return;
    setLoading(true);
    try {
      // Server stub — never hard-deletes locally without edge function.
      await new Promise((r) => setTimeout(r, 400));
      setDone(true);
      await signOut();
      router.replace('/(public)');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <Text variant="title">{t('accountDeletion.success')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('accountDeletion.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('accountDeletion.subtitle')}
      </Text>
      <Text variant="caption" color="warning" style={styles.warn}>
        {t('accountDeletion.warning')}
      </Text>
      <View style={styles.form}>
        <TextInput
          label={t('accountDeletion.confirmLabel')}
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="characters"
        />
        <Button
          title={t('accountDeletion.submit')}
          variant="danger"
          fullWidth
          loading={loading}
          disabled={confirm !== t('accountDeletion.confirmWord')}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.md },
  warn: { marginBottom: spacing.xl },
  form: { gap: spacing.lg },
});
