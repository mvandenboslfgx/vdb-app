import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { createTicket } from '@/api/repositories/supportRepository';
import { Button, ErrorState, LoadingState, Screen, Text, TextInput } from '@/design-system';
import { usePartnerTicketGate } from '@/features/support/usePartnerTicketGate';
import { spacing } from '@/theme';

export default function PartnerNewSupportTicketScreen() {
  const { t } = useTranslation('support');
  const { t: tp } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const gate = usePartnerTicketGate();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [validationError, setValidationError] = useState(false);

  async function onSubmit() {
    if (loading || !gate.access.canCreate) return;
    if (!subject.trim() || !description.trim()) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setLoading(true);
    setError(false);
    try {
      const ticket = await createTicket({
        subject,
        category: category as 'billing' | 'project' | 'technical' | 'account' | 'other',
        description,
        priority: 'medium',
      });
      router.replace(`/(partner)/support/${ticket.id}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (gate.loading) return <LoadingState label={t('loading')} />;

  if (!gate.access.canCreate) {
    return (
      <ErrorState
        title={tp('supportDenied')}
        retryLabel={tc('retry')}
        onRetry={() => gate.reload()}
      />
    );
  }

  return (
    <Screen scroll testID="screen-partner-support-new">
      <Text variant="title">{t('newTicket')}</Text>
      {error ? (
        <Text testID="partner-support-error-message" variant="body" color="error">
          {t('error')}
        </Text>
      ) : null}
      {validationError ? (
        <Text testID="partner-support-validation-error" variant="body" color="error">
          {t('descriptionPlaceholder')}
        </Text>
      ) : null}
      <View style={styles.form}>
        <TextInput
          testID="input-partner-support-subject"
          label={t('subject')}
          value={subject}
          onChangeText={setSubject}
        />
        <TextInput
          testID="input-partner-support-category"
          label={t('category')}
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          testID="input-partner-support-description"
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline={false}
        />
        <Button
          testID="btn-partner-support-submit"
          title={t('submit')}
          variant="gold"
          fullWidth
          loading={loading}
          disabled={loading || !subject.trim() || !description.trim()}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.xl, gap: spacing.lg },
});
