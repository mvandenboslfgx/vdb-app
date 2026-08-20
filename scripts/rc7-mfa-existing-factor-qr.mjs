#!/usr/bin/env node
/**
 * Local QR for the EXISTING verified factor (c96a3b7a) — no server enrollment change.
 * Secrets stay in .vdb-vault only.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseEnvFile } from './lib/load-env-file.mjs';

const VAULT_DIR = process.env.RC7_VAULT_DIR || 'C:/Users/XXX/.vdb-vault';
const MFA_VAULT = path.join(VAULT_DIR, 'rc7-staging-mfa-operator.env');
const HTML = path.join(VAULT_DIR, 'rc7-staging-mfa-existing-factor-scan.html');

function buildOtpAuth(email, secret) {
  const label = encodeURIComponent(`Supabase:${email}`);
  const issuer = encodeURIComponent('Supabase');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

async function main() {
  const mfa = parseEnvFile(MFA_VAULT);
  const email = mfa.RC7_MFA_OPERATOR_EMAIL;
  const secret = mfa.RC7_MFA_TOTP_SECRET;
  const factorPrefix = mfa.RC7_MFA_FACTOR_ID_PREFIX ?? mfa.RC7_MFA_FACTOR_ID?.slice(0, 8);
  if (!email || !secret) throw new Error('missing mfa vault fields');

  const otpauth = buildOtpAuth(email, secret);
  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <title>RC7 existing MFA factor (local only)</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 2rem auto; padding: 1rem; }
    .box { border: 1px solid #ccc; border-radius: 12px; padding: 1rem; }
    canvas { display: block; margin: 1rem auto; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
</head>
<body>
  <h1>RC7 existing verified TOTP</h1>
  <div class="box">
    <p><strong>Account:</strong> staff.aal2.rc7-staging@example.com</p>
    <p><strong>Verified factor prefix:</strong> ${factorPrefix}</p>
    <p><strong>Server friendly_name:</strong> RC7 Phone Phase</p>
    <p>Use this if your authenticator entry must match the factor the mobile app challenges.</p>
    <canvas id="q"></canvas>
    <p id="err" style="color:#b00"></p>
  </div>
  <script>
    const uri = ${JSON.stringify(otpauth)};
    QRCode.toCanvas(document.getElementById('q'), uri, { width: 280 }, function (err) {
      if (err) document.getElementById('err').textContent = 'QR render failed';
    });
  </script>
</body>
</html>`;
  fs.writeFileSync(HTML, html, 'utf8');
  console.log(JSON.stringify({ local_html: HTML, factor_prefix: factorPrefix }, null, 2));
  try {
    execFileSync('cmd', ['/c', 'start', '', HTML], { shell: false });
  } catch {
    // optional
  }
}

main().catch((e) => {
  console.error(String(e.message ?? e).slice(0, 200));
  process.exit(1);
});
