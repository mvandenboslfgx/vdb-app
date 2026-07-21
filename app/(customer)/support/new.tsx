import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { createTicket } from '@/api/repositories/supportRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { spacing } from '@/theme';

export default function NewSupportTicketScreen() {
  const { t } = useTranslation('support');
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [validationError, setValidationError] = useState(false);

  async function onSubmit() {
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
      router.replace(`/(customer)/support/${ticket.id}`);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll testID="screen-support-new">
      <Text variant="title">{t('newTicket')}</Text>
      {error ? (
        <Text testID="support-error-message" variant="body" color="error">
          {t('error')}
        </Text>
      ) : null}
      {validationError ? (
        <Text testID="support-validation-error" variant="body" color="error">
          {t('descriptionPlaceholder')}
        </Text>
      ) : null}
      <View style={styles.form}>
        <TextInput testID="input-support-subject" label={t('subject')} value={subject} onChangeText={setSubject} />
        <TextInput testID="input-support-category" label={t('category')} value={category} onChangeText={setCategory} />
        <TextInput
          testID="input-support-description"
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          // Single-line: Maestro IME reliably syncs onChangeText (multiline controlled fields stay empty).
          multiline={false}
        />
        <Button
          testID="btn-support-submit"
          title={t('submit')}
          variant="gold"
          fullWidth
          loading={loading}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.xl, gap: spacing.lg },
  area: { minHeight: 120, textAlignVertical: 'top' },
});
