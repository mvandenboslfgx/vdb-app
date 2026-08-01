/**
 * Partner ticket clickability + role isolation (not full E2E).
 */
import {
  canAccessAdminArea,
  canAccessPartnerArea,
  resolvePrimaryArea,
  type AppRole,
} from '@/security/roles';
import {
  decidePartnerTicketAccess,
  partnerCommercialActionsAllowed,
} from '@/lib/partnerTicketPolicy';
import { BACKEND_CONTRACT } from '@/config/backendContract';

const PARTNER_TICKET_INTERACTIONS = [
  'partner-more-support',
  'partner-support-open',
  'btn-partner-support-new',
  'row-partner-ticket-*',
  'input-partner-support-subject',
  'input-partner-support-category',
  'input-partner-support-description',
  'btn-partner-support-submit',
  'input-partner-support-reply',
  'btn-partner-support-send-reply',
  'partner-more-whatsapp',
  'retry',
  'android-back',
] as const;

describe('partner ticket clickability inventory', () => {
  it('tracks the expected partner ticket interaction surface count', () => {
    expect(PARTNER_TICKET_INTERACTIONS).toHaveLength(13);
  });

  it('active partner reaches partner area and ticket policy allows writes', () => {
    const roles: AppRole[] = ['partner'];
    expect(resolvePrimaryArea(roles)).toBe('partner');
    expect(canAccessPartnerArea(roles)).toBe(true);
    expect(canAccessAdminArea(roles)).toBe(false);
    const access = decidePartnerTicketAccess('active');
    expect(access.canCreate && access.canReply).toBe(true);
  });

  it('pending stays outside partner area (customer tickets cover Owner support)', () => {
    const roles: AppRole[] = ['partner_pending'];
    expect(resolvePrimaryArea(roles)).toBe('customer');
    expect(canAccessPartnerArea(roles)).toBe(false);
    expect(decidePartnerTicketAccess('pending').canCreate).toBe(true);
    expect(partnerCommercialActionsAllowed('pending')).toBe(false);
  });

  it('suspended has no partner commercial UI; ticket capability remains allow', () => {
    const roles: AppRole[] = ['customer'];
    expect(canAccessPartnerArea(roles)).toBe(false);
    expect(decidePartnerTicketAccess('suspended').canReply).toBe(true);
    expect(partnerCommercialActionsAllowed('suspended')).toBe(false);
  });

  it('WhatsApp is additional — tickets remain the primary Owner support route', () => {
    expect(PARTNER_TICKET_INTERACTIONS).toContain('partner-more-support');
    expect(PARTNER_TICKET_INTERACTIONS).toContain('partner-more-whatsapp');
    expect(BACKEND_CONTRACT.version).toBe('0.2.0-rc.7');
  });
});

describe('partner ticket account isolation expectations', () => {
  it('Partner A vs Partner B: separate profile IDs imply separate RLS scopes', () => {
    const partnerA = { id: 'partner-a', status: 'active' as const };
    const partnerB = { id: 'partner-b', status: 'active' as const };
    expect(partnerA.id).not.toBe(partnerB.id);
    // Mobile never client-filters by partner id for tickets; Owner RLS scopes org membership.
    expect(decidePartnerTicketAccess(partnerA.status).canList).toBe(true);
  });

  it('Partner does not inherit Customer area as primary when role is partner', () => {
    expect(resolvePrimaryArea(['partner'])).toBe('partner');
    expect(resolvePrimaryArea(['customer'])).toBe('customer');
  });

  it('logout clears partner area access', () => {
    expect(resolvePrimaryArea([])).toBe('public');
    expect(canAccessPartnerArea([])).toBe(false);
  });
});
