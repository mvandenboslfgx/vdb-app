import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function AppointmentsLayout() {
  const { t } = useTranslation('customer');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ ...stackIndexHiddenHeader, title: t('appointments.title') }}
      />
      <Stack.Screen name="book" options={{ title: t('appointments.book.title') }} />
    </Stack>
  );
}
