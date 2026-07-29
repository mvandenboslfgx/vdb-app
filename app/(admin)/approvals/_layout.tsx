import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { premiumStackScreenOptions, stackIndexHiddenHeader } from '@/navigation/premiumStack';

export default function ApprovalsLayout() {
  const { t } = useTranslation('common');

  return (
    <Stack screenOptions={premiumStackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{ ...stackIndexHiddenHeader, title: t('tabs.approvals') }}
      />
    </Stack>
  );
}
