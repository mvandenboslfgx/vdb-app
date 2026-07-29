import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function AdminMoreLayout() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen name="index" options={{ ...stackIndexHiddenHeader, title: tc('tabs.more') }} />
      <Stack.Screen name="diagnostics" options={{ title: t('more.diagnostics') }} />
      <Stack.Screen name="surface/[surface]" options={{ title: t('title') }} />
      <Stack.Screen name="surface/[surface]/[id]" options={{ title: t('title') }} />
    </Stack>
  );
}
