#!/usr/bin/env node
/**
 * RC7 AAL2 API matrix — pre/post step-up with local TOTP (never logged).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseEnvFile, redactEnvForLog } from './lib/load-env-file.mjs';
import { freshTotpCode, loadMfaVault } from './lib/totp.mjs';

const STAGING_REF = 'kjricvicakvsreuytvra';
const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const VAULT = process.env.RC7_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';
const MFA_VAULT =
  process.env.RC7_MFA_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-mfa-operator.env';
const OUT_DIR =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';

const url = process.env.RC7_STAGING_URL || `https://${STAGING_REF}.supabase.co`;
const anon = process.env.RC7_STAGING_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

/** @type {{ check: string; result: string; detail: string }[]} */
const rows = [];

function rec(check, result, detail = '') {
  rows.push({ check, result, detail: detail.slice(0, 160) });
  console.log(`${result.padEnd(7)} ${check}${detail ? ` — ${detail.slice(0, 80)}` : ''}`);
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

async function main() {
  if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) {
    throw new Error('ABORT: wrong staging ref');
  }
  if (!anon) throw new Error('ABORT: missing anon key');

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const vault = parseEnvFile(VAULT);
  const mfa = loadMfaVault(MFA_VAULT);
  const adminEmail = vault.RC7_ADMIN_A_EMAIL;
  const adminPassword = vault.RC7_ADMIN_A_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('missing admin creds');

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signIn, error: signErr } = await client.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (signErr || !signIn.session) {
    rec('admin_login', 'FAIL', signErr?.message || 'no session');
    process.exit(1);
  }
  rec('admin_login_aal1', 'PASS', `aal=${aalFromSession(signIn.session)}`);

  const fakePartner = '00000000-0000-4000-8000-000000000001';
  const { error: preSusp } = await client.rpc('suspend_partner', {
    p_partner_id: fakePartner,
    p_reason: 'rc7 aal2 pre probe',
    p_idempotency_key: `rc7-pre-susp-${Date.now()}`,
  });
  rec('pre_aal2_suspend_partner', denyOk(preSusp) ? 'PASS' : 'FAIL', preSusp?.message || 'allowed');

  const { error: preComm } = await client.rpc('approve_partner_commission', {
    p_commission_id: '00000000-0000-4000-8000-000000000002',
    p_reason: 'rc7 aal2 pre probe',
    p_idempotency_key: `rc7-pre-comm-${Date.now()}`,
  });
  rec('pre_aal2_approve_commission', denyOk(preComm) ? 'PASS' : 'FAIL', preComm?.message || 'allowed');

  const factors = await client.auth.mfa.listFactors();
  const verified = (factors.data?.totp ?? []).filter((f) => f.status === 'verified');
  if (verified.length === 0) {
    rec('mfa_factor', 'FAIL', 'no verified totp');
    process.exit(1);
  }
  const factor = verified.find((f) => f.id.startsWith(mfa.factorPrefix ?? '')) ?? verified[0];
  rec('mfa_factor_match', 'PASS', `prefix=${factor.id.slice(0, 8)}`);

  const ch = await client.auth.mfa.challenge({ factorId: factor.id });
  if (ch.error || !ch.data?.id) {
    rec('mfa_challenge', 'FAIL', ch.error?.message || 'no challenge');
    process.exit(1);
  }

  const code = await freshTotpCode(mfa.secret);
  const ver = await client.auth.mfa.verify({
    factorId: factor.id,
    challengeId: ch.data.id,
    code,
  });
  if (ver.error) {
    const code2 = await freshTotpCode(mfa.secret, { maxAttempts: 3 });
    const retry = await client.auth.mfa.challenge({ factorId: factor.id });
    const ver2 = await client.auth.mfa.verify({
      factorId: factor.id,
      challengeId: retry.data.id,
      code: code2,
    });
    if (ver2.error) {
      rec('mfa_verify', 'FAIL', ver2.error.message);
      process.exit(1);
    }
  }
  rec('mfa_verify', 'PASS', 'local totp ok');

  const { data: refreshed } = await client.auth.getSession();
  const postAal = refreshed.session ? aalFromSession(refreshed.session) : 'unknown';
  rec('post_aal2_session', postAal === 'aal2' ? 'PASS' : 'FAIL', `aal=${postAal}`);

  const { error: postSusp } = await client.rpc('suspend_partner', {
    p_partner_id: fakePartner,
    p_reason: 'rc7 aal2 post probe',
    p_idempotency_key: `rc7-post-susp-${Date.now()}`,
  });
  rec(
    'post_aal2_suspend_fake',
    postSusp ? 'PASS' : 'FAIL',
    (postSusp?.message || 'rpc reached (expected deny on fake id)').slice(0, 80),
  );

  const { error: postComm } = await client.rpc('approve_partner_commission', {
    p_commission_id: '00000000-0000-4000-8000-000000000002',
    p_reason: 'rc7 aal2 post probe',
    p_idempotency_key: `rc7-post-comm-${Date.now()}`,
  });
  rec(
    'post_aal2_commission_fake',
    postComm ? 'PASS' : 'FAIL',
    (postComm?.message || 'rpc reached').slice(0, 80),
  );

  await client.auth.signOut();

  const summary = {
    at: new Date().toISOString(),
    stagingRef: STAGING_REF,
    factorPrefix: mfa.factorPrefix,
    credentials: redactEnvForLog({ email: adminEmail }),
    passed: rows.filter((r) => r.result === 'PASS').length,
    failed: rows.filter((r) => r.result === 'FAIL').length,
    rows,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'rc7-aal2-api-matrix.json'), JSON.stringify(summary, null, 2));
  if (summary.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
