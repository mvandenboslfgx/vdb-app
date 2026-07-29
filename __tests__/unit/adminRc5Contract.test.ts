import { BACKEND_CONTRACT } from '@/config/backendContract';
import {
  mapAdminPartnerDetail,
  mapAdminProductDetail,
  mapSupportTicketRepliesPage,
} from '@/api/contract/adminRc5Mappers';
import { REQUIRED_RC5_DIRECTORY_DETAIL_RPCS } from '@/api/contract/ownerSurfaces';
import { mapLegacyPartnerTypeLabel, partnerApplicationSchema } from '@/validation/partner';

describe('RC5 contract surfaces', () => {
  it('pins rc.6 schema', () => {
    expect(BACKEND_CONTRACT.packageId).toBe('vdb-backend-contract@0.2.0-rc.6');
    expect(BACKEND_CONTRACT.schemaVersion).toBe('2026.07.29.partner-approval-aal2-rc6');
  });

  it('allowlists directory detail RPCs', () => {
    expect(REQUIRED_RC5_DIRECTORY_DETAIL_RPCS.admin_get_product).toBe('admin_get_product');
    expect(REQUIRED_RC5_DIRECTORY_DETAIL_RPCS.list_portal_support_ticket_replies).toBe(
      'list_portal_support_ticket_replies',
    );
  });

  it('maps product detail and rejects schema drift', () => {
    const detail = mapAdminProductDetail({
      schema_version: BACKEND_CONTRACT.schemaVersion,
      id: 'p1',
      name: 'Site',
      status: 'PUBLISHED',
      price_cents: 1000,
      currency: 'EUR',
      legal_status: 'OK',
      partner_enabled: true,
    });
    expect(detail.title).toBe('Site');
    expect(() => mapAdminProductDetail({ schema_version: 'wrong', id: 'p1', name: 'x' })).toThrow(
      /CONTRACT_DRIFT/,
    );
  });

  it('maps partner activation checklist without treating null type as INDIVIDUAL', () => {
    const detail = mapAdminPartnerDetail({
      schema_version: BACKEND_CONTRACT.schemaVersion,
      id: 'partner-1',
      display_name: 'Legacy',
      partner_type: null,
      type_classification_status: 'REVIEW_REQUIRED',
      status: 'ACTIVE',
      legacy_activation_grandfathered: true,
      activation_checklist: {
        can_activate: false,
        missing: ['PARTNER_TYPE_UNKNOWN'],
        checks: {},
      },
      activation_block_codes: ['PARTNER_TYPE_UNKNOWN'],
    });
    expect(detail.partner?.partnerType).toBeNull();
    expect(detail.subtitle).toContain('Ongeclassificeerd');
    expect(detail.partner?.activationChecklist.missing).toContain('PARTNER_TYPE_UNKNOWN');
  });

  it('maps ticket replies including is_internal', () => {
    const page = mapSupportTicketRepliesPage({
      schema_version: BACKEND_CONTRACT.schemaVersion,
      next_cursor: null,
      items: [
        {
          id: '1',
          ticket_id: 't1',
          body: 'public',
          is_internal: false,
          created_at: '2026-07-29T00:00:00Z',
          author_user_id: 'u1',
        },
        {
          id: '2',
          ticket_id: 't1',
          body: 'secret',
          is_internal: true,
          created_at: '2026-07-29T01:00:00Z',
          author_user_id: 'u2',
        },
      ],
    });
    expect(page.items).toHaveLength(2);
    expect(page.items[1]?.isInternal).toBe(true);
  });
});

describe('RC5 partner type intake', () => {
  const base = {
    contactName: 'Jan Jansen',
    email: 'jan@example.test',
    phone: '0612345678',
    motivation: 'Ik wil graag partner worden van VDB Digital.',
    acceptPartnerTerms: true as const,
  };

  it('maps legacy labels to canonical types', () => {
    expect(mapLegacyPartnerTypeLabel('particulier')).toBe('INDIVIDUAL');
    expect(mapLegacyPartnerTypeLabel('particular')).toBe('INDIVIDUAL');
    expect(mapLegacyPartnerTypeLabel('sole_trader')).toBe('BUSINESS');
    expect(mapLegacyPartnerTypeLabel('company')).toBe('BUSINESS');
  });

  it('accepts INDIVIDUAL without company/KVK', () => {
    expect(
      partnerApplicationSchema.safeParse({
        ...base,
        partnerType: 'INDIVIDUAL',
        companyName: '',
        kvkNumber: '',
      }).success,
    ).toBe(true);
  });

  it('rejects INDIVIDUAL with KVK', () => {
    expect(
      partnerApplicationSchema.safeParse({
        ...base,
        partnerType: 'INDIVIDUAL',
        kvkNumber: '12345678',
      }).success,
    ).toBe(false);
  });

  it('requires company+KVK for BUSINESS', () => {
    expect(
      partnerApplicationSchema.safeParse({
        ...base,
        partnerType: 'BUSINESS',
        companyName: '',
        kvkNumber: '',
      }).success,
    ).toBe(false);
    expect(
      partnerApplicationSchema.safeParse({
        ...base,
        partnerType: 'BUSINESS',
        companyName: 'Acme BV',
        kvkNumber: '12345678',
      }).success,
    ).toBe(true);
  });

  it('requires explicit partner type', () => {
    expect(partnerApplicationSchema.safeParse({ ...base }).success).toBe(false);
  });
});
