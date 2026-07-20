import { Redirect } from 'expo-router';

import { LoadingState } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { resolveHomeRoute } from '@/security/roles';

export default function Index() {
  const { loading, session, profile, roles } = useAuth();

  if (loading) {
    return <LoadingState />;
  }

  const authenticated = Boolean(session) || Boolean(profile);
  if (!authenticated) {
    return <Redirect href="/(public)" />;
  }

  return <Redirect href={resolveHomeRoute(roles)} />;
}
