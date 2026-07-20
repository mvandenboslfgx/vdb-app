import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { accountRepository, type AccountDeletionRequest } from '@/api/repositories/accountRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { DomainError } from '@/lib/errors';
import { spacing } from '@/theme';

export default function AccountDeletionScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);

  const confirmWord = t('accountDeletion.confirmWord');
  const canSubmit = confirm.trim().toUpperCase() === confirmWord;

  async function onSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      // Real repository call — never a fake-only local logout. The account
      // stays intact until the backend actually processes the request.
      const result = await accountRepository.requestDeletion();
      setRequest(result);
    } catch (err) {
      setError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setLoading(false);
    }
  }

  if (request) {
    return (
      <Screen testID="screen-account-deletion-status">
        <Text variant="title">{t('accountDeletion.success')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('accountDeletion.statusSubmitted')}
        </Text>
        <Text variant="caption" color="textMuted" testID="account-deletion-request-id">
          {request.id} · {request.status}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll testID="screen-account-deletion">
      <Text variant="title">{t('accountDeletion.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('accountDeletion.subtitle')}
      </Text>
      <Text variant="caption" color="warning" style={styles.warn}>
        {t('accountDeletion.warning')}
      </Text>

      <View style={styles.consequences}>
        <Text variant="label" color="textSecondary">
          {t('accountDeletion.consequencesTitle')}
        </Text>
        <Text variant="caption" color="textMuted">
          • {t('accountDeletion.consequence1')}
        </Text>
        <Text variant="caption" color="textMuted">
          • {t('accountDeletion.consequence2')}
        </Text>
        <Text variant="caption" color="textMuted">
          • {t('accountDeletion.consequence3')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          testID="input-account-deletion-confirm"
          label={t('accountDeletion.confirmLabel')}
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="characters"
        />
        {error ? (
          <Text variant="caption" color="error" testID="account-deletion-error">
            {error}
          </Text>
        ) : null}
        <Button
          testID="btn-account-deletion-submit"
          title={loading ? t('accountDeletion.submitting') : t('accountDeletion.submit')}
          variant="danger"
          fullWidth
          loading={loading}
          disabled={!canSubmit}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.md },
  warn: { marginBottom: spacing.lg },
  consequences: { gap: spacing.xs, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
});
