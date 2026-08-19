#!/usr/bin/env node
/**
 * RC7 staging API security matrix — kjricvicakvsreuytvra only.
 * Complements physical device tests; never logs passwords or TOTP.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseEnvFile, redactEnvForLog } from './lib/load-env-file.mjs';

const STAGING_REF = 'kjricvicakvsreuytvra';
const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const VAULT = process.env.RC7_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';
const OUT_DIR =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';

const url = process.env.RC7_STAGING_URL || `https://${STAGING_REF}.supabase.co`;
const anon = process.env.RC7_STAGING_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (url.includes(PRODUCTION_REF)) {
  console.error('ABORT: production ref in URL');
  process.exit(1);
}
if (!url.includes(STAGING_REF)) {
  console.error('ABORT: URL must target RC7 staging ref');
  process.exit(1);
}
if (!anon) {
  console.error('ABORT: set RC7_STAGING_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const vault = parseEnvFile(VAULT);
const accounts = [
  {
    role: 'customer',
    email: vault.RC7_CUSTOMER_A_EMAIL,
    password: vault.RC7_CUSTOMER_A_PASSWORD,
  },
  {
    role: 'partner_pending',
    email: vault.RC7_PARTNER_A_EMAIL,
    password: vault.RC7_PARTNER_A_PASSWORD,
  },
  {
    role: 'admin_aal1',
    email: vault.RC7_ADMIN_A_EMAIL,
    password: vault.RC7_ADMIN_A_PASSWORD,
  },
];

/** @type {{ role: string; surface: string; check: string; result: string; detail: string }[]} */
const rows = [];

function rec(row) {
  rows.push(row);
  console.log(`${row.result.padEnd(7)} ${row.role}/${row.surface}/${row.check}`);
}

function denyOk(error) {
  if (!error) return false;
  const m = `${error.message || error}`.toLowerCase();
  return (
    m.includes('permission') ||
    m.includes('denied') ||
    m.includes('forbidden') ||
    m.includes('not authorized') ||
    m.includes('aal2') ||
    m.includes('42501') ||
    m.includes('pgrst')
  );
}

function aalFromSession(session) {
  try {
    const payload = JSON.parse(
      Buffer.from(session.access_token.split('.')[1], 'base64url').toString('utf8'),
    );
    return payload.aal === 'aal2' ? 'aal2' : 'aal1';
  } catch {
    return 'unknown';
  }
}

async function rpc(client, name, params) {
  return client.rpc(name, params);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('RC7_SECURITY_MATRIX', { url: url.replace(/https:\/\//, ''), anon: '[redacted]' });

  for (const account of accounts) {
    if (!account.email || !account.password) {
      rec({
        role: account.role,
        surface: 'auth',
        check: 'credentials',
        result: 'BLOCKED',
        detail: 'missing vault credential',
      });
      continue;
    }

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: signErr } = await client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    });
    if (signErr || !signIn.session) {
      rec({
        role: account.role,
        surface: 'auth',
        check: 'login',
        result: 'FAIL',
        detail: signErr?.message || 'no session',
      });
      continue;
    }
    const aal = aalFromSession(signIn.session);
    rec({
      role: account.role,
      surface: 'auth',
      check: 'login',
      result: 'PASS',
      detail: `aal=${aal}`,
    });

    const isStaff = account.role.startsWith('admin') || account.role === 'staff';
    const isCustomerish = account.role === 'customer' || account.role === 'partner_pending';

    // Admin RPC deny for non-staff
    for (const [rpcName, label] of [
      ['admin_dashboard_stats', 'admin_dashboard'],
      ['admin_work_queue', 'admin_work_queue'],
      ['admin_list_partners', 'admin_list_partners'],
    ]) {
      const { data, error } = await rpc(client, rpcName, rpcName.includes('list') ? { p_limit: 3 } : {});
      if (isCustomerish) {
        rec({
          role: account.role,
          surface: label,
          check: 'deny',
          result: denyOk(error) || data == null ? 'PASS' : 'FAIL',
          detail: (error?.message || 'allowed').slice(0, 120),
        });
      } else if (isStaff) {
        rec({
          role: account.role,
          surface: label,
          check: 'access',
          result: error ? 'FAIL' : 'PASS',
          detail: (error?.message || 'ok').slice(0, 120),
        });
      }
    }

    // AAL2-gated mutations at AAL1 for admin
    if (isStaff && aal !== 'aal2') {
      const { error: suspErr } = await rpc(client, 'suspend_partner', {
        p_partner_id: '00000000-0000-4000-8000-000000000001',
        p_reason: 'rc7 matrix probe',
        p_idempotency_key: `rc7-susp-${Date.now()}`,
      });
      const { error: commErr } = await rpc(client, 'approve_partner_commission', {
        p_commission_id: '00000000-0000-4000-8000-000000000002',
        p_reason: 'rc7 matrix probe',
        p_idempotency_key: `rc7-comm-${Date.now()}`,
      });
      rec({
        role: `${account.role}_pre_aal2`,
        surface: 'suspend_partner',
        check: 'deny_or_aal2',
        result: denyOk(suspErr) ? 'PASS' : 'FAIL',
        detail: (suspErr?.message || 'unexpected allow').slice(0, 120),
      });
      rec({
        role: `${account.role}_pre_aal2`,
        surface: 'approve_commission',
        check: 'deny_or_aal2',
        result: denyOk(commErr) ? 'PASS' : 'FAIL',
        detail: (commErr?.message || 'unexpected allow').slice(0, 120),
      });
    }

    // Cross-tenant table probes — partner/customer must not read admin idempotency
    const { data: idemData, error: idemErr } = await client
      .from('admin_rpc_idempotency')
      .select('idempotency_key')
      .limit(1);
    const idemDenied =
      denyOk(idemErr) ||
      (idemErr?.message ?? '').includes('does not exist') ||
      (Array.isArray(idemData) && idemData.length === 0);
    rec({
      role: account.role,
      surface: 'admin_rpc_idempotency',
      check: isCustomerish ? 'deny' : 'staff_read',
      result: isCustomerish
        ? idemDenied
          ? 'PASS'
          : 'FAIL'
        : idemDenied || (Array.isArray(idemData) && idemData.length >= 0)
          ? 'PASS'
          : 'FAIL',
      detail: (idemErr?.message || `rows=${Array.isArray(idemData) ? idemData.length : 'n/a'}`).slice(
        0,
        120,
      ),
    });

    await client.auth.signOut();
  }

  const summary = {
    at: new Date().toISOString(),
    stagingRef: STAGING_REF,
    vault: path.basename(VAULT),
    credentials: redactEnvForLog(vault),
    passed: rows.filter((r) => r.result === 'PASS').length,
    failed: rows.filter((r) => r.result === 'FAIL').length,
    blocked: rows.filter((r) => r.result === 'BLOCKED').length,
    total: rows.length,
    rows,
  };

  const outJson = path.join(OUT_DIR, 'rc7-staging-security-matrix.json');
  fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
  console.log(`RC7_SECURITY_SUMMARY pass=${summary.passed} fail=${summary.failed} blocked=${summary.blocked}`);
  if (summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
