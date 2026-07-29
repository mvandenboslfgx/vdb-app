import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function DocumentsLayout() {
  const { t } = useTranslation('documents');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen name="index" options={{ ...stackIndexHiddenHeader, title: t('title') }} />
      <Stack.Screen name="upload" options={{ title: t('uploadForm.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('title') }} />
    </Stack>
  );
}
