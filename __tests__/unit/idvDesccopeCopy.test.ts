import nlPartners from '@/i18n/locales/nl/partners.json';
import enPartners from '@/i18n/locales/en/partners.json';
import nlAdmin from '@/i18n/locales/nl/admin.json';
import enAdmin from '@/i18n/locales/en/admin.json';
import { ACTIVATION_BLOCK_COPY } from '@/api/contract/adminRc5Mappers';
import { adminReviewStatusTitle } from '@/lib/partnerAdminReview';

const FORBIDDEN =
  /KYC-provider|geen KYC|no KYC provider|Identiteitsverificatie is nog niet beschikbaar|Identity verification is not available yet/i;

describe('Mobile v1 IDV de-scope copy', () => {
  it('partner apply copy uses administrative review wording (NL+EN)', () => {
    expect(nlPartners.apply.kycUnavailable).toMatch(/administratief beoordeeld/i);
    expect(nlPartners.apply.kycUnavailable).toMatch(/geen automatische ID-check/i);
    expect(enPartners.apply.kycUnavailable).toMatch(/administratively/i);
    expect(enPartners.apply.kycUnavailable).toMatch(/no automatic ID check/i);
    expect(nlPartners.apply.kycUnavailable).not.toMatch(FORBIDDEN);
    expect(enPartners.apply.kycUnavailable).not.toMatch(FORBIDDEN);
  });

  it('admin detail copy matches administrative review (NL+EN)', () => {
    expect(nlAdmin.detail.kycUnavailable).toMatch(/administratief beoordeeld/i);
    expect(enAdmin.detail.kycUnavailable).toMatch(/administratively/i);
    expect(nlAdmin.detail.kycUnavailable).not.toMatch(FORBIDDEN);
    expect(enAdmin.detail.kycUnavailable).not.toMatch(FORBIDDEN);
  });

  it('IDENTITY_NOT_VERIFIED block label is not KYC-provider language', () => {
    expect(ACTIVATION_BLOCK_COPY.IDENTITY_NOT_VERIFIED).toMatch(
      /Administratieve partnercontrole/i,
    );
    expect(ACTIVATION_BLOCK_COPY.IDENTITY_NOT_VERIFIED).not.toMatch(/KYC/i);
  });

  it('admin review status titles align with Partners web (NL)', () => {
    expect(adminReviewStatusTitle('VERIFIED', 'nl')).toMatch(/afgerond/i);
    expect(adminReviewStatusTitle('NOT_STARTED', 'nl')).toMatch(/niet gestart/i);
    expect(adminReviewStatusTitle('MANUAL_REVIEW', 'nl')).toMatch(/Aanpassing/i);
  });
});
