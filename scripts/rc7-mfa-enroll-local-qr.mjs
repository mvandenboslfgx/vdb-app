#!/usr/bin/env node
/**
 * Staging-only: enroll additional unverified TOTP for staff.aal2 without removing existing verified factor.
 * Writes local QR HTML + secrets to .vdb-vault only — never logs secrets.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseEnvFile } from './lib/load-env-file.mjs';

const STAGING_REF = 'kjricvicakvsreuytvra';
const VAULT_DIR = process.env.RC7_VAULT_DIR || 'C:/Users/XXX/.vdb-vault';
const VAULT = path.join(VAULT_DIR, 'rc7-staging-role-matrix.env');
const HTML = path.join(VAULT_DIR, 'rc7-staging-mfa-enroll-scan.html');
const MANIFEST = path.join(VAULT_DIR, 'rc7-staging-mfa-enroll.manifest.json');
const SECRETS = path.join(VAULT_DIR, 'rc7-staging-mfa-enroll.local.json');

const url = `https://${STAGING_REF}.supabase.co`;
const anon =
  process.env.RC7_STAGING_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

async function main() {
  if (!anon) throw new Error('missing anon key');
  const vault = parseEnvFile(VAULT);
  const email = vault.RC7_ADMIN_A_EMAIL;
  const password = vault.RC7_ADMIN_A_PASSWORD;
  if (!email || !password) throw new Error('missing admin vault creds');

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw new Error(signErr.message);

  const before =
    (await client.auth.mfa.listFactors()).data?.totp?.map((f) => ({
      id_prefix: f.id.slice(0, 8),
      status: f.status,
      friendly_name: f.friendly_name ?? null,
      type: f.factor_type ?? 'totp',
    })) ?? [];

  const { data: enroll, error: enrollErr } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'RC7 S25 Scan 2026-08-19',
  });
  if (enrollErr || !enroll?.id || !enroll.totp?.secret) {
    throw new Error(enrollErr?.message ?? 'enroll_failed');
  }

  const otpauth =
    enroll.totp.uri ?? enroll.totp.otpauth_url ?? enroll.totp.otpauthUrl ?? null;
  if (!otpauth) throw new Error('missing_otpauth_uri');

  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.writeFileSync(
    SECRETS,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        stagingRef: STAGING_REF,
        email,
        factor_id_prefix: enroll.id.slice(0, 8),
        factor_id: enroll.id,
        otpauth_uri: otpauth,
        status: 'unverified_pending_scan',
      },
      null,
      2,
    ),
    'utf8',
  );

  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>RC7 MFA Scan (local only)</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 2rem auto; padding: 1rem; }
    .box { border: 1px solid #ccc; border-radius: 12px; padding: 1rem; }
    canvas { display: block; margin: 1rem auto; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
</head>
<body>
  <h1>RC7 staging TOTP — scan locally</h1>
  <div class="box">
    <p><strong>Account:</strong> staff.aal2.rc7-staging@example.com</p>
    <p><strong>Staging ref:</strong> kjricvicakvsreuytvra</p>
    <p><strong>New factor prefix:</strong> ${enroll.id.slice(0, 8)} (unverified until verified)</p>
    <p><strong>Existing verified factor kept:</strong> c96a3b7a</p>
    <canvas id="q"></canvas>
    <p id="err" style="color:#b00"></p>
  </div>
  <p>Scan with your authenticator on the S25. Do not paste secrets into chat.</p>
  <script>
    const uri = ${JSON.stringify(otpauth)};
    QRCode.toCanvas(document.getElementById('q'), uri, { width: 280 }, function (err) {
      if (err) document.getElementById('err').textContent = 'QR render failed';
    });
  </script>
</body>
</html>`;
  fs.writeFileSync(HTML, html, 'utf8');

  fs.writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        stagingRef: STAGING_REF,
        email,
        existing_verified_factors: before,
        new_unverified_factor: {
          id_prefix: enroll.id.slice(0, 8),
          status: 'unverified',
          friendly_name: 'RC7 S25 Scan 2026-08-19',
          type: 'totp',
        },
        local_html: HTML,
        local_secrets_json: SECRETS,
      },
      null,
      2,
    ),
    'utf8',
  );

  await client.auth.signOut();

  console.log(
    JSON.stringify(
      {
        enrolled_new_factor_prefix: enroll.id.slice(0, 8),
        existing_verified_kept: before,
        local_html: HTML,
        manifest: MANIFEST,
      },
      null,
      2,
    ),
  );

  try {
    execFileSync('cmd', ['/c', 'start', '', HTML], { shell: false });
  } catch {
    // optional browser open
  }
}

main().catch((e) => {
  console.error(String(e.message ?? e).slice(0, 200));
  process.exit(1);
});
