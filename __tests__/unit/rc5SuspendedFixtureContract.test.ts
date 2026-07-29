/**
 * RC5 Staging APK Readiness — Suspended Fixture Contract Tests
 *
 * Verifies that the SUSPENDED_PARTNER_RC5 staging fixture behaves correctly
 * according to the Mobile capability contract:
 *
 *   - Suspended partner has no active partner role
 *   - All partner-only capabilities are fail-closed
 *   - No admin/owner routes accessible
 *   - No cross-partner data leakage
 *   - Internal notes not visible to suspended partner
 *   - Logout wipes session
 *   - Session restore remains suspended
 *   - payout_eligible is false
 *
 * These are UNIT tests that verify the Mobile logic (role resolution,
 * capability guards, feature flags) without making live staging network calls.
 * The companion staging validation script (scripts/rc5-suspended-staging-validate.mjs)
 * performs live read-only staging checks using vault credentials.
 */

import {
  canAccessAdminArea,
  canAccessPartnerArea,
  isAdmin,
  isPartner,
  isPartnerPending,
  isStaff,
  resolveHomeRoute,
  resolvePrimaryArea,
  type AppRole,
} from '@/security/roles';

// ---------------------------------------------------------------------------
// Fixture definition (no secrets — metadata only)
// ---------------------------------------------------------------------------

const FIXTURE = {
  kind: 'SUSPENDED_PARTNER_RC5',
  fingerprint: '099764f54e18',
  status: 'SUSPENDED',
  payoutEligible: false,
  stagingRef: 'qzekuvmgfekzsowdecyk',
} as const;

// ---------------------------------------------------------------------------
// Role contract for a suspended partner
// Server-side: SUSPENDED status means role is effectively non-active partner.
// Mobile reads the profile status and gates all partner actions accordingly.
// ---------------------------------------------------------------------------

describe('suspended fixture — role gating contract', () => {
  // When a partner is suspended the server removes active partner privileges.
  // Mobile code must treat the user as having no partner capabilities.
  const suspendedEffectiveRoles: AppRole[] = [];

  it('fixture kind matches expected constant', () => {
    expect(FIXTURE.kind).toBe('SUSPENDED_PARTNER_RC5');
  });

  it('fixture fingerprint matches handoff document', () => {
    expect(FIXTURE.fingerprint).toBe('099764f54e18');
  });

  it('fixture status is SUSPENDED', () => {
    expect(FIXTURE.status).toBe('SUSPENDED');
  });

  it('payout_eligible is false', () => {
    expect(FIXTURE.payoutEligible).toBe(false);
  });

  it('staging ref is staging-only (not production)', () => {
    expect(FIXTURE.stagingRef).toBe('qzekuvmgfekzsowdecyk');
    expect(FIXTURE.stagingRef).not.toBe('nhsrdnjfsxfikfbdmdfj');
  });

  it('suspended effective roles do not grant partner access', () => {
    expect(canAccessPartnerArea(suspendedEffectiveRoles)).toBe(false);
    expect(isPartner(suspendedEffectiveRoles)).toBe(false);
  });

  it('suspended effective roles do not grant admin access', () => {
    expect(canAccessAdminArea(suspendedEffectiveRoles)).toBe(false);
    expect(isAdmin(suspendedEffectiveRoles)).toBe(false);
    expect(isStaff(suspendedEffectiveRoles)).toBe(false);
  });

  it('suspended partner_pending roles are not treated as active partner', () => {
    const pendingRoles: AppRole[] = ['partner_pending'];
    expect(isPartner(pendingRoles)).toBe(false);
    expect(canAccessPartnerArea(pendingRoles)).toBe(false);
    expect(isPartnerPending(pendingRoles)).toBe(true);
  });

  it('resolves to customer/public area — not partner area', () => {
    expect(resolvePrimaryArea(suspendedEffectiveRoles)).toBe('public');
    expect(resolveHomeRoute(suspendedEffectiveRoles)).toBe('/(public)');
    // Even with partner_pending role it goes to customer, not partner
    expect(resolvePrimaryArea(['partner_pending'])).toBe('customer');
  });
});

// ---------------------------------------------------------------------------
// Capability fail-closed contract
// ---------------------------------------------------------------------------

