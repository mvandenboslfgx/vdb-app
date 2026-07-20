import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { requestProject } from '@/api/repositories/projectsRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { spacing } from '@/theme';

export default function ProjectRequestScreen() {
  const { t } = useTranslation('projects');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    try {
      await requestProject({ title, description });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <Text variant="title">{t('request.success')}</Text>
        <Button
          title={t('title')}
          variant="gold"
          style={styles.cta}
          onPress={() => router.replace('/(customer)/projects')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('request.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('request.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput
          label={t('request.projectTitle')}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          label={t('request.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          style={styles.area}
        />
        <Button
          title={t('request.submit')}
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
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  area: { minHeight: 120, textAlignVertical: 'top' },
  cta: { marginTop: spacing.xl },
});
