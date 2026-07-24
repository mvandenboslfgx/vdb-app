/**
 * Owner-canonical naming for shared staging/local owner schema.
 * Mobile local proposal tables/RPCs are mapped here — not published as canon.
 */

export const OWNER_TABLES = {
  projects: 'portal_projects',
  quotes: 'portal_quotes',
  quoteItems: 'portal_quote_items',
  invoices: 'portal_invoices',
  invoiceItems: 'portal_invoice_items',
  documents: 'portal_files',
  commissions: 'partner_commissions',
  payoutRequests: 'partner_payout_requests',
  sales: 'partner_sales',
  partnerLeads: 'partner_leads',
  profiles: 'profiles',
  featureFlags: 'feature_flags',
} as const;

export const OWNER_RPCS = {
  acceptQuote: 'accept_portal_quote',
  rejectQuote: 'decline_portal_quote',
  registerPartnerLead: 'create_partner_lead',
  approvePartnerApplication: 'review_partner_application',
  rejectPartnerApplication: 'review_partner_application',
  requestCommissionPayout: 'request_partner_payout',
  qualifyLead: 'review_partner_lead',
  convertLead: 'confirm_partner_sale',
  featureFlagEnabled: 'feature_flag_enabled',
  verifyMobileCompat: 'verify_mobile_compat_contracts',
} as const;

/** Legacy Mobile proposal RPC names → owner canonical. */
export const MOBILE_RPC_TO_OWNER: Record<string, string> = {
  accept_quote: OWNER_RPCS.acceptQuote,
  reject_quote: OWNER_RPCS.rejectQuote,
  register_partner_lead: OWNER_RPCS.registerPartnerLead,
  approve_partner_application: OWNER_RPCS.approvePartnerApplication,
  reject_partner_application: OWNER_RPCS.rejectPartnerApplication,
  request_commission_payout: OWNER_RPCS.requestCommissionPayout,
  admin_qualify_lead: OWNER_RPCS.qualifyLead,
  admin_convert_lead: OWNER_RPCS.convertLead,
};

/** Legacy Mobile proposal table names → owner canonical. */
export const MOBILE_TABLE_TO_OWNER: Record<string, string> = {
  projects: OWNER_TABLES.projects,
  quotes: OWNER_TABLES.quotes,
  quote_items: OWNER_TABLES.quoteItems,
  invoices: OWNER_TABLES.invoices,
  invoice_items: OWNER_TABLES.invoiceItems,
  documents: OWNER_TABLES.documents,
  commissions: OWNER_TABLES.commissions,
  payout_requests: OWNER_TABLES.payoutRequests,
  sales: OWNER_TABLES.sales,
  app_profiles: OWNER_TABLES.profiles,
};

export function mapMobileTableToOwner(table: string): string {
  return MOBILE_TABLE_TO_OWNER[table] ?? table;
}

export function mapMobileRpcToOwner(rpc: string): string {
  return MOBILE_RPC_TO_OWNER[rpc] ?? rpc;
}

/** Marketing `leads` must never be treated as partner leads. */
export function assertNotMarketingLeadsAlias(table: string): void {
  if (table === 'leads') {
    throw new Error(
      'CONTRACT_DRIFT: use partner_leads (canonical). Marketing leads are a separate owner table.',
    );
  }
}
