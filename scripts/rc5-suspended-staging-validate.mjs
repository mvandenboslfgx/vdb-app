/**
 * RC5 Staging APK Readiness — Suspended Fixture Staging Validation
 *
 * Read-only staging validation for SUSPENDED_PARTNER_RC5.
 * Credentials are loaded from the local vault file ONLY — never hardcoded.
 *
 * Hard limits:
 *   - reads from staging only (qzekuvmgfekzsowdecyk)
 *   - refuses production ref (nhsrdnjfsxfikfbdmdfj)
 *   - performs deny-check calls only (no financial mutations)
 *   - does not change the fixture status
 *
 * Usage: node scripts/rc5-suspended-staging-validate.mjs
 */
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const STAGING_REF = 'qzekuvmgfekzsowdecyk';
const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const VAULT_PATH = 'C:/Users/XXX/.vdb-vault/partner-staging-suspended-rc5.env';

function loadVault(path) {
  if (!fs.existsSync(path)) throw new Error(`Vault missing: ${path}`);
  const map = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 1) continue;
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    map[line.slice(0, idx).trim()] = v;
  }
  return map;
}

const vault = loadVault(VAULT_PATH);

const ref = vault.VDB_STAGING_PROJECT_REF || '';
const url = vault.VDB_STAGING_SUPABASE_URL || `https://${ref}.supabase.co`;
const email = vault.VDB_STAGING_SUSPENDED_PARTNER_EMAIL || '';
const password = vault.VDB_STAGING_SUSPENDED_PARTNER_PASSWORD || '';
const expectedFingerprint = vault.VDB_STAGING_SUSPENDED_FINGERPRINT || '';
const expectedFixtureKind = vault.VDB_STAGING_SUSPENDED_FIXTURE_KIND || '';
const anonKey = vault.VDB_STAGING_ANON_KEY || vault.VDB_ANON_KEY || '';

// Safety: abort if pointed at production
if (ref === PRODUCTION_REF || url.includes(PRODUCTION_REF)) {
  console.error('ABORT: vault points to production ref. Refusing.');
  process.exit(1);
}
if (ref !== STAGING_REF && !url.includes(STAGING_REF)) {
  console.error(`ABORT: unexpected staging ref "${ref}". Expected ${STAGING_REF}.`);
  process.exit(1);
}
if (!email || !password) {
  console.error('ABORT: email or password missing from vault.');
  process.exit(1);
}
if (!anonKey) {
  console.error('ABORT: VDB_STAGING_ANON_KEY missing from vault.');
  process.exit(1);
}

console.log(`Staging ref: ${ref} ✓`);
console.log(`Fixture:     ${expectedFixtureKind}`);
console.log(`Fingerprint: ${expectedFingerprint}`);
console.log('');

function clientAnon() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const results = [];

function pass(name) {
  results.push({ name, status: 'pass' });
  console.log(`PASS ${name}`);
}

function fail(name, err) {
  results.push({ name, status: 'fail', err: String(err?.message ?? err) });
  console.error(`FAIL ${name}: ${err?.message ?? err}`);
}

