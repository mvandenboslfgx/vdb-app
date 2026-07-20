import { deepLinkToHref, parseAppDeepLink } from '@/lib/linking';

describe('linking', () => {
  it('parses allowed https deep links', () => {
    const target = parseAppDeepLink('https://vdbdigital.nl/app/projects/abc');
    expect(target).toEqual({ type: 'project', id: 'abc' });
    expect(deepLinkToHref(target)).toBe('/(customer)/projects/abc');
  });

  it('rejects unknown hosts', () => {
    const target = parseAppDeepLink('https://evil.example/app/login');
    expect(target.type).toBe('unknown');
  });

  it('parses checkout return deep links', () => {
    const target = parseAppDeepLink(
      'https://vdbdigital.nl/app/payments/return?invoiceId=inv-1&paymentId=pay-1',
    );
    expect(target).toEqual({
      type: 'paymentReturn',
      invoiceId: 'inv-1',
      paymentId: 'pay-1',
    });
    expect(deepLinkToHref(target)).toBe('/(customer)/invoices/inv-1');
  });
});
