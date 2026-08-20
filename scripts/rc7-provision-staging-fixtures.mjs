#!/usr/bin/env node
/**
 * RC7 staging-only fixtures for Phone Phase (kjricvicakvsreuytvra).
 * Uses Supabase CLI service role (never logged) for staging mutations.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseEnvFile, redactEnvForLog } from './lib/load-env-file.mjs';

const STAGING_REF = 'kjricvicakvsreuytvra';
const PRODUCTION_REF = 'nhsrdnjfsxfikfbdmdfj';
const VAULT = process.env.RC7_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-role-matrix.env';
const MFA_VAULT =
  process.env.RC7_MFA_VAULT || 'C:/Users/XXX/.vdb-vault/rc7-staging-mfa-operator.env';
const OUT_DIR =
  process.env.RC7_EVIDENCE_DIR ||
  'C:/Users/XXX/vdb-full-staging-recovery-2026-07-29/samsung-s25-rc7-device-e2e';

const url = process.env.RC7_STAGING_URL || `https://${STAGING_REF}.supabase.co`;
const anon =
  process.env.RC7_STAGING_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

/** @type {{ step: string; result: string; detail?: string }[]} */
const log = [];

function note(step, result, detail = '') {
  log.push({ step, result, detail });
  console.log(`[${result}] ${step}${detail ? ` — ${detail}` : ''}`);
}

function decodeBase32(secretBase32) {
  const cleaned = secretBase32.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of cleaned) {
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error('invalid_base32');
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateTotpCode(secretBase32, nowMs = Date.now()) {
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(nowMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

function fetchServiceRoleKey() {
  const raw = execFileSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', STAGING_REF, '-o', 'json'],
    { encoding: 'utf8', shell: true },
  );
  const keys = JSON.parse(raw);
  const row = keys.find(
    (k) =>
      String(k.name ?? '').toLowerCase().includes('service') ||
      String(k.description ?? '').toLowerCase().includes('service'),
  );
  if (!row?.api_key) throw new Error('service_role_key_unavailable');
  return row.api_key;
}

async function ensureVerifiedTotp(email, password) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(`admin_login:${signErr.message}`);

  const { data: factors } = await client.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).find((f) => f.status === 'verified');
  if (verified) {
    note('mfa_enroll', 'SKIP', `verified_factor_prefix=${verified.id.slice(0, 8)}`);
    await client.auth.signOut();
    return { factorId: verified.id, secretBase32: null, alreadyVerified: true };
  }

  const { data: enroll, error: enrollErr } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'RC7 Phone Phase',
  });
  if (enrollErr || !enroll?.id || !enroll.totp?.secret) {
    throw new Error(`enroll:${enrollErr?.message ?? 'bad_shape'}`);
  }

  const { data: challenge, error: chErr } = await client.auth.mfa.challenge({
    factorId: enroll.id,
  });
  if (chErr || !challenge) throw new Error(`challenge:${chErr?.message ?? 'missing'}`);

  const code = generateTotpCode(enroll.totp.secret);
  const { error: verErr } = await client.auth.mfa.verify({
    factorId: enroll.id,
    challengeId: challenge.id,
    code,
  });
  if (verErr) throw new Error(`verify:${verErr.message}`);

  await client.auth.signOut();
  note('mfa_enroll', 'PASS', `factor_prefix=${enroll.id.slice(0, 8)}`);
  return { factorId: enroll.id, secretBase32: enroll.totp.secret, alreadyVerified: false };
}

