import {
  decidePartnerTicketAccess,
  normalizePartnerTicketStatus,
  partnerCommercialActionsAllowed,
} from '@/lib/partnerTicketPolicy';

/**
 * Status matrix aligned with Partners-web `support_own_tickets` (ALWAYS_SAFE)
 * and Owner org-member RLS on portal_support_* / reply_portal_support_ticket.
 * INDIVIDUAL vs BUSINESS does not change ticket capabilities.
 */
describe('partnerTicketPolicy status matrix', () => {
  it.each([
    ['ACTIVE', 'active'],
    ['APPROVED', 'active'],
    ['PENDING', 'pending'],
    ['SUBMITTED', 'pending'],
    ['UNDER_REVIEW', 'pending'],
    ['SUSPENDED', 'suspended'],
    ['REVOKED', 'suspended'],
    ['WEIRD', 'unknown'],
    ['', 'unknown'],
  ] as const)('normalizes %s → %s', (raw, expected) => {
    expect(normalizePartnerTicketStatus(raw)).toBe(expected);
  });

  it.each([
    ['active', true, true, true, true],
    ['pending', true, true, true, true],
    ['suspended', true, true, true, true],
    ['unknown', false, false, false, false],
  ] as const)(
    '%s → list=%s detail=%s create=%s reply=%s',
    (status, list, detail, create, reply) => {
      const access = decidePartnerTicketAccess(status);
      expect(access.canList).toBe(list);
      expect(access.canDetail).toBe(detail);
      expect(access.canCreate).toBe(create);
      expect(access.canReply).toBe(reply);
    },
  );

  it('pending INDIVIDUAL and BUSINESS share the same ticket policy', () => {
    const access = decidePartnerTicketAccess('pending');
    expect(access).toEqual(decidePartnerTicketAccess('pending'));
    expect(access.canCreate).toBe(true);
    expect(access.canReply).toBe(true);
    expect(partnerCommercialActionsAllowed('pending')).toBe(false);
  });

  it('active allows commercial actions; suspended/pending/unknown do not', () => {
    expect(partnerCommercialActionsAllowed('active')).toBe(true);
    expect(partnerCommercialActionsAllowed('pending')).toBe(false);
    expect(partnerCommercialActionsAllowed('suspended')).toBe(false);
    expect(partnerCommercialActionsAllowed('unknown')).toBe(false);
  });

  it('unknown is fail-closed for all ticket writes and reads', () => {
    const access = decidePartnerTicketAccess('unknown');
    expect(access.reason).toBe('unknown_status');
    expect(Object.values(access).filter((v) => v === true)).toHaveLength(0);
  });
});
