import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState, PremiumTabIcon } from '@/design-system';
import { premiumTabBarOptions } from '@/navigation/premiumTabBar';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessAdminArea } from '@/security/roles';

export default function AdminLayout() {
  const { t } = useTranslation('common');
  const { loading, roles, session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return <LoadingState />;
  if (!session && !profile) return <Redirect href="/(public)" />;
  if (!canAccessAdminArea(roles)) return <Redirect href="/(customer)" />;

  return (
    <Tabs screenOptions={premiumTabBarOptions(insets)}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarButtonTestID: 'tab-admin-home',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'home-variant' : 'home-variant-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: t('tabs.approvals'),
          headerShown: false,
          tabBarButtonTestID: 'tab-admin-approvals',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'check-decagram' : 'check-decagram-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: t('tabs.tickets'),
          headerShown: false,
          tabBarButtonTestID: 'tab-admin-tickets',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'headset' : 'headphones'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: t('tabs.finance'),
          headerShown: false,
          tabBarButtonTestID: 'tab-admin-finance',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'finance' : 'chart-line'}
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
          tabBarButtonTestID: 'tab-admin-more',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline'}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
