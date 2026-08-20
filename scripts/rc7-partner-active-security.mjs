#!/usr/bin/env node
/**
 * RC7 ACTIVE partner cross-tenant security probes (staging only).
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

/** @type {{ probe: string; result: string; detail: string }[]} */
const rows = [];

function rec(probe, result, detail = '') {
  rows.push({ probe, result, detail: detail.slice(0, 160) });
  console.log(`${result.padEnd(7)} ${probe}`);
}

function denied(error, data) {
  if (error) {
    const m = `${error.message}`.toLowerCase();
    return (
      m.includes('permission') ||
      m.includes('denied') ||
      m.includes('forbidden') ||
      m.includes('42501') ||
      m.includes('not authorized')
    );
  }
  return Array.isArray(data) && data.length === 0;
}

async function main() {
  if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) throw new Error('wrong ref');
  if (!anon) throw new Error('missing anon');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const vault = parseEnvFile(VAULT);
  const email = vault.RC7_PARTNER_ACTIVE_EMAIL;
  const password = vault.RC7_PARTNER_ACTIVE_PASSWORD;
  const ownId = vault.RC7_PARTNER_ACTIVE_ID;
  if (!email || !password) throw new Error('missing active partner creds');

  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) {
    rec('partner_active_login', 'FAIL', signErr.message);
    process.exit(1);
  }
  rec('partner_active_login', 'PASS');

  const otherPartner = '00000000-0000-4000-8000-000000000099';

  for (const [table, col, val] of [
    ['partner_profiles', 'id', otherPartner],
    ['partner_leads', 'partner_id', otherPartner],
    ['partner_commissions', 'partner_id', otherPartner],
    ['partner_payout_requests', 'partner_id', otherPartner],
  ]) {
    const { data, error } = await client.from(table).select('id').eq(col, val).limit(1);
    rec(`cross_tenant_${table}`, denied(error, data) ? 'PASS' : 'FAIL', error?.message || `rows=${data?.length ?? 0}`);
  }

  for (const rpcName of [
    'admin_dashboard_stats',
    'admin_work_queue',
    'suspend_partner',
    'approve_partner_commission',
  ]) {
    const params =
      rpcName === 'admin_dashboard_stats' || rpcName === 'admin_work_queue'
        ? {}
        : rpcName === 'suspend_partner'
          ? {
              p_partner_id: otherPartner,
              p_reason: 'probe',
              p_idempotency_key: `p-${Date.now()}`,
            }
          : {
              p_commission_id: '00000000-0000-4000-8000-000000000002',
              p_reason: 'probe',
              p_idempotency_key: `p-${Date.now()}`,
            };
    const { data, error } = await client.rpc(rpcName, params);
    rec(`deny_${rpcName}`, denied(error, data) ? 'PASS' : 'FAIL', error?.message || 'unexpected allow');
  }

  const { data: ownProfile } = await client.from('partner_profiles').select('id,status').eq('id', ownId).maybeSingle();
  rec('own_profile_read', ownProfile?.status === 'ACTIVE' ? 'PASS' : 'FAIL', `status=${ownProfile?.status ?? 'missing'}`);

  await client.auth.signOut();

  const summary = {
    at: new Date().toISOString(),
    partnerIdPrefix: ownId?.slice(0, 8),
    credentials: redactEnvForLog({ email }),
    passed: rows.filter((r) => r.result === 'PASS').length,
    failed: rows.filter((r) => r.result === 'FAIL').length,
    rows,
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'rc7-partner-active-security.json'),
    JSON.stringify(summary, null, 2),
  );
  if (summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
