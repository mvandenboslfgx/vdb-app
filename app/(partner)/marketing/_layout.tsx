import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function MarketingLayout() {
  const { t } = useTranslation('partners');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen name="index" options={{ ...stackIndexHiddenHeader, title: t('link') }} />
    </Stack>
  );
}
