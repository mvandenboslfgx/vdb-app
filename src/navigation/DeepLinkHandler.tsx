import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { deepLinkToHref, parseAppDeepLink } from '@/lib/linking';

/**
 * Routes whitelisted deep links into Expo Router.
 * Safe for cold start + runtime URL events. Ignores unknown hosts/paths.
 */
export function DeepLinkHandler() {
  const router = useRouter();
  const handledInitial = useRef(false);

  useEffect(() => {
    function navigate(url: string | null | undefined) {
      if (!url) return;
      const href = deepLinkToHref(parseAppDeepLink(url));
      if (!href) return;
      router.push(href as `/`);
    }

    if (!handledInitial.current) {
      handledInitial.current = true;
      void Linking.getInitialURL().then(navigate);
    }

    const sub = Linking.addEventListener('url', ({ url }) => navigate(url));
    return () => sub.remove();
  }, [router]);

  return null;
}
