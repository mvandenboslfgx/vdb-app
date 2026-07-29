import { buildPartnerReferralUrl, isValidPartnerLinkUrl } from '@/lib/partnerLink';

describe('partnerLink', () => {
  it('builds canonical https referral URL', () => {
    const result = buildPartnerReferralUrl('NOORDZEE', 'https://vdbdigital.nl');
    expect(result).toEqual({
      ok: true,
      url: 'https://vdbdigital.nl/r/NOORDZEE',
      code: 'NOORDZEE',
    });
  });

  it('fails closed on missing code', () => {
    expect(buildPartnerReferralUrl('', 'https://vdbdigital.nl')).toEqual({
      ok: false,
      reason: 'missing_code',
    });
  });

  it('fails closed on missing base URL', () => {
    expect(buildPartnerReferralUrl('ABC', '')).toEqual({
      ok: false,
      reason: 'missing_base_url',
    });
  });

  it('rejects non-https results', () => {
    expect(buildPartnerReferralUrl('ABC', 'http://vdbdigital.nl').ok).toBe(false);
  });

  it('validates clipboard candidate URLs', () => {
    expect(isValidPartnerLinkUrl('https://vdbdigital.nl/r/ABC')).toBe(true);
    expect(isValidPartnerLinkUrl('')).toBe(false);
    expect(isValidPartnerLinkUrl('not-a-url')).toBe(false);
    expect(isValidPartnerLinkUrl('http://insecure.example/r/X')).toBe(false);
  });
});
