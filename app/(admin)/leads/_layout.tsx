import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function AdminLeadsLayout() {
  const { t } = useTranslation('admin');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen name="index" options={{ ...stackIndexHiddenHeader, title: t('leads.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('leads.title') }} />
    </Stack>
  );
}