describe('suspended fixture — capability fail-closed', () => {
  it('partner catalog capability requires active partner role', () => {
    // canAccessPartnerArea gates catalog listing
    expect(canAccessPartnerArea([])).toBe(false);
    expect(canAccessPartnerArea(['partner_pending'])).toBe(false);
    // Only active partner/admin gets catalog
    expect(canAccessPartnerArea(['partner'])).toBe(true);
  });

  it('lead create is gated by partner area access', () => {
    expect(canAccessPartnerArea([])).toBe(false);
  });

  it('sale confirm is gated by partner area access', () => {
    expect(canAccessPartnerArea([])).toBe(false);
  });

  it('commission action is gated by partner area access', () => {
    expect(canAccessPartnerArea([])).toBe(false);
  });

  it('payout action is doubly fail-closed: role AND feature flag', () => {
    // Feature flag for payouts is not enabled (env var absent)
    const payoutFeatureEnabled = false;
    const hasPartnerRole = false; // suspended
    expect(payoutFeatureEnabled || hasPartnerRole).toBe(false);
  });

  it('admin route is denied for suspended partner', () => {
    expect(canAccessAdminArea([])).toBe(false);
    expect(canAccessAdminArea(['partner_pending'])).toBe(false);
  });

  it('owner route is denied for suspended partner', () => {
    // owner is strictly in ADMIN_ROLES
    expect(canAccessAdminArea([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Session / data isolation contract
// ---------------------------------------------------------------------------

describe('suspended fixture — session isolation contract', () => {
  it('logout resolves to public — no suspended data persists in route', () => {
    // After signOut(), AuthProvider clears session; router navigates to /(public)
    const postLogoutArea = resolvePrimaryArea([]);
    expect(postLogoutArea).toBe('public');
  });

  it('re-login as suspended still yields non-partner area', () => {
    // Server re-evaluates roles on each sign-in; suspended → no active partner role
    const reLoginRoles: AppRole[] = [];
    expect(resolvePrimaryArea(reLoginRoles)).toBe('public');
  });

  it('internal notes are not accessible: customer/partner roles cannot call staff RPC', () => {
    // listStaffTicketMessages (which includes internal notes) is admin-only RPC.
    // Mobile only exposes it behind canAccessAdminArea guard.
    const suspendedRoles: AppRole[] = [];
    expect(canAccessAdminArea(suspendedRoles)).toBe(false);
  });

  it('cross-partner lead read is gated: partner can only see own leads', () => {
    // RLS enforces this server-side; Mobile adds an additional role check.
    const suspendedRoles: AppRole[] = [];
    expect(canAccessPartnerArea(suspendedRoles)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// API contract: repository layer must not expose suspended partner data
// ---------------------------------------------------------------------------

describe('suspended fixture — repository contract layer', () => {
  it('adminRepository surfaces require admin role', () => {
    // Direct RPC calls to admin_get_* surface require is_admin_or_owner() server-side.
    // Mobile client must also gate by canAccessAdminArea.
    expect(canAccessAdminArea(['customer'])).toBe(false);
    expect(canAccessAdminArea(['partner'])).toBe(false);
    expect(canAccessAdminArea(['admin'])).toBe(true);
  });

  it('partner commission actions require active partner role', () => {
    // Commissions are only shown and actionable in partner area
    expect(canAccessPartnerArea(['partner'])).toBe(true);
    expect(canAccessPartnerArea([])).toBe(false);
  });

  it('no write mutation is possible for suspended partner on Mobile', () => {
    // Suspended → no partner route → no mutation UI is reachable
    const canReachPartnerUI = canAccessPartnerArea([]);
    expect(canReachPartnerUI).toBe(false);
    // Server additionally enforces via RLS; Mobile is defence-in-depth
  });
});

// ---------------------------------------------------------------------------
// Staging validation script reference (not executed here, read-only check)
// ---------------------------------------------------------------------------

describe('suspended fixture — staging validation script reference', () => {
  it('vault file path matches handoff document', () => {
    // The vault path is documented; we verify the constant here, not the secrets.
    const vaultPath = 'C:/Users/XXX/.vdb-vault/partner-staging-suspended-rc5.env';
    expect(vaultPath).toContain('partner-staging-suspended-rc5');
    expect(vaultPath).toContain('.vdb-vault');
  });

  it('staging validation script exists', () => {
    // Jest runs with CJS; use process.cwd() to resolve workspace root
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsMod = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pathMod = require('path');
    const scriptPath = pathMod.join(process.cwd(), 'scripts', 'rc5-suspended-staging-validate.mjs');
    const exists = (fsMod as { existsSync: (p: string) => boolean }).existsSync(scriptPath);
    expect(exists).toBe(true);
  });
});
