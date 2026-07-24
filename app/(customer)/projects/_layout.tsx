import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

export default function ProjectsLayout() {
  const { t } = useTranslation('projects');

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundPrimary },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('title'), headerShown: false }} />
      <Stack.Screen name="request" options={{ title: t('request.title') }} />
      <Stack.Screen name="[id]" options={{ title: t('detail') }} />
    </Stack>
  );
}