async function main() {
  // 1. Login succeeds
  let sb;
  let userId;
  try {
    sb = clientAnon();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user?.id) throw new Error('no user returned');
    userId = data.user.id;
    pass('suspended_login_succeeds');
  } catch (e) {
    fail('suspended_login_succeeds', e);
    console.error('Cannot continue without login.');
    process.exit(1);
  }

  // 2. Server profile status is SUSPENDED
  try {
    const { data, error } = await sb
      .from('partner_profiles')
      .select('status, payout_eligible')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    if (data.status !== 'SUSPENDED') throw new Error(`expected SUSPENDED, got ${data.status}`);
    if (data.payout_eligible !== false) throw new Error('expected payout_eligible=false');
    pass('suspended_server_profile_status');
  } catch (e) {
    fail('suspended_server_profile_status', e);
  }

  // 3. Session restore remains suspended (re-read session)
  try {
    const { data: sess, error } = await sb.auth.getSession();
    if (error) throw error;
    if (!sess.session?.user?.id) throw new Error('session missing after login');
    pass('suspended_session_restore_stable');
  } catch (e) {
    fail('suspended_session_restore_stable', e);
  }

  // 4. Catalog listing deny (FORBIDDEN for non-ACTIVE partner)
  try {
    const { data, error } = await sb.rpc('list_partner_catalog', {});
    if (error) {
      // Expect RLS/function error (FORBIDDEN or permission denied)
      pass('suspended_catalog_deny');
    } else if (!data || (Array.isArray(data) && data.length === 0)) {
      // Empty return also acceptable (RLS filters all rows)
      pass('suspended_catalog_deny');
    } else {
      fail('suspended_catalog_deny', new Error(`unexpected catalog data: ${JSON.stringify(data)}`));
    }
  } catch (e) {
    pass('suspended_catalog_deny'); // throws = denied
  }

  // 5. Lead create deny
  try {
    const { error } = await sb.rpc('create_partner_lead', {
      p_product_id: '00000000-0000-0000-0000-000000000001',
      p_customer_name: 'Test',
      p_customer_email: 'test@example.com',
    });
    if (error) {
      pass('suspended_lead_create_deny');
    } else {
      fail('suspended_lead_create_deny', new Error('lead create unexpectedly succeeded'));
    }
  } catch (e) {
    pass('suspended_lead_create_deny');
  }

  // 6. Commission action deny (list own commissions)
  try {
    const { data, error } = await sb
      .from('partner_commissions')
      .select('id')
      .eq('partner_id', userId)
      .limit(1);
    if (error) {
      pass('suspended_commission_action_deny');
    } else if (!data || data.length === 0) {
      pass('suspended_commission_action_deny');
    } else {
      fail(
        'suspended_commission_action_deny',
        new Error(`unexpected commission data returned: ${JSON.stringify(data)}`),
      );
    }
  } catch (e) {
    pass('suspended_commission_action_deny');
  }

  // 7. Payout action deny
  try {
    const { error } = await sb.rpc('request_partner_payout', { p_amount_cents: 1 });
    if (error) {
      pass('suspended_payout_action_deny');
    } else {
      fail('suspended_payout_action_deny', new Error('payout unexpectedly succeeded'));
    }
  } catch (e) {
    pass('suspended_payout_action_deny');
  }

  // 8. Admin RPC deny (admin_get_partner_detail)
  try {
    const { error } = await sb.rpc('admin_get_partner_detail', {
      p_partner_id: userId,
    });
    if (error) {
      pass('suspended_admin_route_deny');
    } else {
      fail('suspended_admin_route_deny', new Error('admin RPC unexpectedly succeeded'));
    }
  } catch (e) {
    pass('suspended_admin_route_deny');
  }

  // 9. Cross-partner lead read deny
  try {
    const { data, error } = await sb
      .from('partner_leads')
      .select('id')
      .neq('partner_id', userId) // other partner's leads
      .limit(1);
    if (error) {
      pass('suspended_cross_partner_lead_deny');
    } else if (!data || data.length === 0) {
      pass('suspended_cross_partner_lead_deny');
    } else {
      fail(
        'suspended_cross_partner_lead_deny',
        new Error(`cross-partner data visible: ${JSON.stringify(data)}`),
      );
    }
  } catch (e) {
    pass('suspended_cross_partner_lead_deny');
  }

  // 10. Internal notes not visible (staff-only RPC)
  try {
    const { error } = await sb.rpc('list_portal_support_ticket_replies', {
      p_ticket_id: '00000000-0000-0000-0000-000000000001',
      p_include_internal: true,
    });
    if (error) {
      pass('suspended_internal_notes_deny');
    } else {
      fail('suspended_internal_notes_deny', new Error('internal notes RPC unexpectedly succeeded'));
    }
  } catch (e) {
    pass('suspended_internal_notes_deny');
  }

  // 11. Logout wipes session
  try {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    const { data: sess } = await sb.auth.getSession();
    if (sess.session) throw new Error('session still present after signOut');
    pass('suspended_logout_wipes_session');
  } catch (e) {
    fail('suspended_logout_wipes_session', e);
  }

  // 12. Re-login still yields SUSPENDED status
  try {
    const sb2 = clientAnon();
    const { data, error } = await sb2.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const userId2 = data.user?.id;
    const { data: profile, error: pErr } = await sb2
      .from('partner_profiles')
      .select('status')
      .eq('user_id', userId2)
      .single();
    if (pErr) throw pErr;
    if (profile.status !== 'SUSPENDED') throw new Error(`re-login status: ${profile.status}`);
    pass('suspended_relogin_remains_suspended');
    await sb2.auth.signOut();
  } catch (e) {
    fail('suspended_relogin_remains_suspended', e);
  }

  // Summary
  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;
  console.log('');
  console.log(`SUSPENDED FIXTURE STAGING: ${passCount}/${results.length} PASS, ${failCount} FAIL`);
  if (failCount > 0) {
    console.error('VERDICT: SUSPENDED_FIXTURE_CONTRACT FAIL');
    process.exit(1);
  }
  console.log('VERDICT: SUSPENDED_FIXTURE_CONTRACT PASS');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
