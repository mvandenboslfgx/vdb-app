import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function AdminTicketsLayout() {
  const { t } = useTranslation('support');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen name="index" options={{ ...stackIndexHiddenHeader, title: t('tickets') }} />
      <Stack.Screen name="[id]" options={{ title: t('detail.title') }} />
    </Stack>
  );
}
