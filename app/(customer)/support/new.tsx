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
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (!subject.trim() || !description.trim()) return;
    setLoading(true);
    try {
      const ticket = await createTicket({
        subject,
        category: category as 'billing' | 'project' | 'technical' | 'account' | 'other',
        description,
        priority: 'medium',
      });
      setDone(true);
      router.replace(`/(customer)/support/${ticket.id}`);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <Text variant="title">{t('success')}</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('newTicket')}</Text>
      <View style={styles.form}>
        <TextInput label={t('subject')} value={subject} onChangeText={setSubject} />
        <TextInput label={t('category')} value={category} onChangeText={setCategory} />
        <TextInput
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.area}
        />
        <Button
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
