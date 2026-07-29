import {
  FUTURE_OWNER_ZAKELIJK_VALIDATION,
  PARTNER_TYPE_MODEL_STATUS,
  normalizeOptionalPartnerBusinessFields,
  partnerApplicationSchema,
} from '@/validation/partner';
import { canAccessPartnerArea, isPartner, isPartnerPending } from '@/security/roles';
import { BACKEND_CONTRACT } from '@/config/backendContract';
import { mapAdminDirectoryPage } from '@/api/contract/adminRc4Mappers';

const PARTNER_TITLE_KEYS = ['display_name', 'company_name', 'code', 'id'];

function validBase(overrides: Record<string, unknown> = {}) {
  return {
    partnerType: 'INDIVIDUAL' as const,
    contactName: 'Jan Jansen',
    email: 'jan@example.test',
    phone: '0612345678',
    motivation: 'Ik wil graag partner worden van VDB Digital.',
    acceptPartnerTerms: true as const,
    ...overrides,
  };
}

describe('temporary PARTICULIER/ZAKELIJK intake compatibility', () => {
  it('keeps S6 status string until full Owner KYC/legal path ships', () => {
    expect(PARTNER_TYPE_MODEL_STATUS).toContain('DEPENDENCY RECORDED');
  });

  it('accepts INDIVIDUAL application without companyName', () => {
    expect(
      partnerApplicationSchema.safeParse(validBase({ companyName: '', kvkNumber: '' })).success,
    ).toBe(true);
  });

  it('accepts INDIVIDUAL without KVK', () => {
    expect(partnerApplicationSchema.safeParse(validBase({ kvkNumber: '' })).success).toBe(true);
  });

  it('normalizes empty company/KVK to null without inferring type', () => {
    expect(normalizeOptionalPartnerBusinessFields({ companyName: '  ', kvkNumber: '' })).toEqual({
      companyName: null,
      kvkNumber: null,
    });
  });

  it('keeps apply result pending — no active partner capabilities from intake alone', () => {
    expect(isPartner(['partner_pending'])).toBe(false);
    expect(isPartnerPending(['partner_pending'])).toBe(true);
    expect(canAccessPartnerArea(['partner_pending'])).toBe(false);
  });

  it('admin directory prefers display_name over company_name and survives empty company', () => {
    const page = mapAdminDirectoryPage(
      {
        schema_version: BACKEND_CONTRACT.schemaVersion,
        next_cursor: null,
        items: [
          { id: 'p1', display_name: 'Anna Partner', company_name: null, status: 'PENDING' },
          { id: 'p2', display_name: '', company_name: '', code: 'PR-2', status: 'ACTIVE' },
          { id: 'p3', company_name: null, status: 'PENDING' },
        ],
      },
      PARTNER_TITLE_KEYS,
    );
    expect(page.items[0]?.title).toBe('Anna Partner');
    expect(page.items[1]?.title).toBe('PR-2');
    expect(page.items[2]?.title).toBe('p3');
  });

  it('registers BUSINESS validation rules', () => {
    expect(FUTURE_OWNER_ZAKELIJK_VALIDATION.requireCompanyName).toBe(true);
    expect(
      partnerApplicationSchema.safeParse(
        validBase({ partnerType: 'BUSINESS', companyName: 'Acme', kvkNumber: '12345678' }),
      ).success,
    ).toBe(true);
  });

  it('does not invent partner type from company/KVK presence', () => {
    const withCompany = normalizeOptionalPartnerBusinessFields({ companyName: 'BV' });
    expect('type' in withCompany).toBe(false);
  });
});
