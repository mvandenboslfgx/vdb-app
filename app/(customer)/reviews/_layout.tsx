import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions } from '@/navigation/premiumStack';

export default function ReviewsLayout() {
  const { t } = useTranslation('app');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen name="new" options={{ title: t('customer.reviews.title') }} />
    </Stack>
  );
}
