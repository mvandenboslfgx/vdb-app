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

describe('owner contract pin 0.2.0-rc.2', () => {
  it('pins owner rc.2 and drops 0.1.1 as canonical', () => {
    expect(BACKEND_CONTRACT.packageId).toBe('vdb-backend-contract@0.2.0-rc.2');
    expect(BACKEND_CONTRACT.schemaVersion).toBe('2026.07.24.mobile-compat-rc2');
    expect(BACKEND_CONTRACT.status).toBe('CONSUMER_PIN_OWNER_RC2');
    expect(BACKEND_CONTRACT.supersededLocalProposal.version).toBe('0.1.1');
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

  it('rejects marketing leads alias confusion', () => {
    expect(() => assertNotMarketingLeadsAlias('leads')).toThrow(/CONTRACT_DRIFT/);
    expect(() => assertNotMarketingLeadsAlias('partner_leads')).not.toThrow();
  });
});