async function prepareActivePartner(serviceKey, adminEmail, adminPassword, mfaVault) {
  const partnerBEmail = 'partner.b.zakelijk.rc7-staging@example.com';
  const svc = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: true },
  });

  const { data: users } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const partnerUser = users?.users?.find((u) => u.email === partnerBEmail);
  if (!partnerUser) throw new Error('partner_b_user_missing');

  const newPassword = `Rc7${crypto.randomBytes(20).toString('hex')}`;
  const { error: pwErr } = await svc.auth.admin.updateUserById(partnerUser.id, {
    password: newPassword,
    email_confirm: true,
  });
  if (pwErr) throw new Error(`partner_b_password:${pwErr.message}`);

  const { data: profile, error: pErr } = await svc
    .from('partner_profiles')
    .select('id,status,user_id')
    .eq('user_id', partnerUser.id)
    .single();
  if (pErr || !profile) throw new Error(`partner_b_profile:${pErr?.message ?? 'missing'}`);

  if (profile.status !== 'ACTIVE') {
    const agreement = await svc
      .from('partner_agreement_versions')
      .select('id,agreement_type')
      .eq('is_current', true)
      .eq('agreement_type', 'BUSINESS_PARTNER')
      .maybeSingle();

    await svc.from('partner_applications').upsert(
      {
        user_id: partnerUser.id,
        status: 'APPROVED',
        partner_type: 'BUSINESS',
        legal_name: 'RC7-STAGING Legal BV',
        kvk_number: '12345678',
        staff_approved_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    await svc
      .from('partner_profiles')
      .update({
        partner_type: 'BUSINESS',
        type_classification_status: 'KNOWN',
        age_verification_status: 'VERIFIED',
        age_verified_at: new Date().toISOString(),
        identity_verification_status: 'VERIFIED',
        identity_verified_at: new Date().toISOString(),
        business_verification_status: 'VERIFIED',
        business_verified_at: new Date().toISOString(),
        staff_approved_at: new Date().toISOString(),
        payout_profile_status: 'APPROVED',
        legal_name: 'RC7-STAGING Legal BV',
      })
      .eq('id', profile.id);

    if (agreement.data?.id) {
      await svc.from('partner_agreement_acceptances').upsert(
        {
          partner_id: profile.id,
          agreement_version_id: agreement.data.id,
          accepted_at: new Date().toISOString(),
        },
        { onConflict: 'partner_id,agreement_version_id' },
      );
    }

    const admin = createClient(url, anon, { auth: { persistSession: false } });
    await admin.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    const factorId = mfaVault.RC7_MFA_FACTOR_ID;
    const ch = await admin.auth.mfa.challenge({ factorId });
    await admin.auth.mfa.verify({
      factorId,
      challengeId: ch.data.id,
      code: generateTotpCode(mfaVault.RC7_MFA_TOTP_SECRET),
    });
    const act = await admin.rpc('activate_partner_profile', {
      p_partner_id: profile.id,
      p_reason: 'RC7 phone phase ACTIVE partner fixture',
      p_idempotency_key: `rc7-active-${profile.id.slice(0, 8)}-${Date.now()}`,
      p_partner_code: null,
    });
    if (act.error) throw new Error(`activate:${act.error.message}`);
    await admin.auth.signOut();
    note('partner_b_activate', 'PASS', `id_prefix=${profile.id.slice(0, 8)}`);
  } else {
    note('partner_b_activate', 'SKIP', 'already ACTIVE');
  }

  note('partner_b_login', 'PASS', 'password rotated into vault');
  return { email: partnerBEmail, password: newPassword, partnerId: profile.id };
}

async function ensureAal2ApprovalQueue(svc, vault) {
  const partnerEmail = vault.RC7_PARTNER_A_EMAIL;
  if (!partnerEmail) {
    note('aal2_approval_seed', 'BLOCKED', 'missing RC7_PARTNER_A_EMAIL');
    return;
  }
  const { data: users } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 });
  const partnerUser = users?.users?.find((u) => u.email === partnerEmail);
  if (!partnerUser) {
    note('aal2_approval_seed', 'FAIL', 'partner_a user missing');
    return;
  }
  const { data: existing, error: readErr } = await svc
    .from('partner_applications')
    .select('id')
    .eq('user_id', partnerUser.id)
    .maybeSingle();
  if (readErr) {
    note('aal2_approval_seed', 'FAIL', readErr.message);
    return;
  }
  const payload = {
    user_id: partnerUser.id,
    status: 'SUBMITTED',
    partner_type: 'BUSINESS',
    legal_name: 'RC7 Phone Phase AAL2 Queue',
    kvk_number: '99887766',
    submitted_at: new Date().toISOString(),
  };
  const { error } = existing?.id
    ? await svc.from('partner_applications').update(payload).eq('id', existing.id)
    : await svc.from('partner_applications').insert(payload);
  note('aal2_approval_seed', error ? 'FAIL' : 'PASS', error?.message ?? 'SUBMITTED application ready');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!url.includes(STAGING_REF) || url.includes(PRODUCTION_REF)) {
    throw new Error('ABORT: wrong staging ref');
  }
  if (!anon) throw new Error('ABORT: missing anon key');

  const vault = parseEnvFile(VAULT);
  const adminEmail = vault.RC7_ADMIN_A_EMAIL;
  const adminPassword = vault.RC7_ADMIN_A_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('missing admin vault creds');

  const totp = await ensureVerifiedTotp(adminEmail, adminPassword);
  let mfaVault = parseEnvFile(MFA_VAULT);
  if (totp.secretBase32) {
    const body = [
      '# RC7 staging MFA operator — local secret, DO NOT COMMIT',
      `# Staging ref: ${STAGING_REF}`,
      `# Generated: ${new Date().toISOString()}`,
      `RC7_MFA_OPERATOR_EMAIL=${adminEmail}`,
      `RC7_MFA_OPERATOR_PASSWORD=${adminPassword}`,
      `RC7_MFA_FACTOR_ID=${totp.factorId}`,
      `RC7_MFA_FACTOR_ID_PREFIX=${totp.factorId.slice(0, 8)}`,
      `RC7_MFA_TOTP_SECRET=${totp.secretBase32}`,
      '',
    ].join('\n');
    fs.writeFileSync(MFA_VAULT, body, 'utf8');
    mfaVault = parseEnvFile(MFA_VAULT);
    note('mfa_vault_write', 'PASS', path.basename(MFA_VAULT));
  }

  const serviceKey = fetchServiceRoleKey();
  await ensureAal2ApprovalQueue(createClient(url, serviceKey, { auth: { persistSession: false } }), vault);
  const partner = await prepareActivePartner(serviceKey, adminEmail, adminPassword, mfaVault);

  const lines = fs.existsSync(VAULT) ? fs.readFileSync(VAULT, 'utf8').split(/\r?\n/) : [];
  const filtered = lines.filter(
    (l) =>
      !l.startsWith('RC7_PARTNER_B_') &&
      !l.startsWith('RC7_PARTNER_ACTIVE_') &&
      !l.startsWith('RC7_PARTNER_ACTIVE_ID'),
  );
  filtered.push(
    `RC7_PARTNER_B_EMAIL=${partner.email}`,
    `RC7_PARTNER_B_PASSWORD=${partner.password}`,
    `RC7_PARTNER_ACTIVE_EMAIL=${partner.email}`,
    `RC7_PARTNER_ACTIVE_PASSWORD=${partner.password}`,
    `RC7_PARTNER_ACTIVE_ID=${partner.partnerId}`,
  );
  fs.writeFileSync(VAULT, `${filtered.filter(Boolean).join('\n')}\n`, 'utf8');
  note('vault_partner_active', 'PASS', 'RC7_PARTNER_ACTIVE_* updated');

  const summary = {
    at: new Date().toISOString(),
    stagingRef: STAGING_REF,
    vault: redactEnvForLog(parseEnvFile(VAULT)),
    steps: log,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'rc7-staging-fixtures.json'), JSON.stringify(summary, null, 2));
  const failed = log.filter((x) => x.result === 'FAIL' || x.result === 'BLOCKED');
  if (failed.length) process.exit(2);
}

main().catch((e) => {
  console.error(String(e.message ?? e).slice(0, 300));
  process.exit(1);
});
