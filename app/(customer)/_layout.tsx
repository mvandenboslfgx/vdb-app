import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState, PremiumTabIcon } from '@/design-system';
import { premiumTabBarOptions } from '@/navigation/premiumTabBar';
import { useAuth } from '@/providers/AuthProvider';

export default function CustomerLayout() {
  const { t } = useTranslation('common');
  const { loading, session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return <LoadingState />;
  if (!session && !profile) return <Redirect href="/(public)" />;

  return (
    <Tabs screenOptions={premiumTabBarOptions(insets)}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarButtonTestID: 'tab-customer-home',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'home-variant' : 'home-variant-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: t('tabs.projects'),
          headerShown: false,
          tabBarButtonTestID: 'tab-customer-projects',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon name={focused ? 'folder' : 'folder-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('tabs.messages'),
          headerShown: false,
          tabBarButtonTestID: 'tab-customer-messages',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'message-text' : 'message-text-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          headerShown: false,
          tabBarButtonTestID: 'tab-customer-more',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline'}
              focused={focused}
            />
          ),
        }}
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
