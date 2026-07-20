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

  it('parses custom scheme', () => {
    const target = parseAppDeepLink('vdbdigital://login');
    expect(target).toEqual({ type: 'login' });
    expect(deepLinkToHref(target)).toBe('/(auth)/login');
  });
});
