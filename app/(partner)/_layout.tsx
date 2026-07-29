import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState, PremiumTabIcon } from '@/design-system';
import { premiumTabBarOptions } from '@/navigation/premiumTabBar';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessPartnerArea } from '@/security/roles';

export default function PartnerLayout() {
  const { t } = useTranslation('common');
  const { t: tcom } = useTranslation('commissions');
  const { loading, roles, session, profile } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return <LoadingState />;
  if (!session && !profile) return <Redirect href="/(public)" />;
  if (!canAccessPartnerArea(roles)) return <Redirect href="/(customer)" />;

  return (
    <Tabs screenOptions={premiumTabBarOptions(insets)}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarButtonTestID: 'tab-partner-home',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'home-variant' : 'home-variant-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: t('tabs.leads'),
          headerShown: false,
          tabBarButtonTestID: 'tab-partner-leads',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'account-multiple' : 'account-multiple-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: t('tabs.commissions'),
          headerShown: false,
          tabBarButtonTestID: 'tab-partner-commissions',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon name={focused ? 'cash-multiple' : 'cash'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketing"
        options={{
          title: t('tabs.marketing'),
          headerShown: false,
          tabBarButtonTestID: 'tab-partner-marketing',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon name={focused ? 'bullhorn' : 'bullhorn-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.more'),
          headerShown: false,
          tabBarButtonTestID: 'tab-partner-more',
          tabBarIcon: ({ focused }) => (
            <PremiumTabIcon
              name={focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline'}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="payouts"
        options={{ href: null, headerShown: false, title: tcom('payouts.title') }}
      />
      <Tabs.Screen
        name="support"
        options={{ href: null, headerShown: false, title: t('tabs.tickets') }}
      />
    </Tabs>
  );
}
