import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingState } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

export default function CustomerLayout() {
  const { t } = useTranslation('common');
  const { loading, session, profile } = useAuth();

  if (loading) return <LoadingState />;
  if (!session && !profile) return <Redirect href="/(public)" />;

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
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), headerTitle: t('appName'), tabBarButtonTestID: 'tab-customer-home' }}
      />
      <Tabs.Screen
        name="projects"
        options={{ title: t('tabs.projects'), headerShown: false, tabBarButtonTestID: 'tab-customer-projects' }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('tabs.messages'), headerShown: false, tabBarButtonTestID: 'tab-customer-messages' }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: t('tabs.more'), headerShown: false, tabBarButtonTestID: 'tab-customer-more' }}
      />
      <Tabs.Screen name="documents" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="quotes" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="invoices" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="appointments" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="support" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="reviews" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
