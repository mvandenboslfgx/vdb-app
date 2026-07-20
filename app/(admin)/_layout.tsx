import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessAdminArea } from '@/security/roles';
import { colors } from '@/theme';

export default function AdminLayout() {
  const { t } = useTranslation('common');
  const { loading, roles, session, profile } = useAuth();

  if (loading) return <LoadingState />;
  if (!session && !profile) return <Redirect href="/(public)" />;
  if (!canAccessAdminArea(roles)) return <Redirect href="/(customer)" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#050505' },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#050505',
          borderTopColor: colors.borderSubtle,
        },
        tabBarActiveTintColor: '#C7A66A',
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: '#050505' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="approvals" options={{ title: t('tabs.approvals') }} />
      <Tabs.Screen name="tickets" options={{ title: t('tabs.tickets') }} />
      <Tabs.Screen name="finance" options={{ title: t('tabs.finance') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more') }} />
    </Tabs>
  );
}
