import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function PayoutsLayout() {
  const { t } = useTranslation('commissions');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ ...stackIndexHiddenHeader, title: t('payouts.title') }}
      />
    </Stack>
  );
}
