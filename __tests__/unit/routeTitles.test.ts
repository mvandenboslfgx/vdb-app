import { FORBIDDEN_ROUTE_TITLES, isForbiddenRouteTitle } from '@/i18n/translateEnum';

/**
 * Regression: Expo Router must never surface filesystem route segments as titles.
 * Layouts under app/(partner|admin|customer) declare explicit titles / headerShown:false.
 */
describe('route title regression', () => {
  it('forbids known route-segment titles', () => {
    for (const title of FORBIDDEN_ROUTE_TITLES) {
      expect(isForbiddenRouteTitle(title)).toBe(true);
    }
  });

  it('allows human titles', () => {
    expect(isForbiddenRouteTitle('Leads')).toBe(false);
    expect(isForbiddenRouteTitle('Uitbetalingen')).toBe(false);
    expect(isForbiddenRouteTitle('Ticketdetail')).toBe(false);
  });
});
