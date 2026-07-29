import {
  assertNotMarketingLeadsAlias,
  mapMobileRpcToOwner,
  mapMobileTableToOwner,
  MOBILE_RPC_TO_OWNER,
  MOBILE_TABLE_TO_OWNER,
  OWNER_RPCS,
  OWNER_TABLES,
} from '@/api/contract/ownerMapping';
import { BACKEND_CONTRACT } from '@/config/backendContract';

describe('owner contract pin 0.2.0-rc.6', () => {
  it('pins owner rc.6 and keeps rc.5/rc.4/rc.3 as superseded', () => {
    expect(BACKEND_CONTRACT.packageId).toBe('vdb-backend-contract@0.2.0-rc.6');
    expect(BACKEND_CONTRACT.schemaVersion).toBe('2026.07.29.partner-approval-aal2-rc6');
    expect(BACKEND_CONTRACT.status).toBe('CONSUMER_PIN_OWNER_RC6');
    expect(BACKEND_CONTRACT.minimumCompatibleClientVersion).toBe('>=0.2.0-rc.6');
    expect(BACKEND_CONTRACT.partnerIdentityDirectoryCompatibleWith).toBe(
      'vdb-backend-contract@0.2.0-rc.5',
    );
    expect(BACKEND_CONTRACT.supersededPins.rc5.packageId).toBe('vdb-backend-contract@0.2.0-rc.5');
    expect(BACKEND_CONTRACT.supersededPins.rc5.schemaVersion).toBe(
      '2026.07.29.partner-identity-directory-rc5',
    );
    expect(BACKEND_CONTRACT.supersededPins.rc4.packageId).toBe('vdb-backend-contract@0.2.0-rc.4');
    expect(BACKEND_CONTRACT.supersededPins.rc3.packageId).toBe('vdb-backend-contract@0.2.0-rc.3');
  });

  it('maps Mobile proposal tables to portal_/partner_ canonical names', () => {
    expect(mapMobileTableToOwner('projects')).toBe(OWNER_TABLES.projects);
    expect(mapMobileTableToOwner('quotes')).toBe('portal_quotes');
    expect(mapMobileTableToOwner('documents')).toBe('portal_files');
    expect(mapMobileTableToOwner('commissions')).toBe('partner_commissions');
    expect(mapMobileTableToOwner('payout_requests')).toBe('partner_payout_requests');
    expect(Object.keys(MOBILE_TABLE_TO_OWNER).length).toBeGreaterThan(5);
  });

  it('maps Mobile proposal RPCs to owner RPCs', () => {
    expect(mapMobileRpcToOwner('accept_quote')).toBe(OWNER_RPCS.acceptQuote);
    expect(mapMobileRpcToOwner('register_partner_lead')).toBe('create_partner_lead');
    expect(mapMobileRpcToOwner('request_commission_payout')).toBe('request_partner_payout');
    expect(MOBILE_RPC_TO_OWNER.reject_quote).toBe('decline_portal_quote');
  });

  it('maps rc.3 messaging/support/appointments tables to portal_* canonical names', () => {
    expect(mapMobileTableToOwner('conversations')).toBe(OWNER_TABLES.conversations);
    expect(mapMobileTableToOwner('conversations')).toBe('portal_conversations');
    expect(mapMobileTableToOwner('messages')).toBe('portal_messages');
    expect(mapMobileTableToOwner('support_tickets')).toBe('portal_support_tickets');
    expect(mapMobileTableToOwner('tickets')).toBe('portal_support_tickets');
    expect(mapMobileTableToOwner('support_messages')).toBe('portal_support_replies');
    expect(mapMobileTableToOwner('support_ticket_messages')).toBe('portal_support_replies');
    expect(mapMobileTableToOwner('appointments')).toBe('portal_appointments');
  });

  it('maps rc.3 messaging/support/appointments RPCs to owner canonical names', () => {
    expect(mapMobileRpcToOwner('book_appointment_slot')).toBe('book_portal_appointment');
    expect(mapMobileRpcToOwner('cancel_appointment')).toBe('cancel_portal_appointment');
    expect(mapMobileRpcToOwner('admin_reply_support_ticket')).toBe('reply_portal_support_ticket');
    expect(mapMobileRpcToOwner('admin_update_ticket_status')).toBe(
      'transition_portal_support_ticket_status',
    );
    expect(mapMobileRpcToOwner('approve_commission')).toBe('approve_partner_commission');
    expect(mapMobileRpcToOwner('send_message')).toBe(OWNER_RPCS.sendMessage);
    expect(mapMobileRpcToOwner('mark_conversation_read')).toBe(OWNER_RPCS.markConversationRead);
  });

  it('rejects marketing leads alias confusion', () => {
    expect(() => assertNotMarketingLeadsAlias('leads')).toThrow(/CONTRACT_DRIFT/);
    expect(() => assertNotMarketingLeadsAlias('partner_leads')).not.toThrow();
  });
});
